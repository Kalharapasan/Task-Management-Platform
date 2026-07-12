# Task Management Platform (ShieldAML)

A role-aware Project and Task Management monorepo built using a **Laravel 11 REST API** and a **Next.js 14 App Router** frontend with role-based routing gates, Kanban boards, and comments.

---

## 📁 Repository Structure
```
├── backend/                  # Laravel 11 REST API
│   ├── app/                  # Controllers, Requests, Policies, Resources
│   ├── database/             # Migrations, Factories, Seeders
│   ├── tests/                # Feature and Unit tests
│   └── .env.example          # Backend configuration file
│
├── frontend/                 # Next.js 14 Application (App Router, TypeScript)
│   ├── src/app/              # Next.js pages and API route handlers
│   ├── src/components/       # Layout shells, Sidebar, UI components
│   ├── src/lib/              # Fetch client wrapper
│   └── .env.example          # Frontend configuration file
│
├── .github/workflows/        # Automated CI/CD Pipelines
│   ├── backend.yml           # PHP Linting & test execution
│   └── frontend.yml          # Node/Next.js linting, tests & build check
│
└── task_management_platform.postman_collection.json # Postman collection
```

---

## ⚙️ Setup and Installation Instructions

### Prerequisite Requirements
* **PHP**: 8.2 or higher
* **Composer**: Dependency Manager for PHP
* **Node.js**: 18.x or higher + **npm**
* **MySQL/SQLite**: Database server

---

### 1. Backend Configuration (Laravel)

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install PHP package dependencies:
   ```bash
   composer install
   ```
3. Copy the template configuration file:
   ```bash
   cp .env.example .env
   ```
4. Update the DB variables in `.env` if using a custom database, otherwise Laravel 11 will automatically configure a local SQLite database file `database.sqlite` if MySQL config is empty.
5. Generate the application cipher key:
   ```bash
   php artisan key:generate
   ```
6. Run database tables migration & seed database records:
   ```bash
   php artisan migrate --seed
   ```
7. Fire up the local API server:
   ```bash
   php artisan serve
   ```
   *The backend REST API is now running at `http://localhost:8000/api`*

---

### 2. Frontend Configuration (Next.js)

1. Open another terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Copy the template configuration file:
   ```bash
   cp .env.example .env
   ```
4. Verify that `NEXT_PUBLIC_API_URL` is pointed to the proxy server or local Laravel endpoint:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```
5. Fire up the Next.js local development server:
   ```bash
   npm run dev
   ```
   *The frontend dashboard is now available at `http://localhost:3000`*

---

## 🔑 Default Login Credentials

Use the following seeded accounts to verify access levels:

| Role | Username (Email) | Password | Access Level |
|---|---|---|---|
| **Admin** | `admin@taskplatform.com` | `password` | Full CRUD on users, projects, tasks, and system settings. |
| **Project Manager** | `pm1@taskplatform.com` | `password` | CRUD on owned projects, manage rosters, CRUD tasks. |
| **Team Member** | `member1@taskplatform.com` | `password` | Read projects, update status of assigned tasks, comment. |

*Standalone mock accounts (e.g. `admin@task.com` / `AdminPass123!`) are also supported directly in the frontend BFF offline mode.*

---

## 📊 Feature Completion Report

| Feature / Requirement | Category | Status | Details |
|---|---|---|---|
| Role-based access controls | Backend / Frontend | **Completed** | Enforced via Laravel Policies + Next Edge Middleware routing gates. |
| Token authorization | Auth | **Completed** | Secured via Laravel Sanctum Bearer tokens and HttpOnly Next.js BFF proxy. |
| Projects & Tasks CRUD | REST API | **Completed** | Supported on both standalone mock & active Laravel database models. |
| Roster Management | Projects | **Completed** | PMs can attach/detach team members from projects. |
| Kanban Board | Tasks | **Completed** | Grouped by status, interactive status dropdowns, assignee & priority filters. |
| Discussions / comments | Tasks | **Completed** | Log comments in real-time under individual task files. |
| User Directory | Admin | **Completed** | Admin-restricted account provisioning and deactivation dashboard. |
| Form Validations | Security | **Completed** | Enforced via FormRequests on backend and `react-hook-form` + `zod` on frontend. |
| Testing Suites | Validation | **Completed** | Vitest unit tests for front components + PHPUnit feature tests for backend auth/gates. |
| CI/CD Pipelines | Automation | **Completed** | Automated GitHub Actions pipelines for linting, compiling, and testing. |

---

## 🛠️ Automated CI/CD Workflows

### 🐳 Backend Workflow (`.github/workflows/backend.yml`)
* **Trigger:** Triggers automatically on any push or pull request to the `main` or `develop` branches.
* **Checks performed:** Setup PHP env, installs Composer dependencies, configures local environment, compiles and tests all Laravel routes against SQLite database instance, and verifies integrity.
* **Exclusions:** Does not run auto-deploy hooks or package distribution uploads.

### 🌐 Frontend Workflow (`.github/workflows/frontend.yml`)
* **Trigger:** Triggers automatically on push or pull request to `main` or `develop`.
* **Checks performed:** Checks Node env, installs npm packages, runs ESLint linting verification checks, executes Vitest unit testing suites, and checks production webpack compiler via `npm run build`.
* **Exclusions:** Does not perform static site deployment or preview-channel hosting.

---

## 🤖 AI Assistance Disclosure
*This project was developed with the assistance of agentic AI coding assistants:*
* Used AI models to assist in drafting the ERD diagrams, routing architecture, and Next.js layout structure.
* Core files like `route.ts` (BFF Translation Proxy Gateway), `page.tsx` (Kanban Board), and `TaskManagementTest.php` were reviewed, refactored, and hand-tuned to align models (e.g. mapping frontend camelCase `assigneeId` and `dueDate` to Laravel's snake_case `assigned_to` and `due_date`) and avoid CORS and mismatch issues.
