# Full Stack Documentation
## Combined Insurance Services (St.Lucia) Ltd. Management System

---

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Frontend Stack](#frontend-stack)
3. [Backend Stack](#backend-stack)
4. [Database](#database)
5. [Build Tools & Development](#build-tools--development)
6. [Dependencies](#dependencies)
7. [Project Structure](#project-structure)
8. [API Architecture](#api-architecture)
9. [Security](#security)
10. [Deployment](#deployment)

---

## 🏗️ Architecture Overview

### Application Type
- **Full-Stack Web Application**
- **Client-Server Architecture**
- **RESTful API Backend**
- **Single Page Application (SPA) Frontend**

### Communication Flow
```
Frontend (Browser) ←→ REST API ←→ SQLite Database
```

### Technology Stack Summary
- **Frontend**: Bootstrap 5, jQuery, DataTables, SCSS
- **Backend**: Node.js, Express.js
- **Database**: SQLite (with WAL mode for concurrency)
- **Build Tool**: Gulp
- **Authentication**: Session-based (Express-session)
- **Password Hashing**: bcryptjs

---

## 🎨 Frontend Stack

### Core Technologies

#### HTML/CSS Framework
- **Bootstrap 5.3.3** - Responsive UI framework
- **SCSS/SASS** - CSS preprocessor
- **Custom SCSS** - Custom styling and theming

#### JavaScript Libraries
- **jQuery 3.6.0** - DOM manipulation and AJAX
- **DataTables 1.11.4** - Advanced table functionality
  - DataTables Bootstrap 5 integration
  - DataTables Buttons extension
  - DataTables Responsive extension
  - DataTables Select extension
  - DataTables KeyTable extension
- **Select2 4.0.13** - Enhanced select dropdowns
- **SweetAlert2 10.15.7** - Beautiful alert dialogs
- **Lucide Icons 0.453.0** - Modern icon library
- **Moment.js 2.22.2** - Date/time manipulation
- **ApexCharts 3.33.1** - Chart library
- **Chart.js 2.7.2** - Chart library
- **html2pdf.js** - PDF generation from HTML

#### UI Components & Plugins
- **Bootstrap Datepicker** - Date selection
- **Daterangepicker** - Date range selection
- **Flatpickr** - Modern date picker
- **Bootstrap Select** - Enhanced select boxes
- **Bootstrap Touchspin** - Number input spinner
- **Quill** - Rich text editor
- **Dropzone** - File upload
- **Toastr** - Toast notifications
- **Simplebar** - Custom scrollbars
- **Waves** - Material design ripple effect

#### Build & Development Tools
- **Gulp 4.0.2** - Task runner
- **Browser-sync** - Live reload development server
- **Babel** - JavaScript transpiler
- **Autoprefixer** - CSS vendor prefixing
- **Clean CSS** - CSS minification
- **Uglify** - JavaScript minification
- **Dart Sass** - SCSS compiler

### Frontend Architecture

#### File Structure
```
Admin/
├── src/                    # Source files
│   ├── assets/
│   │   ├── js/             # JavaScript files
│   │   │   ├── api.js      # API client
│   │   │   ├── auth.js     # Authentication
│   │   │   ├── app.js      # Main app logic
│   │   │   ├── app-common.js # Common functions
│   │   │   └── pages/      # Page-specific JS
│   │   ├── scss/           # SCSS stylesheets
│   │   │   ├── components/ # Component styles
│   │   │   ├── plugins/    # Plugin styles
│   │   │   └── style.scss  # Main stylesheet
│   │   ├── images/         # Images and assets
│   │   └── fonts/          # Font files
│   ├── partials/           # HTML partials/templates
│   │   ├── head-css.html
│   │   ├── footer-scripts.html
│   │   ├── sidenav.html
│   │   ├── topbar.html
│   │   └── ...
│   └── *.html              # Page templates
├── dist/                   # Built/compiled files
└── gulpfile.js            # Gulp configuration
```

#### Key Frontend Files

**API Client** (`assets/js/api.js`)
- Centralized API communication
- Auto-detects production vs development
- Handles authentication
- Error handling

**Authentication** (`assets/js/auth.js`)
- Session validation
- Redirect logic
- Protected route handling

**Page-Specific JavaScript**
- `dashboard.js` - Dashboard functionality
- `customers.js` - Customer management
- `policies.js` - Policy management
- `payments.js` - Payment processing
- `reports.js` - Report generation
- `users.js` - User management
- `receipt.js` - Receipt display
- `renewal-notice.js` - Renewal notice generation
- `daily-cash-statement.js` - Cash statement generation

---

## ⚙️ Backend Stack

### Core Technologies

#### Runtime & Framework
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **Express-session** - Session management
- **CORS** - Cross-origin resource sharing
- **Body-parser** - Request body parsing

#### Database
- **SQLite3** - Embedded SQL database
- **WAL Mode** - Write-Ahead Logging for concurrency
- **Optimized PRAGMA settings** - Performance tuning

#### Security
- **bcryptjs** - Password hashing
- **Session-based authentication** - Secure user sessions
- **Role-based access control (RBAC)** - Permission system

### Backend Architecture

#### File Structure
```
server/
├── server.js              # Main server file
├── database.js            # Database setup & utilities
├── database.sqlite        # SQLite database file
├── create-admin.js        # Admin user creation script
├── seed-data.js           # Data seeding script
└── package.json           # Dependencies
```

#### Key Backend Components

**Server** (`server.js`)
- Express application setup
- Middleware configuration
- Route definitions
- Authentication middleware
- API endpoints
- Error handling

**Database** (`database.js`)
- SQLite connection
- Database initialization
- Table creation
- Permission system
- Utility functions:
  - `generateReceiptNumber()`
  - `generatePolicyNumber()`
  - `hasPermissionAsync()`
  - `logAuditAction()`
  - `runTransaction()`

### API Endpoints

#### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/me` - Get current user

#### Customers
- `GET /api/customers` - List all customers
- `GET /api/customers/:id` - Get customer details
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

#### Policies
- `GET /api/policies` - List all policies
- `GET /api/policies/:id` - Get policy details
- `POST /api/policies` - Create policy
- `PUT /api/policies/:id` - Update policy

#### Payments
- `GET /api/payments` - List all payments
- `GET /api/payments/policy/:policyId` - Get payments for policy
- `POST /api/payments` - Record payment

#### Receipts
- `GET /api/receipts/:receiptNumber` - Get receipt details

#### Reports
- `GET /api/reports/daily-cash-statement?date=YYYY-MM-DD` - Daily cash statement
- `GET /api/admin/reports/cash-statement?startDate=&endDate=` - Cash statement (date range)
- `GET /api/admin/reports/users?startDate=&endDate=` - User activity report
- `GET /api/admin/reports/policies?startDate=&endDate=` - Policy report
- `GET /api/admin/reports/payments?startDate=&endDate=` - Payment report
- `GET /api/admin/reports/customers?filter=` - Customer report
- `GET /api/admin/reports/outstanding-balances?startDate=&endDate=` - Outstanding balance report

#### Renewals
- `GET /api/renewals/month/:year/:month` - Renewals by month
- `GET /api/renewals/all` - All renewals
- `GET /api/renewals/policy/:policyId` - Renewal notice for policy
- `GET /api/renewals/report/:year/:month` - Renewal report

#### Users
- `GET /api/users` - List all users (Admin/Supervisor only)
- `POST /api/users` - Create user (Admin only)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

#### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics

#### Admin
- `GET /api/admin/periods` - Financial periods
- `POST /api/admin/periods` - Create period
- `POST /api/admin/periods/close-current` - Close current period
- `GET /api/admin/audit-log` - Audit log
- `GET /api/user/permissions` - User permissions

---

## 💾 Database

### Database System
- **Type**: SQLite3 (Embedded database)
- **File**: `server/database.sqlite`
- **Mode**: WAL (Write-Ahead Logging) for better concurrency

### Database Schema

#### Tables

**users**
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('Admin', 'Supervisor', 'Cashier', 'Underwriter')),
    full_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**customers**
```sql
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    address TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    email TEXT,
    sex TEXT,
    id_number TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**policies**
```sql
CREATE TABLE policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_number TEXT UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    coverage_type TEXT NOT NULL,
    coverage_start_date DATE NOT NULL,
    coverage_end_date DATE NOT NULL,
    total_premium_due REAL NOT NULL,
    amount_paid REAL DEFAULT 0,
    outstanding_balance REAL DEFAULT 0,
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
)
```

**payments**
```sql
CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    received_by INTEGER NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (policy_id) REFERENCES policies(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (received_by) REFERENCES users(id)
)
```

**receipts**
```sql
CREATE TABLE receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_number TEXT UNIQUE NOT NULL,
    policy_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    payment_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    generated_by INTEGER NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (policy_id) REFERENCES policies(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (generated_by) REFERENCES users(id)
)
```

**user_permissions**
```sql
CREATE TABLE user_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    permission_id TEXT NOT NULL,
    granted BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

**audit_log**
```sql
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

**financial_periods**
```sql
CREATE TABLE financial_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'Open',
    total_collections REAL DEFAULT 0,
    total_policies_created INTEGER DEFAULT 0,
    closed_by INTEGER,
    closed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (closed_by) REFERENCES users(id)
)
```

### Database Optimizations
- **WAL Mode**: Enables multiple readers and one writer simultaneously
- **Busy Timeout**: 5 seconds for lock handling
- **Cache Size**: 64MB
- **Foreign Keys**: Enabled for referential integrity
- **Temp Store**: Memory for better performance
- **Synchronous**: NORMAL mode (balance between safety and speed)

---

## 🔧 Build Tools & Development

### Frontend Build Process

#### Gulp Tasks
- **clean** - Remove dist directory
- **html** - Process HTML files with includes
- **scss** - Compile SCSS to CSS
- **javascript** - Minify and bundle JavaScript
- **images** - Optimize images
- **fonts** - Copy font files
- **icons** - Process icon fonts
- **vendor** - Copy vendor libraries
- **build** - Run all build tasks
- **watch** - Watch files for changes
- **serve** - Start browser-sync development server

#### Build Commands
```bash
# Development (watch mode with live reload)
npx gulp

# Production build
npx gulp build
```

### Backend Development

#### Server Commands
```bash
# Start server
npm start

# Development with auto-reload (if nodemon installed)
npm run dev
```

#### Default Configuration
- **Port**: 3001
- **Session Secret**: Environment variable or default
- **Session Duration**: 24 hours
- **CORS**: Enabled for all origins (configurable)

---

## 📦 Dependencies

### Frontend Dependencies

#### Core Libraries
```json
{
  "jquery": "3.6.0",
  "bootstrap": "^5.3.3",
  "datatables.net": "^1.11.4",
  "datatables.net-bs5": "^1.11.4",
  "select2": "^4.0.13",
  "sweetalert2": "^10.15.7",
  "lucide": "^0.453.0",
  "moment": "2.22.2"
}
```

#### UI Components
```json
{
  "apexcharts": "3.33.1",
  "chart.js": "^2.7.2",
  "bootstrap-datepicker": "^1.9.0",
  "daterangepicker": "^3.0.2",
  "flatpickr": "^4.6.9",
  "quill": "^1.3.7",
  "dropzone": "^5.8.1",
  "toastr": "^2.1.4"
}
```

#### Build Tools
```json
{
  "gulp": "^4.0.2",
  "gulp-sass": "^5.1.0",
  "gulp-uglify": "^3.0.2",
  "gulp-babel": "^8.0.0",
  "browser-sync": "^2.27.10"
}
```

### Backend Dependencies

#### Core
```json
{
  "express": "^4.x",
  "express-session": "^1.x",
  "cors": "^2.x",
  "body-parser": "^1.x",
  "sqlite3": "^5.x",
  "bcryptjs": "^2.x"
}
```

---

## 🔐 Security

### Authentication
- **Session-based authentication** using Express-session
- **Password hashing** with bcryptjs (10 rounds)
- **Session cookies** with httpOnly flag (XSS protection)
- **Session expiration** after 24 hours of inactivity

### Authorization
- **Role-Based Access Control (RBAC)**
  - Admin: Full system access
  - Supervisor: Reports and management
  - Cashier: Payment processing
  - Underwriter: Policy management
- **Permission-based system** for granular control
- **Route protection** middleware

### Security Features
- **CORS** configuration for cross-origin requests
- **SQL injection protection** via parameterized queries
- **XSS protection** via httpOnly cookies
- **Audit logging** for all user actions
- **Input validation** on all API endpoints

---

## 🚀 Deployment

### Production Configuration

#### Frontend
- Build files in `Admin/dist/`
- Serve static files via web server (Apache, Nginx, or Node.js)
- Configure API base URL for production

#### Backend
- Run Node.js server on port 3001
- Configure environment variables:
  - `PORT` - Server port (default: 3001)
  - `SESSION_SECRET` - Session encryption secret
- Use process manager (PM2, systemd, etc.)

#### Database
- SQLite file: `server/database.sqlite`
- Ensure write permissions
- Regular backups recommended

### Deployment Checklist
- [ ] Build frontend: `npx gulp build`
- [ ] Set environment variables
- [ ] Configure web server
- [ ] Set up SSL/HTTPS (recommended)
- [ ] Configure firewall
- [ ] Set up database backups
- [ ] Configure process manager
- [ ] Test all functionality

---

## 📊 System Features

### Core Features
1. **Customer Management**
   - Create, read, update, delete customers
   - ID scanning (OCR) capability
   - Customer search and filtering

2. **Policy Management**
   - Create and manage insurance policies
   - Track premiums and payments
   - Calculate outstanding balances
   - Policy status management

3. **Payment Processing**
   - Record payments
   - Multiple payment methods
   - Automatic receipt generation
   - Payment history tracking

4. **Reports**
   - Daily cash statements
   - User activity reports
   - Policy reports
   - Payment reports
   - Customer reports
   - Outstanding balance reports
   - Renewal notices

5. **User Management**
   - Create users with roles
   - Permission management
   - Audit logging

6. **Financial Management**
   - Financial periods
   - Period closing
   - Collection tracking

### Document Generation
- **Receipts** - Printable with company branding
- **Renewal Notices** - Professional renewal documents
- **Reports** - Various business reports
- **PDF Export** - All documents exportable to PDF

---

## 🎯 Key Technologies Summary

| Category | Technology | Version |
|----------|-----------|---------|
| **Frontend Framework** | Bootstrap | 5.3.3 |
| **JavaScript Library** | jQuery | 3.6.0 |
| **Data Tables** | DataTables | 1.11.4 |
| **Icons** | Lucide | 0.453.0 |
| **Alerts** | SweetAlert2 | 10.15.7 |
| **Backend Framework** | Express.js | 4.x |
| **Runtime** | Node.js | Latest LTS |
| **Database** | SQLite3 | 5.x |
| **Password Hashing** | bcryptjs | 2.x |
| **Build Tool** | Gulp | 4.0.2 |
| **CSS Preprocessor** | SCSS/SASS | 1.57.1 |

---

## 📝 Development Notes

### Code Organization
- **Frontend**: Component-based structure with page-specific JavaScript
- **Backend**: RESTful API with middleware pattern
- **Database**: SQLite with optimized queries
- **Build**: Gulp-based build pipeline

### Best Practices
- Separation of concerns (frontend/backend)
- RESTful API design
- Error handling on all endpoints
- Input validation
- Audit logging
- Role-based access control
- Responsive design
- Print-friendly documents

---

## 🔄 Version Information

- **Application Version**: 2.0
- **Last Updated**: 2024
- **Company**: Combined Insurance Services (St.Lucia) Ltd.
- **Developer**: Solace-Systems

---

*This documentation provides a comprehensive overview of the full technology stack used in the Combined Insurance Services Management System.*



