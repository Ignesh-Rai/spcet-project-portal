# Black Diary - Project Portal Updation Note

## July/Aug - Discussion 1 - Topic Selection
**Status**: Completed

### Scopes
The project aims to develop a centralized "Project Portal" for the institution (SPCET) to streamline the process of student project submissions, faculty reviews, and approvals.
*   **Target Audience**: Students, Faculty Guides, Heads of Departments (HoD), and Administrators.
*   **Key Features**: Digital project submission, real-time status tracking, role-based dashboards, and a public repository (Explorer) for past projects.

### Rejected Topics
1.  **Smart Attendance System via Face Recognition**
    *   *Reason for Rejection*: Requirement of expensive hardware (high-res IP cameras) and potential privacy compliance issues were deemed out of scope for the current timeline.
2.  **Canteen Automation System**
    *   *Reason for Rejection*: While useful, the scope was considered too limited in terms of "Academic Technical Complexity". It is largely a standard e-commerce flow without significant research or algorithmic challenges.
3.  **Library Management System**
    *   *Reason for Rejection*: Existing legacy software is already in place. Migrating data and retraining staff would consume more time than development itself.

### Why Selected: "Project Portal"
*   **Problem Identification**: Currently, the project approval process is manual, involving physical files, repeated signatures, and lack of transparency. Students often lose track of feedback, and distinct departments (CSE, ECE, Mek) lack a unified view of ongoing innovation.
*   **Impact**: A digital portal ensures data persistence, easy retrieval of past work (preventing duplication), and streamlined communication between guides and students.
*   **Feasibility**: Matches the team's expertise in Full-Stack Web Development (MERN/Next.js).

---

## Aug - Discussion 2 - Literature Review
**Status**: Completed

### Reference Books
1.  **"Software Engineering" by Ian Sommerville**
    *   *Focus*: Agile software development lifecycles and iterative requirements gathering.
2.  **"Designing Web Interfaces" by Bill Scott & Theresa Neil**
    *   *Focus*: Principles of rich web interactions and dashboard design.

### Research Papers & Articles
1.  **"E-Governance in Educational Institutions" (IEEE Xplore)**
    *   *Key Takeaway*: Transitions from paper-based to digital workflows reduce administrative error rates by 40%.
2.  **"Role-Based Access Control (RBAC) in Academic Systems"**
    *   *Key Takeaway*: Implementing strict hierarchy (Admin > HoD > Faculty > Student) is crucial for data integrity.
3.  **"Modern Web Architectures with Serverless Computing"**
    *   *Key Takeaway*: Benefits of using Backend-as-a-Service (BaaS) like Firebase for scalable, real-time data handling without heavy server maintenance.

---

## Sep - Discussion 3, 4 - Review & Project Approval
**Status**: Approved

### Project Structure
The system is designed as a **Monorepo** web application containing distinct modules for each user role:
*   **Student Module**: For proposing topics, submitting documentation, and viewing status.
*   **Faculty Module**: For reviewing assigned student proposals and giving feedback.
*   **HoD Module**: For final approval of projects and department-wide analytics.
*   **Admin Module**: For user management, role assignment, and creating new academic sessions.

### Timeline
*   **Phase 1 (Planning)**: July - Aug
*   **Phase 2 (Design)**: Sept - Oct
*   **Phase 3 (Development)**: Nov - Jan
*   **Phase 4 (Testing & Deployment)**: Feb

### Methodology
*   **Agile Methodology**: We will follow 2-week sprints.
*   **Iterative Development**: Continuous feedback loops with the guide after every module completion.

---

## Oct - Discussion 5, 6 - Methodology & Design
**Status**: Completed

### Technical Discussion
*   **Architecture**: Serverless Architecture using Next.js (Frontend + API).
*   **Algorithm**:
    *   *Approval Workflow Algorithm*: A Finite State Machine (FSM) tracking states: `Draft` -> `Pending Review` -> `Changes Requested` <-> `Resubmitted` -> `Approved` -> `Published`.
    *   *Search Algorithm*: Inverted index search for querying projects by technology (e.g., "AI", "Blockchain") in the Explorer.

### Tech Stacks
*   **Frontend**: Next.js 15 (React Framework), Tailwind CSS (Styling), Framer Motion (Animations).
*   **Backend**: Next.js API Routes (Server Actions).
*   **Database**: Firebase Firestore (NoSQL) for flexible project schemas.
*   **Authentication**: Firebase Auth (Secure email/password and role persistence).
*   **Hosting**: Vercel (CI/CD Integration).

---

## Nov, Dec, Jan - Discussion 7, 8, 9, 10 - Development Phase & Reviews
**Status**: In Progress

### Development Phases (15 Days / Sprint)

#### **Nov 1 - Nov 15: Sprint 1 (Foundation)**
*   **Module**: **Authentication & Roles**
*   **Accomplishments**: 
    - Set up Next.js project structure with TypeScript.
    - Integrated Firebase Authentication.
    - Created `Admin` middleware to secure routes.
    - Developed Login page with dynamic role detection.

#### **Nov 16 - Nov 30: Sprint 2 (Core UI)**
*   **Module**: **Dashboards & Navigation**
*   **Accomplishments**: 
    - Designed responsive Layouts for Admin, HoD, and Faculty.
    - Implemented Sidebar navigation with active state highlighting.
    - Created "User Management" modal for Admins to create Faculty/HoD accounts.
    - *Review*: Guide suggested improving mobile responsiveness for the sidebar.

#### **Dec 1 - Dec 15: Sprint 3 (Data Flow)**
*   **Module**: **Project Submission Engine**
*   **Accomplishments**: 
    - Developed the multi-step form for students to submit project details (Title, Abstract, Tech Stack).
    - Integrated File Upload for project documentation (PDFs).
    - Implemented database schema enforcement for "Projects".
    - *Review*: Discussed handling large file sizes; implemented client-side validation limits.

#### **Dec 16 - Dec 31: Sprint 4 (Logic Layer)**
*   **Module**: **Review & Feedback System**
*   **Accomplishments**: 
    - Built the "Faculty Review Interface" to comment on submissions.
    - Implemented "Approve" and "Reject" logic loops.
    - Notifications system (UI only) for status updates.
    - *Review*: Added a requirement to prevent project title duplication across departments.

#### **Jan 1 - Jan 15: Sprint 5 (Public Facing)**
*   **Module**: **Explorer & Analytics**
*   **Accomplishments**: 
    - Built the `Explorer` page for public viewing of "Approved" projects.
    - Added filtering by Department (CSE, ECE) and Project Type (Product, Research).
    - Implemented "HoD Analytics" to show graphs of Approved vs. Rejected projects.

#### **Jan 16 - Jan 30: Sprint 6 (Polish)**
*   **Module**: **Seed Data & UX Refinement**
*   **Accomplishments**: 
    - "Seeded" database with 20+ dummy projects for demonstration.
    - Refined UI animations using Framer Motion (page transitions).
    - Final security audit (checking RLS equivalent rules in Firebase).
    - *Final Review*: Ready for pre-submission demonstration.
