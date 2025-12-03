const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const { 
    db, 
    SYSTEM_FUNCTIONS, 
    DEFAULT_PERMISSIONS,
    generateReceiptNumber, 
    generatePolicyNumber,
    hasPermissionAsync,
    logAuditAction
} = require('./database');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.startsWith('file://')) {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'ic-insurance-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
};

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        db.get('SELECT role FROM users WHERE id = ?', [req.session.userId], (err, user) => {
            if (err || !user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (roles.includes(user.role)) {
                return next();
            }
            res.status(403).json({ error: 'Forbidden' });
        });
    };
};

const requireAdmin = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    db.get('SELECT role FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err || !user || user.role !== 'Admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.user = user;
        next();
    });
};

const requirePermission = (permissionId) => {
    return async (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const allowed = await hasPermissionAsync(req.session.userId, permissionId);
        if (allowed) {
            return next();
        }
        res.status(403).json({ error: 'Permission denied' });
    };
};

// ========== AUTHENTICATION ROUTES ==========
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        if (bcrypt.compareSync(password, user.password)) {
            req.session.userId = user.id;
            req.session.userRole = user.role;
            
            // Log successful login
            logAuditAction(user.id, 'LOGIN', 'User', user.id.toString(), { 
                username: user.username, 
                role: user.role 
            }, req.ip);
            
            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    fullName: user.full_name
                }
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

app.post('/api/logout', (req, res) => {
    const userId = req.session.userId;
    
    // Log logout before destroying session
    if (userId) {
        logAuditAction(userId, 'LOGOUT', 'User', userId.toString(), { 
            timestamp: new Date().toISOString() 
        }, req.ip);
    }
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.get('/api/me', requireAuth, (req, res) => {
    db.get('SELECT id, username, email, role, full_name FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        res.json(user);
    });
});

// ========== USER MANAGEMENT ROUTES ==========
app.get('/api/users', requireAuth, requireRole('Admin', 'Supervisor'), (req, res) => {
    db.all('SELECT id, username, email, role, full_name, created_at FROM users ORDER BY created_at DESC', (err, users) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(users);
    });
});

app.post('/api/users', requireAuth, requireRole('Admin'), (req, res) => {
    const { username, email, password, role, fullName } = req.body;
    
    if (!username || !email || !password || !role || !fullName) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.run(`INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)`,
        [username, email, hashedPassword, role, fullName],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Username or email already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            
            logAuditAction(req.session.userId, 'CREATE_USER', 'User', this.lastID.toString(), { username, email, role, fullName }, req.ip);
            res.json({ id: this.lastID, username, email, role, fullName });
        });
});

app.put('/api/users/:id', requireAuth, requireRole('Admin'), (req, res) => {
    const { username, email, role, fullName, password } = req.body;
    const userId = req.params.id;
    
    let query = 'UPDATE users SET username = ?, email = ?, role = ?, full_name = ?';
    let params = [username, email, role, fullName];
    
    if (password) {
        query += ', password = ?';
        params.push(bcrypt.hashSync(password, 10));
    }
    
    query += ' WHERE id = ?';
    params.push(userId);
    
    db.run(query, params, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        logAuditAction(req.session.userId, 'UPDATE_USER', 'User', userId, { username, email, role, fullName }, req.ip);
        res.json({ success: true });
    });
});

app.delete('/api/users/:id', requireAuth, requireRole('Admin'), (req, res) => {
    const userId = req.params.id;
    
    // Prevent deleting yourself
    if (parseInt(userId) === req.session.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Prevent deleting the default admin (id=1)
    if (parseInt(userId) === 1) {
        return res.status(400).json({ error: 'Cannot delete the default admin account' });
    }
    
    // Check if this is the last admin
    db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['Admin'], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        db.get('SELECT role FROM users WHERE id = ?', [userId], (err, user) => {
            if (err || !user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            if (user.role === 'Admin' && row.count <= 1) {
                return res.status(400).json({ error: 'Cannot delete the last admin account' });
            }
            
            db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                logAuditAction(req.session.userId, 'DELETE_USER', 'User', userId, { deleted_user_id: userId }, req.ip);
                res.json({ success: true });
            });
        });
    });
});

// ========== CUSTOMER ROUTES ==========
app.get('/api/customers', requireAuth, (req, res) => {
    db.all('SELECT * FROM customers ORDER BY created_at DESC', (err, customers) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(customers);
    });
});

app.get('/api/customers/:id', requireAuth, (req, res) => {
    db.get('SELECT * FROM customers WHERE id = ?', [req.params.id], (err, customer) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    });
});

app.post('/api/customers', requireAuth, (req, res) => {
    const { firstName, middleName, lastName, address, contactNumber, email, sex, idNumber } = req.body;
    
    if (!firstName || !lastName || !address || !contactNumber || !email || !idNumber) {
        return res.status(400).json({ error: 'Required fields missing' });
    }
    
    db.run(`INSERT INTO customers (first_name, middle_name, last_name, address, contact_number, email, sex, id_number) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [firstName, middleName || null, lastName, address, contactNumber, email, sex || null, idNumber],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'ID number already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            
            const customerName = `${firstName} ${middleName || ''} ${lastName}`.trim();
            logAuditAction(req.session.userId, 'CREATE_CUSTOMER', 'Customer', this.lastID.toString(), { customerName, idNumber, email }, req.ip);
            res.json({ id: this.lastID, success: true });
        });
});

app.put('/api/customers/:id', requireAuth, (req, res) => {
    const { firstName, middleName, lastName, address, contactNumber, email, sex, idNumber } = req.body;
    
    db.run(`UPDATE customers SET first_name = ?, middle_name = ?, last_name = ?, address = ?, 
            contact_number = ?, email = ?, sex = ?, id_number = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
        [firstName, middleName || null, lastName, address, contactNumber, email, sex || null, idNumber, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            const customerName = `${firstName} ${middleName || ''} ${lastName}`.trim();
            logAuditAction(req.session.userId, 'UPDATE_CUSTOMER', 'Customer', req.params.id, { customerName, idNumber }, req.ip);
            res.json({ success: true });
        });
});

app.delete('/api/customers/:id', requireAuth, requireRole('Admin', 'Supervisor'), (req, res) => {
    db.get('SELECT first_name, last_name, id_number FROM customers WHERE id = ?', [req.params.id], (err, customer) => {
        if (err || !customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        db.run('DELETE FROM customers WHERE id = ?', [req.params.id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            logAuditAction(req.session.userId, 'DELETE_CUSTOMER', 'Customer', req.params.id, { 
                customerName: `${customer.first_name} ${customer.last_name}`,
                idNumber: customer.id_number 
            }, req.ip);
            res.json({ success: true });
        });
    });
});

// ========== POLICY ROUTES ==========
app.get('/api/policies', requireAuth, (req, res) => {
    const query = `
        SELECT p.*, 
               c.first_name || ' ' || COALESCE(c.middle_name || ' ', '') || c.last_name as customer_name,
               c.email as customer_email,
               c.contact_number as customer_contact
        FROM policies p
        JOIN customers c ON p.customer_id = c.id
        ORDER BY p.created_at DESC
    `;
    
    db.all(query, (err, policies) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(policies);
    });
});

app.get('/api/policies/:id', requireAuth, (req, res) => {
    const query = `
        SELECT p.*, 
               c.first_name || ' ' || COALESCE(c.middle_name || ' ', '') || c.last_name as customer_name,
               c.first_name, c.middle_name, c.last_name, c.address, c.email, c.contact_number, c.sex, c.id_number
        FROM policies p
        JOIN customers c ON p.customer_id = c.id
        WHERE p.id = ?
    `;
    
    db.get(query, [req.params.id], (err, policy) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        res.json(policy);
    });
});

app.post('/api/policies', requireAuth, requireRole('Admin', 'Underwriter', 'Supervisor'), (req, res) => {
    const { customerId, totalPremiumDue, policyNumber, coverageType, coverageStartDate, coverageEndDate } = req.body;
    
    if (!customerId || !totalPremiumDue) {
        return res.status(400).json({ error: 'Customer ID and total premium are required' });
    }
    
    if (!coverageType || !coverageStartDate || !coverageEndDate) {
        return res.status(400).json({ error: 'Coverage type and dates are required' });
    }
    
    const polNumber = policyNumber || generatePolicyNumber();
    const outstandingBalance = totalPremiumDue;
    
    db.run(`INSERT INTO policies (policy_number, customer_id, coverage_type, coverage_start_date, coverage_end_date, total_premium_due, outstanding_balance, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [polNumber, customerId, coverageType, coverageStartDate, coverageEndDate, totalPremiumDue, outstandingBalance, req.session.userId],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Policy number already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            
            const policyId = this.lastID;
            // Get customer name for audit log
            db.get('SELECT first_name, last_name FROM customers WHERE id = ?', [customerId], (err, customer) => {
                const customerName = customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown';
                logAuditAction(req.session.userId, 'CREATE_POLICY', 'Policy', policyId.toString(), { 
                    policyNumber: polNumber, 
                    customerId, 
                    customerName,
                    coverageType,
                    coverageStartDate,
                    coverageEndDate,
                    totalPremiumDue 
                }, req.ip);
            });
            
            res.json({ id: policyId, policyNumber: polNumber, success: true });
        });
});

app.put('/api/policies/:id', requireAuth, requireRole('Admin', 'Underwriter', 'Supervisor'), (req, res) => {
    const { totalPremiumDue } = req.body;
    
    db.get('SELECT * FROM policies WHERE id = ?', [req.params.id], (err, policy) => {
        if (err || !policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        
        const newOutstanding = totalPremiumDue - policy.amount_paid;
        
        db.run(`UPDATE policies SET total_premium_due = ?, outstanding_balance = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?`,
            [totalPremiumDue, newOutstanding, req.params.id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                logAuditAction(req.session.userId, 'UPDATE_POLICY', 'Policy', req.params.id, { 
                    policyNumber: policy.policy_number,
                    oldPremium: policy.total_premium_due,
                    newPremium: totalPremiumDue 
                }, req.ip);
                res.json({ success: true });
            });
    });
});

// ========== PAYMENT ROUTES ==========
app.get('/api/payments', requireAuth, (req, res) => {
    const query = `
        SELECT py.*, 
               p.policy_number,
               c.first_name || ' ' || COALESCE(c.middle_name || ' ', '') || c.last_name as customer_name,
               u.full_name as received_by_name
        FROM payments py
        JOIN policies p ON py.policy_id = p.id
        JOIN customers c ON p.customer_id = c.id
        LEFT JOIN users u ON py.received_by = u.id
        ORDER BY py.payment_date DESC
    `;
    
    db.all(query, (err, payments) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(payments);
    });
});

app.get('/api/payments/policy/:policyId', requireAuth, (req, res) => {
    const query = `
        SELECT py.*, 
               p.policy_number,
               u.full_name as received_by_name
        FROM payments py
        JOIN policies p ON py.policy_id = p.id
        LEFT JOIN users u ON py.received_by = u.id
        WHERE py.policy_id = ?
        ORDER BY py.payment_date DESC
    `;
    
    db.all(query, [req.params.policyId], (err, payments) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(payments);
    });
});

app.post('/api/payments', requireAuth, requireRole('Admin', 'Cashier', 'Supervisor'), (req, res) => {
    const { policyId, amount, paymentMethod, paymentMethods, notes } = req.body;
    
    if (!policyId || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Policy ID and valid amount are required' });
    }
    
    // Handle multiple payment methods (can be array or single value)
    let methodString = 'Cash';
    if (paymentMethods && Array.isArray(paymentMethods) && paymentMethods.length > 0) {
        methodString = paymentMethods.join(', ');
    } else if (paymentMethod) {
        methodString = paymentMethod;
    }
    
    db.get('SELECT p.*, c.first_name, c.last_name FROM policies p JOIN customers c ON p.customer_id = c.id WHERE p.id = ?', [policyId], (err, policy) => {
        if (err || !policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        
        if (amount > policy.outstanding_balance) {
            return res.status(400).json({ error: 'Payment amount exceeds outstanding balance' });
        }
        
        const receiptNumber = generateReceiptNumber();
        const newAmountPaid = policy.amount_paid + amount;
        const newOutstanding = policy.outstanding_balance - amount;
        const customerName = `${policy.first_name} ${policy.last_name}`;
        
        db.run(`INSERT INTO payments (policy_id, amount, payment_method, receipt_number, received_by, notes) 
                VALUES (?, ?, ?, ?, ?, ?)`,
            [policyId, amount, methodString, receiptNumber, req.session.userId, notes || null],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                const paymentId = this.lastID;
                
                db.run(`UPDATE policies SET amount_paid = ?, outstanding_balance = ?, updated_at = CURRENT_TIMESTAMP 
                        WHERE id = ?`,
                    [newAmountPaid, newOutstanding, policyId],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }
                        
                        db.run(`INSERT INTO receipts (receipt_number, payment_id, policy_id, customer_id, amount, payment_date, generated_by) 
                                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
                            [receiptNumber, paymentId, policyId, policy.customer_id, amount, req.session.userId],
                            (err) => {
                                if (err) {
                                    console.error('Error creating receipt:', err);
                                }
                            });
                        
                        // Log audit action
                        logAuditAction(req.session.userId, 'RECEIVE_PAYMENT', 'Payment', paymentId.toString(), { 
                            policyNumber: policy.policy_number,
                            customerName,
                            amount,
                            paymentMethod: methodString,
                            receiptNumber,
                            previousOutstanding: policy.outstanding_balance,
                            newOutstanding
                        }, req.ip);
                        
                        res.json({ 
                            id: paymentId, 
                            receiptNumber, 
                            success: true,
                            outstandingBalance: newOutstanding
                        });
                    });
            });
    });
});

// ========== RECEIPT ROUTES ==========
app.get('/api/receipts/:receiptNumber', requireAuth, (req, res) => {
    const query = `
        SELECT r.*,
               p.policy_number, p.coverage_type, p.coverage_start_date, p.coverage_end_date,
               p.total_premium_due, p.amount_paid as amount_paid_before, p.outstanding_balance, p.status as policy_status,
               c.first_name || ' ' || COALESCE(c.middle_name || ' ', '') || c.last_name as customer_name,
               c.address as customer_address, c.email as customer_email, 
               c.contact_number as customer_contact, c.id_number as customer_id_number,
               u.full_name as generated_by_name,
               pay.payment_method
        FROM receipts r
        JOIN policies p ON r.policy_id = p.id
        JOIN customers c ON r.customer_id = c.id
        LEFT JOIN users u ON r.generated_by = u.id
        LEFT JOIN payments pay ON r.payment_id = pay.id
        WHERE r.receipt_number = ?
    `;
    
    db.get(query, [req.params.receiptNumber], (err, receipt) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }
        res.json(receipt);
    });
});

// ========== DAILY CASH STATEMENT ROUTES ==========
app.get('/api/reports/daily-cash-statement', requireAuth, requireRole('Admin', 'Supervisor', 'Cashier'), (req, res) => {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const query = `
        SELECT py.*,
               p.policy_number,
               c.first_name || ' ' || COALESCE(c.middle_name || ' ', '') || c.last_name as customer_name,
               u.full_name as received_by_name
        FROM payments py
        JOIN policies p ON py.policy_id = p.id
        JOIN customers c ON p.customer_id = c.id
        LEFT JOIN users u ON py.received_by = u.id
        WHERE DATE(py.payment_date) = ?
        ORDER BY py.payment_date ASC
    `;
    
    db.all(query, [targetDate], (err, payments) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const total = payments.reduce((sum, p) => sum + p.amount, 0);
        
        res.json({
            date: targetDate,
            payments,
            total,
            count: payments.length
        });
    });
});

// ========== DASHBOARD STATS ==========
app.get('/api/dashboard/stats', requireAuth, (req, res) => {
    const stats = {};
    
    db.get('SELECT COUNT(*) as count FROM customers', (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totalCustomers = row.count;
        
        db.get('SELECT COUNT(*) as count FROM policies WHERE status = ?', ['Active'], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.activePolicies = row.count;
            
            db.get('SELECT SUM(outstanding_balance) as total FROM policies', (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                stats.totalOutstanding = row.total || 0;
                
                db.get(`SELECT SUM(amount) as total FROM payments 
                        WHERE DATE(payment_date) = DATE('now')`, (err, row) => {
                    if (err) return res.status(500).json({ error: err.message });
                    stats.todayPayments = row.total || 0;
                    
                    res.json(stats);
                });
            });
        });
    });
});

// ========== ADMIN ROUTES ==========

// Get system functions
app.get('/api/admin/functions', requireAuth, requireAdmin, (req, res) => {
    res.json(SYSTEM_FUNCTIONS);
});

// Get all role permissions
app.get('/api/admin/permissions', requireAuth, requireAdmin, (req, res) => {
    db.all('SELECT * FROM role_permissions', (err, permissions) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(permissions.map(p => ({
            ...p,
            permissions: JSON.parse(p.permissions || '[]')
        })));
    });
});

// Update role permissions
app.post('/api/admin/permissions', requireAuth, requireAdmin, (req, res) => {
    const { role, permissions } = req.body;
    
    if (role === 'Admin') {
        return res.status(400).json({ error: 'Cannot modify Admin permissions' });
    }
    
    db.run(`INSERT OR REPLACE INTO role_permissions (role, permissions, updated_at, updated_by) 
            VALUES (?, ?, CURRENT_TIMESTAMP, ?)`,
        [role, JSON.stringify(permissions), req.session.userId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            logAuditAction(req.session.userId, 'UPDATE_PERMISSIONS', 'RolePermission', role, { permissions }, req.ip);
            res.json({ success: true });
        });
});

// Get all financial periods
app.get('/api/admin/periods', requireAuth, (req, res) => {
    db.all('SELECT * FROM financial_periods ORDER BY start_date DESC', (err, periods) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(periods);
    });
});

// Get current period statistics
app.get('/api/admin/period-stats', requireAuth, (req, res) => {
    db.get('SELECT * FROM financial_periods WHERE status = ?', ['Open'], (err, period) => {
        if (err || !period) {
            return res.json({ payment_count: 0, policy_count: 0, total_collections: 0 });
        }
        
        const stats = { payment_count: 0, policy_count: 0, total_collections: 0 };
        
        db.get(`SELECT COUNT(*) as count, SUM(amount) as total FROM payments 
                WHERE DATE(created_at) BETWEEN ? AND ?`,
            [period.start_date, period.end_date],
            (err, row) => {
                if (!err && row) {
                    stats.payment_count = row.count || 0;
                    stats.total_collections = row.total || 0;
                }
                
                db.get(`SELECT COUNT(*) as count FROM policies 
                        WHERE DATE(created_at) BETWEEN ? AND ?`,
                    [period.start_date, period.end_date],
                    (err, row) => {
                        if (!err && row) {
                            stats.policy_count = row.count || 0;
                        }
                        res.json(stats);
                    });
            });
    });
});

// Create new financial period
app.post('/api/admin/periods', requireAuth, requireAdmin, (req, res) => {
    const { period_name, start_date, end_date } = req.body;
    
    db.run(`INSERT INTO financial_periods (period_name, start_date, end_date, status) 
            VALUES (?, ?, ?, ?)`,
        [period_name, start_date, end_date, 'Open'],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            logAuditAction(req.session.userId, 'CREATE_PERIOD', 'FinancialPeriod', this.lastID.toString(), { period_name }, req.ip);
            res.json({ success: true, id: this.lastID });
        });
});

// Close current period
app.post('/api/admin/periods/close-current', requireAuth, requireAdmin, (req, res) => {
    db.get('SELECT * FROM financial_periods WHERE status = ?', ['Open'], (err, period) => {
        if (err || !period) {
            return res.status(404).json({ error: 'No open period found' });
        }
        
        db.get(`SELECT SUM(amount) as total FROM payments 
                WHERE DATE(created_at) BETWEEN ? AND ?`,
            [period.start_date, period.end_date],
            (err, paymentRow) => {
                const totalCollections = paymentRow?.total || 0;
                
                db.get(`SELECT COUNT(*) as count FROM policies 
                        WHERE DATE(created_at) BETWEEN ? AND ?`,
                    [period.start_date, period.end_date],
                    (err, policyRow) => {
                        const totalPolicies = policyRow?.count || 0;
                        
                        db.run(`UPDATE financial_periods 
                                SET status = ?, total_collections = ?, total_policies_created = ?, 
                                    closed_by = ?, closed_at = CURRENT_TIMESTAMP 
                                WHERE id = ?`,
                            ['Closed', totalCollections, totalPolicies, req.session.userId, period.id],
                            function(err) {
                                if (err) {
                                    return res.status(500).json({ error: err.message });
                                }
                                
                                logAuditAction(req.session.userId, 'CLOSE_PERIOD', 'FinancialPeriod', period.id.toString(), { total_collections: totalCollections }, req.ip);
                                res.json({ success: true });
                            });
                    });
            });
    });
});

// Close specific period
app.post('/api/admin/periods/:id/close', requireAuth, requireAdmin, (req, res) => {
    const periodId = req.params.id;
    
    db.get('SELECT * FROM financial_periods WHERE id = ?', [periodId], (err, period) => {
        if (err || !period) {
            return res.status(404).json({ error: 'Period not found' });
        }
        
        if (period.status === 'Closed') {
            return res.status(400).json({ error: 'Period is already closed' });
        }
        
        db.get(`SELECT SUM(amount) as total FROM payments 
                WHERE DATE(created_at) BETWEEN ? AND ?`,
            [period.start_date, period.end_date],
            (err, paymentRow) => {
                const totalCollections = paymentRow?.total || 0;
                
                db.get(`SELECT COUNT(*) as count FROM policies 
                        WHERE DATE(created_at) BETWEEN ? AND ?`,
                    [period.start_date, period.end_date],
                    (err, policyRow) => {
                        const totalPolicies = policyRow?.count || 0;
                        
                        db.run(`UPDATE financial_periods 
                                SET status = ?, total_collections = ?, total_policies_created = ?, 
                                    closed_by = ?, closed_at = CURRENT_TIMESTAMP 
                                WHERE id = ?`,
                            ['Closed', totalCollections, totalPolicies, req.session.userId, periodId],
                            function(err) {
                                if (err) {
                                    return res.status(500).json({ error: err.message });
                                }
                                
                                logAuditAction(req.session.userId, 'CLOSE_PERIOD', 'FinancialPeriod', periodId.toString(), { total_collections: totalCollections }, req.ip);
                                res.json({ success: true });
                            });
                    });
            });
    });
});

// Get audit log
app.get('/api/admin/audit-log', requireAuth, requireAdmin, (req, res) => {
    const { date } = req.query;
    let query = `
        SELECT al.*, u.full_name as user_name
        FROM audit_log al
        LEFT JOIN users u ON al.user_id = u.id
    `;
    let params = [];
    
    if (date) {
        query += ' WHERE DATE(al.created_at) = ?';
        params.push(date);
    }
    
    query += ' ORDER BY al.created_at DESC LIMIT 500';
    
    db.all(query, params, (err, logs) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(logs.map(log => ({
            ...log,
            details: log.details ? JSON.parse(log.details) : null
        })));
    });
});

// Override arrears for customer
app.post('/api/admin/override-arrears', requireAuth, async (req, res) => {
    const allowed = await hasPermissionAsync(req.session.userId, 'override_outstanding_balance');
    if (!allowed) {
        return res.status(403).json({ error: 'Permission denied' });
    }
    
    const { customer_id, reason } = req.body;
    
    db.run(`UPDATE customers SET arrears_override = 1, arrears_override_by = ?, arrears_override_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
        [req.session.userId, customer_id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            logAuditAction(req.session.userId, 'OVERRIDE_ARREARS', 'Customer', customer_id, { reason }, req.ip);
            res.json({ success: true });
        });
});

// Reset system
app.post('/api/admin/reset-system', requireAuth, requireAdmin, async (req, res) => {
    const allowed = await hasPermissionAsync(req.session.userId, 'reset_system');
    if (!allowed) {
        return res.status(403).json({ error: 'Permission denied' });
    }
    
    db.serialize(() => {
        db.run('DELETE FROM receipts');
        db.run('DELETE FROM payments');
        db.run('DELETE FROM policies');
        db.run('DELETE FROM customers');
        db.run('DELETE FROM financial_periods');
        
        // Create default financial period
        const now = new Date();
        const startOfYear = `${now.getFullYear()}-01-01`;
        const endOfYear = `${now.getFullYear()}-12-31`;
        
        db.run(`INSERT INTO financial_periods (period_name, start_date, end_date, status) 
                VALUES (?, ?, ?, ?)`,
            [`FY ${now.getFullYear()}`, startOfYear, endOfYear, 'Open'],
            (err) => {
                if (err) {
                    console.error('Error creating default period:', err);
                }
            });
        
        logAuditAction(req.session.userId, 'RESET_SYSTEM', 'System', null, { timestamp: Date.now() }, req.ip);
        res.json({ success: true });
    });
});

// Generate user report with detailed activity
app.get('/api/admin/reports/users', requireAuth, async (req, res) => {
    const allowed = await hasPermissionAsync(req.session.userId, 'generate_user_report');
    if (!allowed) {
        return res.status(403).json({ error: 'Permission denied' });
    }
    
    const { userId, startDate, endDate } = req.query;
    
    // If specific user requested, get detailed activity
    if (userId) {
        const query = `
            SELECT al.*, u.full_name as user_name, u.username
            FROM audit_log al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.user_id = ?
            ${startDate && endDate ? 'AND DATE(al.created_at) BETWEEN ? AND ?' : ''}
            ORDER BY al.created_at DESC
            LIMIT 1000
        `;
        
        const params = startDate && endDate ? [userId, startDate, endDate] : [userId];
        
        db.all(query, params, (err, logs) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Get user info
            db.get('SELECT id, username, full_name, email, role, created_at FROM users WHERE id = ?', [userId], (err, user) => {
                if (err || !user) {
                    return res.status(404).json({ error: 'User not found' });
                }
                
                res.json({
                    user,
                    activities: logs.map(log => ({
                        ...log,
                        details: log.details ? JSON.parse(log.details) : null
                    })),
                    totalActions: logs.length
                });
            });
        });
    } else {
        // Get all users with activity counts (with optional date filtering)
        let dateFilter = '';
        if (startDate && endDate) {
            dateFilter = `AND DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'`;
        }
        
        const query = `
            SELECT u.id, u.username, u.full_name, u.email, u.role, u.created_at,
                   (SELECT COUNT(*) FROM audit_log WHERE user_id = u.id ${dateFilter}) as total_actions,
                   (SELECT COUNT(*) FROM audit_log WHERE user_id = u.id AND action = 'CREATE_CUSTOMER' ${dateFilter}) as customers_created,
                   (SELECT COUNT(*) FROM audit_log WHERE user_id = u.id AND action = 'CREATE_POLICY' ${dateFilter}) as policies_created,
                   (SELECT COUNT(*) FROM audit_log WHERE user_id = u.id AND action = 'RECEIVE_PAYMENT' ${dateFilter}) as payments_received,
                   (SELECT MAX(created_at) FROM audit_log WHERE user_id = u.id ${dateFilter}) as last_activity
            FROM users u
            ORDER BY u.created_at DESC
        `;
        
        db.all(query, (err, users) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(users);
        });
    }
});

// Generate cash statement
app.get('/api/admin/reports/cash-statement', requireAuth, async (req, res) => {
    const allowed = await hasPermissionAsync(req.session.userId, 'generate_cash_statements');
    if (!allowed) {
        return res.status(403).json({ error: 'Permission denied' });
    }
    
    const { startDate, endDate } = req.query;
    
    const query = `
        SELECT py.payment_date as date, py.receipt_number, p.policy_number,
               c.first_name || ' ' || COALESCE(c.middle_name || ' ', '') || c.last_name as customer_name,
               py.amount, py.payment_method, u.full_name as received_by
        FROM payments py
        JOIN policies p ON py.policy_id = p.id
        JOIN customers c ON p.customer_id = c.id
        LEFT JOIN users u ON py.received_by = u.id
        WHERE DATE(py.payment_date) BETWEEN ? AND ?
        ORDER BY py.payment_date ASC
    `;
    
    db.all(query, [startDate, endDate], (err, payments) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const total = payments.reduce((sum, p) => sum + p.amount, 0);
        
        res.json({
            startDate,
            endDate,
            total,
            summary: `Cash Statement from ${startDate} to ${endDate}`,
            payments
        });
    });
});

// Generate policy report with date filtering
app.get('/api/admin/reports/policies', requireAuth, async (req, res) => {
    const allowed = await hasPermissionAsync(req.session.userId, 'generate_cash_statements');
    if (!allowed) {
        return res.status(403).json({ error: 'Permission denied' });
    }
    
    const { startDate, endDate } = req.query;
    
    let query = `
        SELECT p.policy_number, 
               c.first_name || ' ' || COALESCE(c.middle_name || ' ', '') || c.last_name as customer_name,
               c.id_number as customer_id_number,
               p.coverage_type, p.coverage_start_date, p.coverage_end_date,
               p.total_premium_due, p.amount_paid, p.outstanding_balance, p.status, p.created_at
        FROM policies p
        JOIN customers c ON p.customer_id = c.id
    `;
    
    const params = [];
    if (startDate && endDate) {
        query += ' WHERE DATE(p.created_at) BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    db.all(query, params, (err, policies) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(policies);
    });
});

// Generate payment report with date filtering
app.get('/api/admin/reports/payments', requireAuth, async (req, res) => {
    const allowed = await hasPermissionAsync(req.session.userId, 'generate_cash_statements');
    if (!allowed) {
        return res.status(403).json({ error: 'Permission denied' });
    }
    
    const { startDate, endDate } = req.query;
    
    let query = `
        SELECT py.payment_date as date, py.receipt_number, p.policy_number,
               c.first_name || ' ' || COALESCE(c.middle_name || ' ', '') || c.last_name as customer_name,
               py.amount, py.payment_method, u.full_name as received_by
        FROM payments py
        JOIN policies p ON py.policy_id = p.id
        JOIN customers c ON p.customer_id = c.id
        LEFT JOIN users u ON py.received_by = u.id
    `;
    
    const params = [];
    if (startDate && endDate) {
        query += ' WHERE DATE(py.payment_date) BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }
    
    query += ' ORDER BY py.payment_date DESC';
    
    db.all(query, params, (err, payments) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const total = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        
        res.json({
            startDate,
            endDate,
            total,
            payments
        });
    });
});

// Generate customer report with filters
app.get('/api/admin/reports/customers', requireAuth, async (req, res) => {
    const allowed = await hasPermissionAsync(req.session.userId, 'generate_cash_statements');
    if (!allowed) {
        return res.status(403).json({ error: 'Permission denied' });
    }
    
    const { startDate, endDate, filter } = req.query;
    
    let query = `
        SELECT c.id, c.first_name, c.last_name, c.middle_name, c.id_number,
               c.contact_number, c.email, c.address, c.created_at,
               COUNT(DISTINCT p.id) as policy_count,
               COALESCE(SUM(p.outstanding_balance), 0) as total_outstanding
        FROM customers c
        LEFT JOIN policies p ON c.id = p.customer_id
    `;
    
    const params = [];
    const conditions = [];
    
    if (startDate && endDate) {
        conditions.push('DATE(c.created_at) BETWEEN ? AND ?');
        params.push(startDate, endDate);
    }
    
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' GROUP BY c.id';
    
    if (filter === 'arrears') {
        query += ' HAVING total_outstanding > 0';
    }
    
    query += ' ORDER BY c.last_name, c.first_name';
    
    db.all(query, params, (err, customers) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(customers);
    });
});

// Get user permissions for current user
app.get('/api/user/permissions', requireAuth, (req, res) => {
    db.get('SELECT role FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        // Admin has all permissions
        if (user.role === 'Admin') {
            return res.json({
                role: user.role,
                permissions: Object.values(SYSTEM_FUNCTIONS).map(f => f.id)
            });
        }
        
        db.get('SELECT permissions FROM role_permissions WHERE role = ?', [user.role], (err, row) => {
            res.json({
                role: user.role,
                permissions: row ? JSON.parse(row.permissions || '[]') : []
            });
        });
    });
});

// ========== DATA EXPORT ROUTES ==========

app.get('/api/admin/export/customers', requireAuth, requireAdmin, (req, res) => {
    db.all('SELECT * FROM customers ORDER BY created_at DESC', (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

app.get('/api/admin/export/policies', requireAuth, requireAdmin, (req, res) => {
    const query = `
        SELECT p.*, 
               c.first_name || ' ' || COALESCE(c.middle_name || ' ', '') || c.last_name as customer_name,
               c.id_number as customer_id_number
        FROM policies p
        JOIN customers c ON p.customer_id = c.id
        ORDER BY p.created_at DESC
    `;
    db.all(query, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

app.get('/api/admin/export/payments', requireAuth, requireAdmin, (req, res) => {
    const query = `
        SELECT py.*, 
               p.policy_number,
               c.first_name || ' ' || COALESCE(c.middle_name || ' ', '') || c.last_name as customer_name,
               u.full_name as received_by_name
        FROM payments py
        JOIN policies p ON py.policy_id = p.id
        JOIN customers c ON p.customer_id = c.id
        LEFT JOIN users u ON py.received_by = u.id
        ORDER BY py.payment_date DESC
    `;
    db.all(query, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

app.get('/api/admin/export/receipts', requireAuth, requireAdmin, (req, res) => {
    const query = `
        SELECT r.*,
               p.policy_number,
               c.first_name || ' ' || COALESCE(c.middle_name || ' ', '') || c.last_name as customer_name,
               u.full_name as generated_by_name
        FROM receipts r
        JOIN policies p ON r.policy_id = p.id
        JOIN customers c ON r.customer_id = c.id
        LEFT JOIN users u ON r.generated_by = u.id
        ORDER BY r.generated_at DESC
    `;
    db.all(query, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

app.get('/api/admin/export/users', requireAuth, requireAdmin, (req, res) => {
    db.all('SELECT id, username, email, role, full_name, created_at FROM users ORDER BY created_at DESC', (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

app.get('/api/admin/export/audit', requireAuth, requireAdmin, (req, res) => {
    const query = `
        SELECT al.*, u.full_name as user_name
        FROM audit_log al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 10000
    `;
    db.all(query, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(data);
    });
});

// ========== DATA IMPORT ROUTES ==========

app.post('/api/admin/import/customers', requireAuth, requireAdmin, (req, res) => {
    const { records } = req.body;
    
    if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }
    
    let imported = 0;
    let skipped = 0;
    
    const stmt = db.prepare(`INSERT OR IGNORE INTO customers 
        (first_name, middle_name, last_name, address, contact_number, email, sex, id_number) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    
    records.forEach(record => {
        // Map various possible column names
        const firstName = record.first_name || record.firstName || record['First Name'] || '';
        const middleName = record.middle_name || record.middleName || record['Middle Name'] || '';
        const lastName = record.last_name || record.lastName || record['Last Name'] || '';
        const address = record.address || record.Address || '';
        const contact = record.contact_number || record.contactNumber || record['Contact Number'] || record.phone || '';
        const email = record.email || record.Email || '';
        const sex = record.sex || record.Sex || record.gender || '';
        const idNumber = record.id_number || record.idNumber || record['ID Number'] || record['Customer ID'] || '';
        
        if (firstName && lastName && idNumber) {
            stmt.run([firstName, middleName, lastName, address, contact, email, sex, idNumber], function(err) {
                if (err) {
                    skipped++;
                } else if (this.changes > 0) {
                    imported++;
                } else {
                    skipped++;
                }
            });
        } else {
            skipped++;
        }
    });
    
    stmt.finalize(() => {
        logAuditAction(req.session.userId, 'IMPORT_DATA', 'Customer', null, { imported, skipped }, req.ip);
        res.json({ imported, skipped });
    });
});

app.post('/api/admin/import/policies', requireAuth, requireAdmin, (req, res) => {
    const { records } = req.body;
    
    if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }
    
    let imported = 0;
    let skipped = 0;
    let processed = 0;
    
    records.forEach(record => {
        const policyNumber = record.policy_number || record.policyNumber || record['Policy Number'] || generatePolicyNumber();
        const customerId = record.customer_id || record.customerId || '';
        const totalPremium = parseFloat(record.total_premium_due || record.totalPremiumDue || record['Total Premium'] || 0);
        const amountPaid = parseFloat(record.amount_paid || record.amountPaid || record['Amount Paid'] || 0);
        const outstanding = totalPremium - amountPaid;
        
        if (customerId && totalPremium > 0) {
            db.run(`INSERT OR IGNORE INTO policies 
                (policy_number, customer_id, total_premium_due, amount_paid, outstanding_balance, created_by) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [policyNumber, customerId, totalPremium, amountPaid, outstanding, req.session.userId],
                function(err) {
                    processed++;
                    if (err) {
                        skipped++;
                    } else if (this.changes > 0) {
                        imported++;
                    } else {
                        skipped++;
                    }
                    
                    if (processed === records.length) {
                        logAuditAction(req.session.userId, 'IMPORT_DATA', 'Policy', null, { imported, skipped }, req.ip);
                        res.json({ imported, skipped });
                    }
                });
        } else {
            processed++;
            skipped++;
            if (processed === records.length) {
                logAuditAction(req.session.userId, 'IMPORT_DATA', 'Policy', null, { imported, skipped }, req.ip);
                res.json({ imported, skipped });
            }
        }
    });
    
    if (records.length === 0) {
        res.json({ imported: 0, skipped: 0 });
    }
});

app.post('/api/admin/import/payments', requireAuth, requireAdmin, (req, res) => {
    const { records } = req.body;
    
    if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }
    
    let imported = 0;
    let skipped = 0;
    let processed = 0;
    
    records.forEach(record => {
        const policyId = record.policy_id || record.policyId || '';
        const amount = parseFloat(record.amount || record.Amount || 0);
        const paymentMethod = record.payment_method || record.paymentMethod || record['Payment Method'] || 'Cash';
        const receiptNumber = record.receipt_number || record.receiptNumber || generateReceiptNumber();
        
        if (policyId && amount > 0) {
            db.run(`INSERT OR IGNORE INTO payments 
                (policy_id, amount, payment_method, receipt_number, received_by) 
                VALUES (?, ?, ?, ?, ?)`,
                [policyId, amount, paymentMethod, receiptNumber, req.session.userId],
                function(err) {
                    processed++;
                    if (err) {
                        skipped++;
                    } else if (this.changes > 0) {
                        imported++;
                    } else {
                        skipped++;
                    }
                    
                    if (processed === records.length) {
                        logAuditAction(req.session.userId, 'IMPORT_DATA', 'Payment', null, { imported, skipped }, req.ip);
                        res.json({ imported, skipped });
                    }
                });
        } else {
            processed++;
            skipped++;
            if (processed === records.length) {
                logAuditAction(req.session.userId, 'IMPORT_DATA', 'Payment', null, { imported, skipped }, req.ip);
                res.json({ imported, skipped });
            }
        }
    });
    
    if (records.length === 0) {
        res.json({ imported: 0, skipped: 0 });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
