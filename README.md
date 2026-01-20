# 💰 Smart Expense Tracker - Backend API

[![NestJS](https://img.shields.io/badge/framework-NestJS-E0234E?style=flat-square&logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/orm-Prisma-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)

A robust, production-ready RESTful API for managing personal finances. Built with a focus on clean architecture, security, and scalability.

## 🚀 Key Features

- **🔐 Secure Authentication:** JWT-based auth with Bcrypt password hashing.
- **📊 Comprehensive Tracking:** Manage Expenses, Income, Categories, and Tags.
- **🔄 Recurring Transactions:** Automated generation of recurring expenses (subscriptions, rent, etc.).
- **📅 Budget Management:** Set and track budgets per category or for specific time periods.
- **📈 Advanced Reporting:** Get financial summaries, monthly breakdowns, and category-wise analysis.
- **⚙️ User Settings:** Customizable currency, theme preferences, and notification toggles.
- **🛡️ Security & Performance:** Rate limiting (Throttler), Secure headers (Helmet), Caching, and Request validation.

## 🛠️ Tech Stack

- **Core:** [NestJS](https://nestjs.com/) (Node.js framework)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Database ORM:** [Prisma](https://www.prisma.io/)
- **Database:** PostgreSQL (Production) / SQLite (Development/Test)
- **Security:** Passport.js (JWT), Bcrypt, Helmet, Throttler
- **Validation:** Class-validator, Class-transformer
- **Testing:** Jest, Supertest

## 📂 Project Structure

The project follows a modular structure inspired by Clean Architecture:

```text
src/
├── domain/                # Core business logic and entities
├── application/           # Use cases and service interfaces
├── infrastructure/        # External implementations (DB, HTTP, Auth)
│   ├── persistence/       # Prisma repositories
│   └── http/              # Controllers, DTOs, and Filters
├── main.ts                # Application entry point
└── app.module.ts          # Root module
```

## 🚦 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- PostgreSQL instance (or use Docker)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd expense-tracker-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment:**
    Create a `.env` file in the root directory and add your variables:
    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/expense_tracker?schema=public"
    JWT_SECRET="your_super_secret_key"
    PORT=3000
    ```

4.  **Database Migration:**
    ```bash
    npx prisma migrate dev
    ```

### Running the App

```bash
# development
npm run start:dev

# production mode
npm run build
npm run start:prod
```

### Running Tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## 📖 API Documentation

The API exposes the following main modules:
- `/auth`: Login, Register, Profile
- `/expenses`: Expense management (CRUD, filtering)
- `/income`: Income management
- `/categories`: Manage spending/earning categories
- `/budgets`: Set and monitor budget limits
- `/reports`: Financial summaries and chart data
- `/settings`: User preference management

## 📄 License

This project is [MIT licensed](LICENSE).

