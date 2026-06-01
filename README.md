# NeuroMath AI - Dyscalculia Detection & Classroom Remediation Navigator

An adaptive, AI-powered diagnostic and classroom remediation system built to identify and support students experiencing dyscalculia characteristics. 

This repository has been fully migrated and refactored from a simple Supabase template into a production-ready, custom **full-stack Node.js, Express, MongoDB (Mongoose), and React architecture** with secure JWT role-based workflows and Gemini question caching.

---

## 🏗 Project Architecture

The project is divided into two decoupled folders at the root level:

```
project-root/
├── frontend/             # Vite + React (TypeScript, Tailwind, shadcn/ui, Axios)
├── backend/              # Node.js + Express.js REST API with MongoDB & Mongoose
└── README.md             # This document
```

---

## 🔑 Authentication, Authorization & Roles

Authentication is implemented from scratch using **JSON Web Tokens (JWT)** and **bcryptjs** password hashing:

1. **Admin (`admin` role)**:
   - Accessible via the `/admin` route.
   - Default Admin account is seeded automatically on backend startup.
   - **Credentials**:
     - **Email**: `admin@neuromath.ai`
     - **Password**: `Admin@NeuroMath123`
   - **Capabilities**: Accesses the Admin Dashboard to monitor platform usage, view active teachers, and **securely create Teacher accounts** (disabling public educator signup for maximum platform security).
2. **Teacher (`teacher` role)**:
   - Accessible via `/dashboard` once logged in.
   - Accounts must be created by the Admin.
   - **Capabilities**: Accesses the Teacher Dashboard to view all student test records, monitor detected cognitive blockers, review severity metrics, and analyze AI-generated roadmaps.
3. **Student (`student` role)**:
   - Registers publicly on the sign-up page (defaulting to the `student` role).
   - Accessible via `/dashboard` once logged in.
   - **Capabilities**: Starts or resumes adaptive diagnostic tests, deletes unfinished tests, and views their personal assessment report history.

---

## 💾 Database Schema (MongoDB Mongoose)

1. **User**: Name, unique lowercase email, hashed password, role (`student`, `teacher`, `admin`), and timestamps.
2. **TestSession**: Tracks in-progress, completed, and abandoned tests. Stores `currentQuestionIndex` and the entire list of generated questions (`questionsList`) to support robust autosaving and resuming.
3. **Question**: Stores and caches generated math questions categorized by construct/difficulty to avoid redundant Gemini API rate limits and minimize costs.
4. **Result**: Stores completed diagnostic reports (Dyscalculia likelihood percentage, overall severity classification, strengths, weaknesses, blocker reports, and roadmap recommendations).

---

## ⚡️ Gemini AI Service & Caching Engine

Located inside `backend/src/services/geminiService.js`, the AI service performs:
1. **Adaptive Question Generation**: Generates tests matching student age and historical performance.
2. **Mongoose Caching**: Automatically saves Gemini-generated questions in the database, drawing from cached questions for future tests when a matching construct/difficulty is requested.
3. **Blocker Analysis & Roadmap Generation**: Compiles the personalized 5-step action plan using multi-sensory techniques.
4. **Graceful Failover / Offline Fallbacks**: Features robust, high-quality pre-coded questions and roadmap plans to guarantee the system remains fully operational even if Gemini keys are unconfigured or offline.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0+ recommended)
- [MongoDB](https://www.mongodb.com/) (running locally on port 27017)

---

### Step 1: Start MongoDB

Verify MongoDB is running locally. If using Homebrew on macOS, start it with:
```bash
brew services start mongodb-community
```

---

### Step 2: Configure & Start the Backend

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your `.env` configuration (a template is provided in `.env.example`):
   ```env
   PORT=5001
   MONGO_URI=mongodb://localhost:27017/neuromath
   JWT_SECRET=your_jwt_signing_secret_here
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
   *Note: On boot, the console will print confirmation when the default Admin account is seeded.*

---

### Step 3: Configure & Start the Frontend

1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the frontend development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Verification Tasks

1. **Admin Portal**: Log in as `admin@neuromath.ai` / `Admin@NeuroMath123`, navigate to `/admin`, and register a new teacher (e.g., `teacher1@school.edu` / `password123`).
2. **Teacher Workspace**: Log in with the newly registered teacher credentials. Confirm the empty dashboard displays correctly.
3. **Student Test Runner**: Register a new student publicly, log in, start a diagnostic test, answer 3 questions, and close/refresh the browser. Relog to verify you can resume the test seamlessly or delete it.
