/**
 * Cloudinary Upload Helper
 * 
 * Upload files (images/PDFs) to Cloudinary
 * Returns the secure URL of the uploaded file
 */

export async function uploadToCloudinary(
    file: File,
    folder: string = "project-portal",
    resourceType: string = "auto"
): Promise<string> {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

    if (!cloudName || !uploadPreset) {
        throw new Error("Cloudinary credentials not configured. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to .env.local")
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", uploadPreset)
    formData.append("folder", folder)
    formData.append("resource_type", resourceType)

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
            {
                method: "POST",
                body: formData,
            }
        )

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Upload failed: ${errorData.error?.message || response.statusText}`)
        }

        const data = await response.json()
        return data.secure_url
    } catch (error) {
        console.error("Cloudinary upload error:", error)
        throw error
    }
}

/**
 * Upload multiple screenshots to Cloudinary
 */
export async function uploadScreenshots(
    files: File[],
    projectId: string
): Promise<string[]> {
    const MAX_SCREENSHOTS = 5
    const MAX_SIZE = 500 * 1024 // 500KB

    if (files.length > MAX_SCREENSHOTS) {
        throw new Error(`Maximum ${MAX_SCREENSHOTS} screenshots allowed`)
    }

    // Validate all files first
    for (const file of files) {
        if (!file.type.startsWith("image/")) {
            throw new Error(`File ${file.name} is not an image`)
        }
        if (file.size > MAX_SIZE) {
            throw new Error(`Image ${file.name} exceeds 500KB limit`)
        }
    }

    // Upload all files concurrently
    const uploadPromises = files.map((file, index) =>
        uploadToCloudinary(file, `project-portal/${projectId}/screenshots`)
    )

    return Promise.all(uploadPromises)
}

/**
 * Upload project report PDF to Cloudinary
 */
export async function uploadProjectReport(
    file: File,
    projectId: string
): Promise<string> {
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB

    if (file.type !== "application/pdf") {
        throw new Error("Report must be a PDF file")
    }

    if (file.size > MAX_SIZE) {
        throw new Error("PDF file exceeds 5MB limit")
    }

    return uploadToCloudinary(file, `project-portal/${projectId}`, "raw")
}
