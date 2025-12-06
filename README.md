# I&C Insurance Brokers Management System

A complete insurance broker management application built with Node.js/Express backend and Bootstrap 5 admin template frontend.

## Features

- **Customer Management**: Store and manage customer information (name, address, contact, ID, etc.)
- **Policy Management**: Create and manage insurance policies with premium tracking
- **Payment Processing**: Record payments and track payment history
- **Receipt Generation**: Automatic receipt generation for all payments
- **Daily Cash Statements**: Generate daily cash statements for reconciliation
- **User Management**: Create users with role-based access control
- **Role-Based Access**: Four roles - Admin, Supervisor, Cashier, Underwriter

## Technology Stack

### Backend
- Node.js
- Express.js
- SQLite Database
- bcryptjs for password hashing
- Express-session for authentication

### Frontend
- Bootstrap 5 Admin Template (Drezoc)
- jQuery
- DataTables for data management
- SweetAlert2 for notifications
- Lucide Icons

## Installation

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The backend server will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the Admin directory:
```bash
cd Admin
```

2. Install dependencies:
```bash
npm install
```

3. Build and start the development server:
```bash
npx gulp
```

The frontend will be available at `http://localhost:3000`

## Default Login Credentials

- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Admin

## User Roles

1. **Admin**: Full system access, can manage users, customers, policies, and payments
2. **Supervisor**: Can view reports, manage policies, and process payments
3. **Cashier**: Can process payments and view customer/policy information
4. **Underwriter**: Can create and manage policies

## Database Schema

The system uses SQLite with the following tables:
- `users`: System users with roles
- `customers`: Customer information
- `policies`: Insurance policies
- `payments`: Payment records
- `receipts`: Receipt records

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/me` - Get current user

### Customers
- `GET /api/customers` - List all customers
- `GET /api/customers/:id` - Get customer details
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Policies
- `GET /api/policies` - List all policies
- `GET /api/policies/:id` - Get policy details
- `POST /api/policies` - Create policy
- `PUT /api/policies/:id` - Update policy

### Payments
- `GET /api/payments` - List all payments
- `GET /api/payments/policy/:policyId` - Get payments for a policy
- `POST /api/payments` - Record payment

### Receipts
- `GET /api/receipts/:receiptNumber` - Get receipt details

### Reports
- `GET /api/reports/daily-cash-statement?date=YYYY-MM-DD` - Get daily cash statement

### Users
- `GET /api/users` - List all users (Admin/Supervisor only)
- `POST /api/users` - Create user (Admin only)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

## Project Structure

```
Drezoc_v2.0/
├── Admin/                 # Frontend application
│   ├── src/               # Source files
│   │   ├── assets/        # CSS, JS, images
│   │   ├── partials/      # HTML partials
│   │   └── *.html         # Page templates
│   ├── dist/              # Built files (generated)
│   └── package.json       # Frontend dependencies
├── server/                # Backend application
│   ├── server.js          # Main server file
│   ├── database.js        # Database setup
│   └── package.json       # Backend dependencies
└── README.md              # This file
```

## Development Notes

- The frontend uses Gulp for building and browser-sync for live reload
- The backend uses SQLite for simplicity - can be easily migrated to PostgreSQL/MySQL
- Session-based authentication is used for security
- All API calls include credentials for session management

## License

This project is proprietary software for I&C Insurance Brokers.





