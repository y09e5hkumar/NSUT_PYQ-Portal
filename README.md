# 📄 NSUT PYQ Hub (PYQ Portal)

A state-of-the-art, full-stack Previous Year Question Paper platform for Netaji Subhas University of Technology (NSUT) students — search, preview, upload, and download PYQs with a community-driven taxonomy and automated moderation pipeline.

**Live Frontend:** [nsut-pyq-portal.vercel.app](https://nsut-pyq-portal.vercel.app)  
**Live API Server:** [nsut-pyq-portal.onrender.com](https://nsut-pyq-portal.onrender.com)

---

## 📸 Screenshots & Highlights

| Feature | Description |
|---|---|
| **Home & Explore** | Instant search with debounce, filters by Branch, Semester, Course Title, Exam Type, and Year |
| **In-Browser PDF Preview** | Read PDF question papers inline with page navigation, zoom, and direct download tracking |
| **Dynamic Taxonomy Upload** | Upload papers with auto-filling Course Title & Course Code cascades + escape hatch for unlisted courses |
| **Admin Moderation Hub** | Multi-queue management for Pending Branch/Course entries, Reported papers, and Analytics |

---

## 🔥 Key Features & Architecture Highlights

### 🎓 For Students
- 🔍 **Instant Smart Search**: Search papers by course title, course code, or uploader name with debounced inputs.
- 🗂️ **Hierarchical Taxonomy Cascades**: Selecting a Branch populates relevant Course Titles; selecting a title auto-fills its official Course Code.
- ➕ **Paired "Not Listed" Escape Hatch**: If a course title or branch is missing, students can submit the new Course Title & Course Code pair together in one simple step. The paper publishes immediately while queuing taxonomy items for admin review.
- 📑 **In-Browser PDF Reader**: Native PDF preview powered by `react-pdf` without downloading files locally first.
- 📊 **Download Counter**: Real-time download metrics tracked per paper.
- 🚩 **Community Reporting**: Report inaccurate metadata, poor PDF scans, wrong year/exam, or duplicates directly to admins.
- 🌓 **Persistent Dark Mode**: Seamless dark/light theme toggle.

### 🛡️ For Admins
- 📊 **Analytics & Leaderboard**: Recharts visualizations for top-downloaded subjects and branch distribution.
- 📋 **Unified Pending Review Queue (`/admin/pending-review`)**: Moderates unlisted branch requests and paired course title/code submissions. Approving promotes them to master taxonomy for all users.
- 🚩 **Community Reports Queue (`/admin/reports`)**: Resolve student flags with resolution notes or paper deletion.
- 🌿 **Branch & Taxonomy Control (`/admin/branches`)**: Create official branches, update alias mappings, and manage course titles.

### 🔐 Authentication & Security
- 🔑 **Dual Auth System**: JWT token-based email/password authentication + one-click **Google OAuth 2.0**.
- ✉️ **Fail-Safe Email Verification**: Nodemailer SMTP integration with SSL (Port 465) and automatic auto-verification fallback if email services are unreachable.
- 🛡️ **Role-Based Access Control**: Student vs Admin guard middleware (`protect`, `adminOnly`).
- 🤫 **Secret Admin Registration**: Secure admin onboarding via secret passkey.

---

## 🛠️ Tech Stack

### Frontend (`/client`)
- **Core**: React 18 + Vite
- **Styling**: Tailwind CSS (Dark mode support)
- **Routing**: React Router v6
- **HTTP Client**: Axios with Bearer JWT interceptors
- **PDF Viewing**: `react-pdf`
- **Analytics**: `recharts`
- **Notifications**: `react-hot-toast`

### Backend (`/server`)
- **Runtime**: Node.js + Express.js
- **Database**: MongoDB Atlas + Mongoose ODM
- **Authentication**: JWT (`jsonwebtoken`) + `bcryptjs` + `passport` (Google OAuth 2.0)
- **File Storage**: Cloudinary (PDF streaming buffer via `multer` memory storage)
- **Email Service**: Nodemailer (Gmail SMTP SSL)

---

## 📁 Repository Map

```
pyq-portal/
├── client/                              # React SPA (Vite)
│   ├── public/                          # Static assets & logo
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js                 # Base Axios client & JWT interceptor
│   │   ├── context/
│   │   │   └── AuthContext.jsx          # User authentication state
│   │   ├── components/
│   │   │   ├── Navbar.jsx               # Navigation bar & theme switcher
│   │   │   ├── Footer.jsx
│   │   │   ├── FilterBar.jsx            # Dynamic taxonomy filters
│   │   │   ├── PaperCard.jsx            # Paper summary card
│   │   │   └── ProtectedRoute.jsx       # Auth & Admin route guards
│   │   ├── pages/
│   │   │   ├── Home.jsx                 # Main landing page
│   │   │   ├── PaperView.jsx            # PDF viewer & reporting modal
│   │   │   ├── Login.jsx                # User login
│   │   │   ├── Register.jsx             # Account registration
│   │   │   ├── Upload.jsx               # Dynamic paper upload page
│   │   │   ├── AuthCallback.jsx         # Google OAuth landing
│   │   │   └── admin/
│   │   │       ├── Dashboard.jsx        # Admin analytics & overview
│   │   │       ├── PendingReview.jsx    # Unified taxonomy review queue
│   │   │       ├── ReportsQueue.jsx     # Community flags queue
│   │   │       └── BranchRequests.jsx   # Branch management queue
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── vercel.json                      # Single-page application rewrite rules
│
└── server/                              # Express.js REST API Server
    ├── config/
    │   ├── db.js                        # MongoDB Atlas connection
    │   ├── cloudinary.js                # Cloudinary SDK configuration
    │   └── passport.js                  # Google OAuth strategy
    ├── controllers/
    │   ├── adminController.js           # Moderation & taxonomy approval APIs
    │   ├── authController.js            # Login, register, OAuth, email verification
    │   ├── branchController.js          # Public branch listing API
    │   └── paperController.js           # CRUD papers, upload, reports, stats
    ├── middleware/
    │   ├── authMiddleware.js            # JWT protection & admin guards
    │   └── uploadMiddleware.js          # Multer in-memory PDF buffer storage
    ├── models/
    │   ├── User.js                      # User account model
    │   ├── Paper.js                     # Core PYQ paper schema (pending flags)
    │   ├── Branch.js                    # Branch taxonomy model
    │   ├── CourseTitle.js               # Course title taxonomy model
    │   ├── CourseCode.js                # Course code model (refs CourseTitle)
    │   └── Report.js                    # Community report model
    ├── routes/
    │   ├── adminRoutes.js
    │   ├── authRoutes.js
    │   ├── branchRoutes.js
    │   ├── courseTitleRoutes.js
    │   ├── courseCodeRoutes.js
    │   └── paperRoutes.js
    ├── services/
    │   ├── branchService.js             # Branch taxonomy lookup & resolution
    │   ├── taxonomyService.js           # CourseTitle & CourseCode paired resolution
    │   ├── dedupService.js              # Duplicate paper metadata matching
    │   └── reportService.js             # Report creation & resolution logic
    └── index.js                         # Server entry point & CORS configuration
```

---

## ⚙️ Local Development Setup

### 1. Prerequisites
- **Node.js**: v18+ installed
- **MongoDB Atlas**: Database connection string
- **Cloudinary**: Cloud name, API Key & Secret
- **Google Cloud Console**: OAuth 2.0 Client ID & Secret
- **Gmail Account**: App Password for Nodemailer

### 2. Backend Setup
```bash
cd server
npm install
```

Create a `.env` file inside `/server`:
```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/pyqportal
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Verification (Gmail SMTP SSL)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Environment URLs
SERVER_URL=http://localhost:5001
CLIENT_URL=http://localhost:5173

# Admin Onboarding Passkey
ADMIN_SECRET_CODE=your_secret_admin_code
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install
```

Create a `.env.development` file inside `/client`:
```env
VITE_API_URL=http://localhost:5001/api
VITE_SERVER_URL=http://localhost:5001
```

Start the frontend Vite server:
```bash
npm run dev
```

Visit the app at `http://localhost:5173`.

---

## 🔌 API Route Reference

### 🔑 Authentication Routes (`/api/auth`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register student or admin | Public |
| `POST` | `/api/auth/login` | Email + password login | Public |
| `GET` | `/api/auth/me` | Fetch authenticated profile | Bearer JWT |
| `GET` | `/api/auth/verify/:token` | Email verification link | Public |
| `POST` | `/api/auth/resend-verification` | Resend verification email | Public |
| `GET` | `/api/auth/google` | Trigger Google OAuth 2.0 flow | Public |
| `GET` | `/api/auth/google/callback` | OAuth callback & JWT issuing | Public |

### 📄 Paper Routes (`/api/papers`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/papers` | Get approved papers (with search & filters) | Public |
| `GET` | `/api/papers/trending` | Top 10 downloaded papers | Public |
| `GET` | `/api/papers/:id` | Fetch single paper details | Public |
| `POST` | `/api/papers` | Upload new PDF paper | Bearer JWT |
| `POST` | `/api/papers/check-duplicate` | Pre-check metadata duplicates | Public |
| `PATCH` | `/api/papers/:id/download` | Increment download counter | Public |
| `POST` | `/api/papers/:id/report` | Report paper for issues | Bearer JWT |
| `GET` | `/api/papers/stats` | Analytics summary | Admin |
| `GET` | `/api/papers/branch-stats` | Branch-wise paper metrics | Admin |

### 🛠️ Admin Moderation Routes (`/api/admin`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/admin/pending-review` | Unified pending queue (branches, titles, codes) | Admin |
| `PATCH` | `/api/admin/course-titles/approve-pair` | Approve pending title + code pair | Admin |
| `POST` | `/api/admin/branches/resolve-pending` | Resolve pending branch request | Admin |
| `GET` | `/api/admin/reports` | List community reported papers | Admin |
| `PATCH` | `/api/admin/reports/:id/resolve` | Resolve/dismiss paper report | Admin |
| `DELETE` | `/api/admin/papers/:id` | Remove paper from portal | Admin |

---

## 🗄️ Database Schemas

### `Paper.js` (Core Entity)
```javascript
{
  degree:                String, // 'B.Tech'
  branch:                String, // 'CSE' (or null if pending)
  semester:              Number, // 1-8
  courseTitle:           String,
  courseCode:            String,
  year:                  Number,
  examType:              'Mid Sem' | 'End Sem' | 'Summer Sem',
  pdfUrl:                String, // Cloudinary URL
  cloudinaryId:          String,
  uploadedBy:            ObjectId (ref: User),
  status:                'approved' | 'pending' | 'flagged',
  downloads:             Number,
  branchPending:         Boolean,
  pendingBranchName:     String,
  courseTitlePending:    Boolean,
  pendingCourseTitle:    String,
  courseCodePending:     Boolean,
  pendingCourseCode:     String
}
```

### `CourseTitle.js` (Taxonomy)
```javascript
{
  name:        String,
  branch:      String, // Branch code
  semester:    Number,
  isPending:   Boolean,
  submittedBy: ObjectId (ref: User),
  isActive:    Boolean
}
```

---

## 🤝 Contributing & Guidelines

1. **Bug Reports & Features**: Feel free to submit a pull request or open an issue on GitHub.
2. **Uploading PYQs**: Students can upload past papers directly using the **Upload** option in the navigation bar.

---

## 👨‍💻 Developer

**Yogesh Kumar**  
B.Tech CSE, NSUT Delhi  
[GitHub Profile](https://github.com/y09e5hkumar) · [LinkedIn](https://www.linkedin.com/in/yogesh-kumar-94398028a/)
