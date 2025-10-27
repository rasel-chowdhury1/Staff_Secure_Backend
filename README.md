# 🛡️ Staff Secure HR Management Backend

A secure, scalable, and production-ready **HR Management Backend System** built using **Node.js, Express, TypeScript, MongoDB, Socket.IO, and Stripe**.  
This backend handles authentication, user management, payments, real-time communication, admin monitoring, and system security.

---

## 📌 Project Overview

**Project Name:** Staff Secure HR Management Backend  
**Environment:** Development / Production  
**Architecture:** Modular MVC  
**Language:** TypeScript  
**API Style:** REST  
**Authentication:** JWT (Access & Refresh Tokens)

---

## 🚀 Tech Stack

- **Node.js**
- **Express.js**
- **TypeScript**
- **MongoDB (Mongoose)**
- **Socket.IO**
- **JWT Authentication**
- **Stripe Payment Gateway**
- **Nodemailer (OTP & Emails)**
- **Bcrypt**
- **ESLint & Prettier**

---

## 📁 Folder Structure

The project folder structure follows the MVC pattern and is organized as shown below:

```bash
src/
│
├── app/
│ ├── middleware/
│ │ ├── auth.ts
│ │ ├── fileUpload.ts
│ │ ├── globalErrorhandler.ts
│ │ ├── notfound.ts
│ │ ├── parseData.ts
│ │ └── validateRequest.ts
│ │
│ ├── modules/
│ │ ├── user/
│ │ ├── payment/
│ │ └── setting/
│ │
│ └── routes/
│ └── index.ts
│
├── utils/
│
├── app.ts
├── server.ts
├── socketIo.ts
│
├── .env
├── .env.example
├── package.json
├── README.md
⚙️ Environment Variables
Before running the project, make sure to create a .env file in the root directory by copying .env.example:

cp .env.example .env
Update the .env file with the required configuration.

NODE_ENV=development
PORT=9010
SOCKET_PORT=9020
IP=10.10.10.32

PROJECT_NAME=Staff_Secure_HR_Management_Backend

ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_PHONE=

BACKEND_URL=http://10.10.10.32:9010

DATABASE_URL=

JWT_ACCESS_SECRET=authenctication@accesstokensecret@authenctication
JWT_ACCESS_EXPIRES_IN=100d
JWT_REFRESH_SECRET=authenctication@refreshtokensecret@authenctication
JWT_REFRESH_EXPIRES_IN=300d

NODEMAILER_HOST_EMAIL=
NODEMAILER_HOST_PASS=

OTP_TOKEN_EXPIRE_TIME=20m
OTP_EXPIRE_TIME=1

STRIPE_SECRET_KEY=sk_test_dummy_key
STRIPE_API_KEY=
STRIPE_API_SECRET=

SERVER_URL=
CLIENT_URL=

BCRYPT_SALT_ROUNDS=10

# Server Monitoring Credentials
MONITOR_USERNAME=Admin
MONITOR_PASSWORD=12345
📦 Installation Guide
Follow the steps below to set up the project:

1️⃣ Clone the Repository
git clone <your-repository-url>
cd Staff_Secure_HR_Management_Backend
2️⃣ Install Dependencies
npm install
3️⃣ Build the Project
npm run build
4️⃣ Run in Development Mode
npm run dev
5️⃣ Run in Production Mode
npm start
🌐 Server Information
The project exposes the following services:

Service	Port
API Server	9010
Socket Server	9020
Base API URL
http://10.10.10.32:9010/api/v1

📮 API Documentation (Postman)
All endpoints are documented using Postman.

🔗 Postman Documentation

🔐 Authentication & Authorization
JWT Access Token: Used for authenticating users and securing endpoints.

JWT Refresh Token: Used to refresh access tokens.

Role-based Authorization: Restrict access based on user roles.

Password Hashing: Using bcrypt for securing passwords.

OTP Verification: One-time password verification via email.

💳 Payment System
Stripe Payment Integration:

Secure server-side payment processing.

Subscription and billing support.

Stripe integration for handling payments securely.

🔄 Real-Time Communication
Powered by Socket.IO, the backend supports real-time communication and notifications.

Separate Socket Server handles real-time data flow.

Used for live updates, notifications, and communication between clients and servers.

🧪 Error Handling
Centralized global error handler for handling all errors in the application.

Custom error responses to provide meaningful feedback to clients.

Validation error handling for incoming requests.

404 Not Found handling for missing routes.

🛠 Available Scripts
Command	Description
npm run dev	Start development server
npm run build	Compile TypeScript
npm start	Start production server
npm run lint	Run ESLint to check for errors
npm run lint:fix	Fix lint issues
🔒 Security Features
Environment-based Configuration: Environment variables are used to store sensitive information.

JWT Authentication: Secures API endpoints by ensuring only authorized users can access protected routes.

Password Hashing: All passwords are hashed using bcrypt before storage.

Request Validation: Ensures that incoming requests contain valid data.

Centralized Error Handling: Errors are caught and handled in a centralized way, allowing for a better user experience.

Secure Payment Processing: Stripe's secure API is used to handle payment-related transactions.

📄 License
This project is intended for internal and commercial use.

👨‍💻 Author
Rasel Dev
Backend Engineer – Node.js | TypeScript | MongoDB