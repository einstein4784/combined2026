const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// SQLite database connection with optimizations for concurrency
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to SQLite database');
        
        // Enable WAL mode for better concurrency (allows multiple readers and one writer)
        db.run('PRAGMA journal_mode = WAL;', (err) => {
            if (err) {
                console.error('Error enabling WAL mode:', err);
            } else {
                console.log('WAL mode enabled for better concurrency');
            }
        });
        
        // Set busy timeout to handle concurrent access (wait up to 5 seconds for locks)
        db.configure('busyTimeout', 5000);
        
        // Optimize for performance
        db.run('PRAGMA synchronous = NORMAL;'); // Balance between safety and speed
        db.run('PRAGMA cache_size = -64000;'); // 64MB cache
        db.run('PRAGMA foreign_keys = ON;'); // Enable foreign key constraints
        db.run('PRAGMA temp_store = MEMORY;'); // Store temp tables in memory
        
        initializeDatabase();
    }
});

// Define all system functions/permissions
const SYSTEM_FUNCTIONS = {
    CREATE_EDIT_CUSTOMER: {
        id: 'create_edit_customer',
        name: 'Create/Edit Customer',
        description: 'Ability to create new customers and edit existing customer information',
        category: 'Customer Management'
    },
    CREATE_EDIT_POLICY: {
        id: 'create_edit_policy',
        name: 'Create/Edit Policy',
        description: 'Ability to create new policies and edit existing policies',
        category: 'Policy Management'
    },
    RECEIVE_PAYMENT: {
        id: 'receive_payment',
        name: 'Receive Payment',
        description: 'Ability to receive and record payments from customers',
        category: 'Payment Processing'
    },
    GENERATE_USER_REPORT: {
        id: 'generate_user_report',
        name: 'Generate User Report',
        description: 'Ability to generate reports about system users',
        category: 'Reporting'
    },
    GENERATE_CASH_STATEMENTS: {
        id: 'generate_cash_statements',
        name: 'Generate Cash Statements',
        description: 'Ability to generate cash statements for any date range',
        category: 'Reporting'
    },
    CREATE_EDIT_DELETE_USER: {
        id: 'create_edit_delete_user',
        name: 'Create/Edit/Delete User',
        description: 'Ability to manage system users (create, edit, and delete)',
        category: 'User Management'
    },
    OVERRIDE_OUTSTANDING_BALANCE: {
        id: 'override_outstanding_balance',
        name: 'Override Outstanding Balance',
        description: 'Ability to override the outstanding balance rule for payments',
        category: 'Payment Processing'
    },
    RESET_SYSTEM: {
        id: 'reset_system',
        name: 'Reset System',
        description: 'Ability to reset the system and delete all records (DANGEROUS)',
        category: 'System Administration'
    },
    CLOSE_PERIOD: {
        id: 'close_period',
        name: 'Close Period',
        description: 'Ability to close a financial period',
        category: 'Financial Management'
    },
    VIEW_DASHBOARD: {
        id: 'view_dashboard',
        name: 'View Dashboard',
        description: 'Ability to view the main dashboard',
        category: 'General'
    },
    MANAGE_PERMISSIONS: {
        id: 'manage_permissions',
        name: 'Manage Permissions',
        description: 'Ability to assign functions to roles',
        category: 'System Administration'
    }
};

// Default permissions for each role
const DEFAULT_PERMISSIONS = {
    Admin: Object.values(SYSTEM_FUNCTIONS).map(f => f.id),
    Supervisor: [
        'create_edit_customer',
        'create_edit_policy',
        'receive_payment',
        'generate_user_report',
        'generate_cash_statements',
        'create_edit_delete_user',
        'override_outstanding_balance',
        'close_period',
        'view_dashboard'
    ],
    Cashier: [
        'receive_payment',
        'generate_cash_statements',
        'view_dashboard'
    ],
    Underwriter: [
        'create_edit_customer',
        'create_edit_policy',
        'view_dashboard'
    ]
};

function initializeDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('Admin', 'Supervisor', 'Cashier', 'Underwriter')),
            full_name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Customers table
        db.run(`CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            middle_name TEXT,
            last_name TEXT NOT NULL,
            address TEXT NOT NULL,
            contact_number TEXT NOT NULL,
            email TEXT NOT NULL,
            sex TEXT CHECK(sex IN ('Male', 'Female', 'Other')),
            id_number TEXT UNIQUE NOT NULL,
            has_arrears INTEGER DEFAULT 0,
            arrears_override INTEGER DEFAULT 0,
            arrears_override_by INTEGER,
            arrears_override_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Policies table
        db.run(`CREATE TABLE IF NOT EXISTS policies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            policy_number TEXT UNIQUE NOT NULL,
            customer_id INTEGER NOT NULL,
            coverage_type TEXT DEFAULT 'Third Party' CHECK(coverage_type IN ('Third Party', 'Fully Comprehensive')),
            coverage_start_date DATE,
            coverage_end_date DATE,
            total_premium_due REAL NOT NULL,
            amount_paid REAL DEFAULT 0,
            outstanding_balance REAL NOT NULL,
            status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Cancelled', 'Expired')),
            financial_period_id INTEGER,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )`);

        // Payments table
        db.run(`CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            policy_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            payment_method TEXT DEFAULT 'Cash',
            receipt_number TEXT UNIQUE NOT NULL,
            received_by INTEGER,
            arrears_override_used INTEGER DEFAULT 0,
            financial_period_id INTEGER,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (policy_id) REFERENCES policies(id),
            FOREIGN KEY (received_by) REFERENCES users(id)
        )`);

        // Receipts table
        db.run(`CREATE TABLE IF NOT EXISTS receipts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            receipt_number TEXT UNIQUE NOT NULL,
            payment_id INTEGER NOT NULL,
            policy_id INTEGER NOT NULL,
            customer_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            payment_date DATETIME NOT NULL,
            generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            generated_by INTEGER,
            FOREIGN KEY (payment_id) REFERENCES payments(id),
            FOREIGN KEY (policy_id) REFERENCES policies(id),
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (generated_by) REFERENCES users(id)
        )`);

        // Role Permissions table
        db.run(`CREATE TABLE IF NOT EXISTS role_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT UNIQUE NOT NULL CHECK(role IN ('Admin', 'Supervisor', 'Cashier', 'Underwriter')),
            permissions TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER,
            FOREIGN KEY (updated_by) REFERENCES users(id)
        )`);

        // Financial Periods table
        db.run(`CREATE TABLE IF NOT EXISTS financial_periods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            period_name TEXT NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            status TEXT DEFAULT 'Open' CHECK(status IN ('Open', 'Closed')),
            total_collections REAL DEFAULT 0,
            total_policies_created INTEGER DEFAULT 0,
            closed_by INTEGER,
            closed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (closed_by) REFERENCES users(id)
        )`);

        // Audit Log table
        db.run(`CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            details TEXT,
            ip_address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        // Create default admin user if not exists
        const defaultPassword = bcrypt.hashSync('admin123', 10);
        db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['Admin'], (err, row) => {
            if (err) {
                console.error('Error checking admin user:', err);
                return;
            }
            if (row.count === 0) {
                db.run(`INSERT INTO users (username, email, password, role, full_name) 
                        VALUES (?, ?, ?, ?, ?)`,
                    ['admin', 'admin@icinsurance.com', defaultPassword, 'Admin', 'System Administrator'],
                    (err) => {
                        if (err) {
                            console.error('Error creating admin user:', err);
                        } else {
                            console.log('Default admin user created: username=admin, password=admin123');
                        }
                    });
            }
        });

        // Initialize default role permissions
        Object.entries(DEFAULT_PERMISSIONS).forEach(([role, permissions]) => {
            db.get('SELECT COUNT(*) as count FROM role_permissions WHERE role = ?', [role], (err, row) => {
                if (err) return;
                if (row.count === 0) {
                    db.run('INSERT INTO role_permissions (role, permissions) VALUES (?, ?)',
                        [role, JSON.stringify(permissions)],
                        (err) => {
                            if (!err) console.log(`Default permissions created for role: ${role}`);
                        });
                }
            });
        });

        // Create default financial period if not exists
        db.get('SELECT COUNT(*) as count FROM financial_periods', (err, row) => {
            if (err) return;
            if (row.count === 0) {
                const now = new Date();
                const startOfYear = `${now.getFullYear()}-01-01`;
                const endOfYear = `${now.getFullYear()}-12-31`;
                db.run(`INSERT INTO financial_periods (period_name, start_date, end_date, status) 
                        VALUES (?, ?, ?, ?)`,
                    [`FY ${now.getFullYear()}`, startOfYear, endOfYear, 'Open'],
                    (err) => {
                        if (!err) console.log('Default financial period created');
                    });
            }
        });
        
        // Create indexes for performance optimization
        console.log('Creating database indexes...');
        
        // Customer indexes
        db.run('CREATE INDEX IF NOT EXISTS idx_customers_id_number ON customers(id_number);');
        db.run('CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);');
        db.run('CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);');
        
        // Policy indexes
        db.run('CREATE INDEX IF NOT EXISTS idx_policies_customer_id ON policies(customer_id);');
        db.run('CREATE INDEX IF NOT EXISTS idx_policies_policy_number ON policies(policy_number);');
        db.run('CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);');
        db.run('CREATE INDEX IF NOT EXISTS idx_policies_coverage_end_date ON policies(coverage_end_date);');
        db.run('CREATE INDEX IF NOT EXISTS idx_policies_created_at ON policies(created_at);');
        db.run('CREATE INDEX IF NOT EXISTS idx_policies_created_by ON policies(created_by);');
        
        // Payment indexes
        db.run('CREATE INDEX IF NOT EXISTS idx_payments_policy_id ON payments(policy_id);');
        db.run('CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON payments(receipt_number);');
        db.run('CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);');
        db.run('CREATE INDEX IF NOT EXISTS idx_payments_received_by ON payments(received_by);');
        db.run('CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);');
        
        // Receipt indexes
        db.run('CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(receipt_number);');
        db.run('CREATE INDEX IF NOT EXISTS idx_receipts_policy_id ON receipts(policy_id);');
        db.run('CREATE INDEX IF NOT EXISTS idx_receipts_customer_id ON receipts(customer_id);');
        db.run('CREATE INDEX IF NOT EXISTS idx_receipts_payment_id ON receipts(payment_id);');
        db.run('CREATE INDEX IF NOT EXISTS idx_receipts_generated_at ON receipts(generated_at);');
        
        // Audit log indexes
        db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);');
        db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);');
        db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);');
        db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entity_type);');
        
        // Financial periods indexes
        db.run('CREATE INDEX IF NOT EXISTS idx_financial_periods_status ON financial_periods(status);');
        db.run('CREATE INDEX IF NOT EXISTS idx_financial_periods_start_date ON financial_periods(start_date);');
        
        console.log('Database indexes created successfully');
    });
}

// Transaction helper function for atomic operations
function runTransaction(callback) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN IMMEDIATE TRANSACTION', (beginErr) => {
                if (beginErr) {
                    return reject(beginErr);
                }
                
                callback(db, (err, result) => {
                    if (err) {
                        db.run('ROLLBACK', (rollbackErr) => {
                            if (rollbackErr) {
                                console.error('Rollback error:', rollbackErr);
                            }
                            reject(err);
                        });
                    } else {
                        db.run('COMMIT', (commitErr) => {
                            if (commitErr) {
                                console.error('Commit error:', commitErr);
                                reject(commitErr);
                            } else {
                                resolve(result);
                            }
                        });
                    }
                });
            });
        });
    });
}

// Helper functions
function generateReceiptNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `RCP-${timestamp}-${random}`;
}

function generatePolicyNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `POL-${timestamp}-${random}`;
}

// Check if user has permission
function hasPermission(userId, permissionId, callback) {
    db.get('SELECT role FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) {
            return callback(false);
        }
        
        // Admin always has all permissions
        if (user.role === 'Admin') {
            return callback(true);
        }
        
        db.get('SELECT permissions FROM role_permissions WHERE role = ?', [user.role], (err, row) => {
            if (err || !row) {
                return callback(false);
            }
            
            const permissions = JSON.parse(row.permissions || '[]');
            callback(permissions.includes(permissionId));
        });
    });
}

// Async version of hasPermission
async function hasPermissionAsync(userId, permissionId) {
    return new Promise((resolve) => {
        hasPermission(userId, permissionId, resolve);
    });
}

// Log audit action
function logAuditAction(userId, action, entityType, entityId, details, ipAddress) {
    db.run(`INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address) 
            VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, action, entityType, entityId, JSON.stringify(details), ipAddress],
        (err) => {
            if (err) console.error('Error logging audit action:', err);
        });
}

module.exports = {
    db,
    SYSTEM_FUNCTIONS,
    DEFAULT_PERMISSIONS,
    generateReceiptNumber,
    generatePolicyNumber,
    hasPermission,
    hasPermissionAsync,
    logAuditAction
};
