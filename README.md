# Enterprise HR Management Backend

An enterprise-grade HR management backend system supporting job management, subscription billing, AI-powered resume recommendations, and real-time communication.

---

## 🚀 Features

### 👤 Roles & Permissions
- **Candidate**
  - View job listings
  - Apply for jobs
  - Upload resume
  - Communicate with Admin

- **Employer**
  - Create and manage job posts
  - Purchase monthly subscriptions
  - Receive AI-recommended candidate CVs
  - Communicate with Admin

- **Admin**
  - Manage users and jobs
  - View AI-suggested best CVs per job
  - Send shortlisted CVs to employers
  - Monitor system activity

---

## 🧠 AI Capabilities
- Resume-to-job matching
- Candidate scoring based on skills and experience
- Auto-suggestion of best candidates per job

---

## ⚡ Real-time Communication
- Socket-based chat between:
  - Candidate ↔ Admin
  - Employer ↔ Admin

---

## 🏗 Tech Stack

- **Backend**: Node.js, Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Real-time**: Socket.io
- **Deployment**: Nginx, PM2
- **CI/CD**: GitHub Actions

---

## 📁 Project Structure

src
├── app
│ ├── modules
│ │ ├── auth
│ │ ├── user
│ │ ├── candidate
│ │ ├── employer
│ │ ├── admin
│ │ ├── job
│ │ ├── application
│ │ ├── subscription
│ │ ├── ai
│ │ └── chat
│ ├── middlewares
│ ├── routes
│ ├── utils
│ └── config
├── app.ts
├── server.ts
├── socketio.ts
