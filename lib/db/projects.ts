// lib/db/projects.ts
// Firestore + Storage helpers for "projects".
// Drop this file into lib/db/projects.ts and restart the dev/TS server.

import { db, storage } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  DocumentData,
  QueryDocumentSnapshot,
  QuerySnapshot,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

/* ----------------------
   Storage uploader
   ---------------------- */
export async function uploadThumbnail(file: File, pathPrefix = "thumbnails") {
  if (!storage) throw new Error("Storage not initialized");
  const filename = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  const storageRef = ref(storage, `${pathPrefix}/${filename}`);

  return new Promise<string>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      "state_changed",
      () => { },
      (err) => reject(err),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

/* ----------------------
   Create / Update / Delete
   ---------------------- */
/**
 * createProject(payload, options)
 * - payload: fields (title, abstract, technologies[], students[], etc)
 * - options: { asDraft?: boolean, thumbnailFile?: File | null, facultyId?: string }
 * Returns created doc id
 */
export async function createProject(
  payload: Record<string, any>,
  options?: { asDraft?: boolean; thumbnailFile?: File | null; facultyId?: string }
) {
  if (!db) throw new Error("Firestore not initialized");
  const { asDraft = false, thumbnailFile = null, facultyId = null } = options || {};

  let thumbnailUrl: string | null = null;
  if (thumbnailFile) {
    thumbnailUrl = await uploadThumbnail(thumbnailFile);
  }

  const docData = {
    ...payload,
    technologies: Array.isArray(payload.technologies)
      ? payload.technologies
      : typeof payload.technologies === "string"
        ? payload.technologies.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [],
    students: Array.isArray(payload.students) ? payload.students : [],
    facultyId: facultyId ?? payload.facultyId ?? null,
    visibility: asDraft ? "draft" : "pending",
    hallOfFame: !!payload.hallOfFame || false,
    thumbnailUrl: thumbnailUrl ?? payload.thumbnailUrl ?? null,
    verified: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const col = collection(db, "projects");
  const ref = await addDoc(col, docData);
  return ref.id;
}

/**
 * updateProject(projectId, updates, options)
 * - options.thumbnailFile uploads and updates thumbnailUrl
 */
export async function updateProject(
  projectId: string,
  updates: Record<string, any>,
  options?: { thumbnailFile?: File | null }
) {
  if (!db) throw new Error("Firestore not initialized");
  const docRef = doc(db, "projects", projectId);

  if (options?.thumbnailFile) {
    const url = await uploadThumbnail(options.thumbnailFile);
    updates.thumbnailUrl = url;
  }
  updates.updatedAt = serverTimestamp();
  await updateDoc(docRef, updates);
  return true;
}

/**
 * deleteProject(projectId)
 */
export async function deleteProject(projectId: string) {
  if (!db) throw new Error("Firestore not initialized");
  const docRef = doc(db, "projects", projectId);
  await deleteDoc(docRef);
  return true;
}

/* ----------------------
   Read helpers (paging, realtime)
   ---------------------- */

/**
 * fetchPublicProjects(pageSize = 12, tech?)
 * one-off fetch (uses array-contains if tech provided)
 */
export async function fetchPublicProjects(pageSize = 12, tech?: string) {
  if (!db) throw new Error("Firestore not initialized");

  let q = query(
    collection(db, "projects"),
    where("visibility", "==", "public"),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );

  if (tech && tech.trim()) {
    q = query(
      collection(db, "projects"),
      where("visibility", "==", "public"),
      where("technologies", "array-contains", tech.trim()),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );
  }

  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const lastDoc = snap.docs[snap.docs.length - 1] || null;
  return { items, lastDoc };
}

/**
 * fetchMoreProjects(lastDoc, pageSize=12, tech?)
 */
export async function fetchMoreProjects(
  lastDoc: QueryDocumentSnapshot<DocumentData> | null,
  pageSize = 12,
  tech?: string
) {
  if (!db) throw new Error("Firestore not initialized");
  if (!lastDoc) return { items: [], lastDoc: null };

  let q = query(
    collection(db, "projects"),
    where("visibility", "==", "public"),
    orderBy("createdAt", "desc"),
    startAfter(lastDoc),
    limit(pageSize)
  );

  if (tech && tech.trim()) {
    q = query(
      collection(db, "projects"),
      where("visibility", "==", "public"),
      where("technologies", "array-contains", tech.trim()),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(pageSize)
    );
  }

  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const newLast = snap.docs[snap.docs.length - 1] || null;
  return { items, lastDoc: newLast };
}

/**
 * subscribeToPublicProjects(onUpdate(items, lastDoc), pageSize, tech)
 * returns unsubscribe function
 */
export function subscribeToPublicProjects(
  onUpdate: (items: any[], lastDoc: QueryDocumentSnapshot<DocumentData> | null) => void,
  pageSize = 12,
  tech?: string
) {
  if (!db) throw new Error("Firestore not initialized");

  let q = query(
    collection(db, "projects"),
    where("visibility", "==", "public"),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );

  if (tech && tech.trim()) {
    q = query(
      collection(db, "projects"),
      where("visibility", "==", "public"),
      where("technologies", "array-contains", tech.trim()),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );
  }

  const unsub = onSnapshot(
    q,
    (snap: QuerySnapshot<DocumentData>) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const last = snap.docs[snap.docs.length - 1] || null;
      onUpdate(items, last);
    },
    (err) => {
      console.error("subscribeToPublicProjects snapshot error:", err);
      onUpdate([], null);
    }
  );

  return unsub;
}

/* ----------------------
   Faculty drafts helpers
   ---------------------- */

/**
 * fetchFacultyDrafts (one-off)
 */
export async function fetchFacultyDrafts(facultyId: string, pageSize = 50) {
  if (!db) throw new Error("Firestore not initialized");
  const q = query(
    collection(db, "projects"),
    where("facultyId", "==", facultyId),
    where("visibility", "==", "draft"),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { items };
}

/**
 * subscribeToFacultyDrafts(onUpdate)
 */
export function subscribeToFacultyDrafts(
  facultyId: string,
  onUpdate: (items: any[]) => void,
  pageSize = 50
) {
  if (!db) throw new Error("Firestore not initialized");
  const q = query(
    collection(db, "projects"),
    where("facultyId", "==", facultyId),
    where("visibility", "==", "draft"),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );

  const unsub = onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onUpdate(items);
  }, (err) => {
    console.error("subscribeToFacultyDrafts error:", err);
    onUpdate([]);
  });

  return unsub;
}

/* ----------------------
   Faculty Drafts – Realtime Listener (Dashboard)
   ---------------------- */

/**
 * listenToFacultyDrafts
 * Realtime listener for Draft projects of a faculty
 */
export function listenToFacultyDrafts(
  facultyId: string,
  onUpdate: (items: any[]) => void,
  pageSize = 50
) {
  if (!db) throw new Error("Firestore not initialized");

  const q = query(
    collection(db, "projects"),
    where("facultyId", "==", facultyId),
    where("visibility", "==", "draft"),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const drafts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      onUpdate(drafts);
    },
    (error) => {
      console.error("listenToFacultyDrafts error:", error);
      onUpdate([]);
    }
  );

  return unsubscribe;
}
/* ----------------------
   Screenshot Uploads
   ---------------------- */

const MAX_IMAGE_SIZE = 500 * 1024; // 500 KB
const MAX_SCREENSHOTS = 5;

export async function uploadScreenshots(
  projectId: string,
  files: File[]
): Promise<string[]> {
  if (!storage) throw new Error("Storage not initialized");

  if (files.length > MAX_SCREENSHOTS) {
    throw new Error(`Maximum ${MAX_SCREENSHOTS} screenshots allowed`);
  }

  const uploadPromises = files.map((file, index) => {
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are allowed");
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error("Each image must be less than 500 KB");
    }

    const filename = `${Date.now()}_${index}_${file.name}`;
    const storageRef = ref(storage, `screenshots/${projectId}/${filename}`);

    return new Promise<string>((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file);

      task.on(
        "state_changed",
        () => { },
        (err) => reject(err),
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve(url);
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  });

  return Promise.all(uploadPromises);
}

/* ----------------------
   Project Report Upload (PDF)
   ---------------------- */

const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5 MB

export async function uploadProjectReport(
  projectId: string,
  file: File
): Promise<string> {
  if (!storage) throw new Error("Storage not initialized");

  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are allowed");
  }

  if (file.size > MAX_PDF_SIZE) {
    throw new Error("PDF must be less than 5 MB");
  }

  const storageRef = ref(storage, `reports/${projectId}/project-report.pdf`);

  return new Promise<string>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      "state_changed",
      () => { },
      (err) => reject(err),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

/* ----------------------
   Hall of Fame Listener
   ---------------------- */
export function subscribeToHallOfFameProjects(
  onUpdate: (items: any[]) => void
) {
  if (!db) throw new Error("Firestore not initialized");

  const q = query(
    collection(db, "projects"),
    where("hallOfFame", "==", true),
    orderBy("createdAt", "desc"),
    limit(10)
  );

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onUpdate(items);
    },
    (err) => {
      console.error("subscribeToHallOfFameProjects error:", err);
      // Fail gracefully
      onUpdate([]);
    }
  );
}
