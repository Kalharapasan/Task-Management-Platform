# CollabTask Platform - Next.js 14 Client

CollabTask is a collaborative, responsive task management client built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **React Query**. It consumes a Laravel 10 API, storing session credentials securely in HttpOnly cookies, routing requests through dynamic BFF proxy handlers, and rendering Kanban workflows.

---

## 🚀 Quick Start Guide

### 1. Configure Local Environment & API Mapping
The frontend is configured to communicate with the Laravel API. To point the client at your local Laravel server:

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and configure `NEXT_PUBLIC_API_URL` to point to your local Laravel server (by default it runs on port 8000):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```
3. *(Security Note)*: The Next.js BFF proxy will automatically capture the token on login/registration, store it as an httpOnly `task_token` cookie on localhost, and attach it to subsequent headers.

### 2. Dependency Installation
Install the required design systems, query caching, form validation, and test runner libraries:
```bash
npm install
```

### 3. Spin Up Development Server
Start the local server (available on http://localhost:3000):
```bash
npm run dev
```

### 4. Run Automated Testing Suites
Execute unit tests for the auth form validation Zod schemas and status selectors:
```bash
npm run test
```

---

## 🔐 Mock Credentials (API Offline Fallback)

If your local Laravel server is offline, the BFF route proxy will serve mock databases. Log in using any of the following credentials to simulate specific workspace roles:

| Access Role | Email ID | Password |
| :--- | :--- | :--- |
| **System Administrator** | `admin@task.com` | `AdminPass123!` |
| **Project Manager** | `pm@task.com` | `ManagerPass123!` |
| **Team Member** | `member@task.com` | `MemberPass123!` |

*Password Requirements: Minimum 8 characters, 1 uppercase, 1 lowercase, 1 digit, and 1 special symbol.*
