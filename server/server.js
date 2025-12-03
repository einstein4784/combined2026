const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const { 
    User, Customer, Policy, Payment, Receipt, 
    RolePermission, SystemSettings, FinancialPeriod, AuditLog,
    SYSTEM_FUNCTIONS, DEFAULT_PERMISSIONS,
    generateReceiptNumber, generatePolicyNumber,
    hasPermission, logAuditAction
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
            callback(null, true); // Allow all origins for development
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
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
};

const requireRole = (...roles) => {
    return async (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        try {
            const user = await User.findById(req.session.userId);
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (roles.includes(user.role)) {
                return next();
            }
            res.status(403).json({ error: 'Forbidden' });
        } catch (error) {
            res.status(401).json({ error: 'Unauthorized' });
        }
    };
};

// ========== AUTHENTICATION ROUTES ==========
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await User.findOne({ 
            $or: [{ username }, { email: username }] 
        });
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        if (bcrypt.compareSync(password, user.password)) {
            req.session.userId = user._id.toString();
            req.session.userRole = user.role;
            res.json({
                success: true,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    fullName: user.full_name
                }
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.get('/api/me', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('username email role full_name');
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        res.json({
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            full_name: user.full_name
        });
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

// ========== USER MANAGEMENT ROUTES ==========
app.get('/api/users', requireAuth, requireRole('Admin', 'Supervisor'), async (req, res) => {
    try {
        const users = await User.find().select('username email role full_name created_at').sort({ created_at: -1 });
        res.json(users.map(u => ({
            id: u._id,
            username: u.username,
            email: u.email,
            role: u.role,
            full_name: u.full_name,
            created_at: u.created_at
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', requireAuth, requireRole('Admin'), async (req, res) => {
    try {
        const { username, email, password, role, fullName } = req.body;
        
        if (!username || !email || !password || !role || !fullName) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        const user = new User({
            username,
            email,
            password: hashedPassword,
            role,
            full_name: fullName
        });
        
        await user.save();
        res.json({ id: user._id, username, email, role, fullName });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/:id', requireAuth, requireRole('Admin'), async (req, res) => {
    try {
        const { username, email, role, fullName, password } = req.body;
        const updateData = { username, email, role, full_name: fullName, updated_at: Date.now() };
        
        if (password) {
            updateData.password = bcrypt.hashSync(password, 10);
        }
        
        await User.findByIdAndUpdate(req.params.id, updateData);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/users/:id', requireAuth, requireRole('Admin'), async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== CUSTOMER ROUTES ==========
app.get('/api/customers', requireAuth, async (req, res) => {
    try {
        const customers = await Customer.find().sort({ created_at: -1 });
        res.json(customers.map(c => ({
            id: c._id,
            first_name: c.first_name,
            middle_name: c.middle_name,
            last_name: c.last_name,
            address: c.address,
            contact_number: c.contact_number,
            email: c.email,
            sex: c.sex,
            id_number: c.id_number,
            created_at: c.created_at,
            updated_at: c.updated_at
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/customers/:id', requireAuth, async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json({
            id: customer._id,
            first_name: customer.first_name,
            middle_name: customer.middle_name,
            last_name: customer.last_name,
            address: customer.address,
            contact_number: customer.contact_number,
            email: customer.email,
            sex: customer.sex,
            id_number: customer.id_number,
            created_at: customer.created_at,
            updated_at: customer.updated_at
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/customers', requireAuth, async (req, res) => {
    try {
        const { firstName, middleName, lastName, address, contactNumber, email, sex, idNumber } = req.body;
        
        if (!firstName || !lastName || !address || !contactNumber || !email || !idNumber) {
            return res.status(400).json({ error: 'Required fields missing' });
        }
        
        const customer = new Customer({
            first_name: firstName,
            middle_name: middleName || undefined,
            last_name: lastName,
            address,
            contact_number: contactNumber,
            email,
            sex: sex || undefined,
            id_number: idNumber
        });
        
        await customer.save();
        res.json({ id: customer._id, success: true });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'ID number already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/customers/:id', requireAuth, async (req, res) => {
    try {
        const { firstName, middleName, lastName, address, contactNumber, email, sex, idNumber } = req.body;
        
        const updateData = {
            first_name: firstName,
            middle_name: middleName || undefined,
            last_name: lastName,
            address,
            contact_number: contactNumber,
            email,
            sex: sex || undefined,
            id_number: idNumber,
            updated_at: Date.now()
        };
        
        await Customer.findByIdAndUpdate(req.params.id, updateData);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/customers/:id', requireAuth, requireRole('Admin', 'Supervisor'), async (req, res) => {
    try {
        await Customer.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== POLICY ROUTES ==========
app.get('/api/policies', requireAuth, async (req, res) => {
    try {
        const policies = await Policy.find()
            .populate('customer_id', 'first_name middle_name last_name email contact_number')
            .sort({ created_at: -1 });
        
        res.json(policies.map(p => ({
            id: p._id,
            policy_number: p.policy_number,
            customer_id: p.customer_id._id,
            customer_name: `${p.customer_id.first_name} ${p.customer_id.middle_name || ''} ${p.customer_id.last_name}`.trim(),
            customer_email: p.customer_id.email,
            customer_contact: p.customer_id.contact_number,
            total_premium_due: p.total_premium_due,
            amount_paid: p.amount_paid,
            outstanding_balance: p.outstanding_balance,
            status: p.status,
            created_at: p.created_at,
            updated_at: p.updated_at
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/policies/:id', requireAuth, async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id)
            .populate('customer_id');
        
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        
        const customer = policy.customer_id;
        res.json({
            id: policy._id,
            policy_number: policy.policy_number,
            customer_id: customer._id,
            customer_name: `${customer.first_name} ${customer.middle_name || ''} ${customer.last_name}`.trim(),
            first_name: customer.first_name,
            middle_name: customer.middle_name,
            last_name: customer.last_name,
            address: customer.address,
            email: customer.email,
            contact_number: customer.contact_number,
            sex: customer.sex,
            id_number: customer.id_number,
            total_premium_due: policy.total_premium_due,
            amount_paid: policy.amount_paid,
            outstanding_balance: policy.outstanding_balance,
            status: policy.status
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/policies', requireAuth, requireRole('Admin', 'Underwriter', 'Supervisor'), async (req, res) => {
    try {
        const { customerId, totalPremiumDue, policyNumber } = req.body;
        
        if (!customerId || !totalPremiumDue) {
            return res.status(400).json({ error: 'Customer ID and total premium are required' });
        }
        
        // Validate customer exists
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        
        const polNumber = policyNumber || generatePolicyNumber();
        
        const policy = new Policy({
            policy_number: polNumber,
            customer_id: customerId,
            total_premium_due: totalPremiumDue,
            outstanding_balance: totalPremiumDue,
            created_by: req.session.userId
        });
        
        await policy.save();
        res.json({ id: policy._id.toString(), policyNumber: polNumber, success: true });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Policy number already exists' });
        }
        console.error('Policy creation error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/policies/:id', requireAuth, requireRole('Admin', 'Underwriter', 'Supervisor'), async (req, res) => {
    try {
        const { totalPremiumDue } = req.body;
        
        const policy = await Policy.findById(req.params.id);
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        
        const newOutstanding = totalPremiumDue - policy.amount_paid;
        
        await Policy.findByIdAndUpdate(req.params.id, {
            total_premium_due: totalPremiumDue,
            outstanding_balance: newOutstanding,
            updated_at: Date.now()
        });
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== PAYMENT ROUTES ==========
app.get('/api/payments', requireAuth, async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('policy_id', 'policy_number')
            .populate({
                path: 'policy_id',
                populate: { path: 'customer_id', select: 'first_name middle_name last_name' }
            })
            .populate('received_by', 'full_name')
            .sort({ payment_date: -1 });
        
        res.json(payments.map(py => ({
            id: py._id,
            receipt_number: py.receipt_number,
            policy_number: py.policy_id.policy_number,
            customer_name: `${py.policy_id.customer_id.first_name} ${py.policy_id.customer_id.middle_name || ''} ${py.policy_id.customer_id.last_name}`.trim(),
            amount: py.amount,
            payment_method: py.payment_method,
            payment_date: py.payment_date,
            received_by_name: py.received_by ? py.received_by.full_name : null
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/payments/policy/:policyId', requireAuth, async (req, res) => {
    try {
        const payments = await Payment.find({ policy_id: req.params.policyId })
            .populate('policy_id', 'policy_number')
            .populate('received_by', 'full_name')
            .sort({ payment_date: -1 });
        
        res.json(payments.map(py => ({
            id: py._id,
            receipt_number: py.receipt_number,
            policy_number: py.policy_id.policy_number,
            amount: py.amount,
            payment_method: py.payment_method,
            payment_date: py.payment_date,
            received_by_name: py.received_by ? py.received_by.full_name : null
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/payments', requireAuth, requireRole('Admin', 'Cashier', 'Supervisor'), async (req, res) => {
    try {
        const { policyId, amount, paymentMethod, notes } = req.body;
        
        if (!policyId || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Policy ID and valid amount are required' });
        }
        
        const policy = await Policy.findById(policyId);
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        
        if (amount > policy.outstanding_balance) {
            return res.status(400).json({ error: 'Payment amount exceeds outstanding balance' });
        }
        
        const receiptNumber = generateReceiptNumber();
        const newAmountPaid = policy.amount_paid + amount;
        const newOutstanding = policy.outstanding_balance - amount;
        
        const payment = new Payment({
            policy_id: policyId,
            amount,
            payment_method: paymentMethod || 'Cash',
            receipt_number: receiptNumber,
            received_by: req.session.userId,
            notes: notes || undefined
        });
        
        await payment.save();
        
        // Update policy
        await Policy.findByIdAndUpdate(policyId, {
            amount_paid: newAmountPaid,
            outstanding_balance: newOutstanding,
            updated_at: Date.now()
        });
        
        // Create receipt
        const receipt = new Receipt({
            receipt_number: receiptNumber,
            payment_id: payment._id,
            policy_id: policyId,
            customer_id: policy.customer_id,
            amount,
            payment_date: payment.payment_date,
            generated_by: req.session.userId
        });
        
        await receipt.save();
        
        res.json({
            id: payment._id,
            receiptNumber,
            success: true,
            outstandingBalance: newOutstanding
        });
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== RECEIPT ROUTES ==========
app.get('/api/receipts/:receiptNumber', requireAuth, async (req, res) => {
    try {
        const receipt = await Receipt.findOne({ receipt_number: req.params.receiptNumber })
            .populate('policy_id', 'policy_number')
            .populate('customer_id')
            .populate('generated_by', 'full_name');
        
        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }
        
        const customer = receipt.customer_id;
        res.json({
            receipt_number: receipt.receipt_number,
            policy_number: receipt.policy_id.policy_number,
            first_name: customer.first_name,
            middle_name: customer.middle_name,
            last_name: customer.last_name,
            address: customer.address,
            email: customer.email,
            contact_number: customer.contact_number,
            id_number: customer.id_number,
            amount: receipt.amount,
            payment_date: receipt.payment_date,
            generated_by_name: receipt.generated_by ? receipt.generated_by.full_name : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== DAILY CASH STATEMENT ROUTES ==========
app.get('/api/reports/daily-cash-statement', requireAuth, requireRole('Admin', 'Supervisor', 'Cashier'), async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];
        const startDate = new Date(targetDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(targetDate);
        endDate.setHours(23, 59, 59, 999);
        
        const payments = await Payment.find({
            payment_date: { $gte: startDate, $lte: endDate }
        })
        .populate('policy_id', 'policy_number')
        .populate({
            path: 'policy_id',
            populate: { path: 'customer_id', select: 'first_name middle_name last_name' }
        })
        .populate('received_by', 'full_name')
        .sort({ payment_date: 1 });
        
        const total = payments.reduce((sum, p) => sum + p.amount, 0);
        
        res.json({
            date: targetDate,
            payments: payments.map(py => ({
                id: py._id,
                receipt_number: py.receipt_number,
                policy_number: py.policy_id.policy_number,
                customer_name: `${py.policy_id.customer_id.first_name} ${py.policy_id.customer_id.middle_name || ''} ${py.policy_id.customer_id.last_name}`.trim(),
                amount: py.amount,
                payment_method: py.payment_method,
                payment_date: py.payment_date,
                received_by_name: py.received_by ? py.received_by.full_name : null
            })),
            total,
            count: payments.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== DASHBOARD STATS ==========
app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const [totalCustomers, activePolicies, policies, todayPayments] = await Promise.all([
            Customer.countDocuments(),
            Policy.countDocuments({ status: 'Active' }),
            Policy.find(),
            Payment.find({
                payment_date: { $gte: today, $lt: tomorrow }
            })
        ]);
        
        const totalOutstanding = policies.reduce((sum, p) => sum + (p.outstanding_balance || 0), 0);
        const todayTotal = todayPayments.reduce((sum, p) => sum + p.amount, 0);
        
        res.json({
            totalCustomers,
            activePolicies,
            totalOutstanding,
            todayPayments: todayTotal
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== ADMIN ROUTES ==========

// Middleware to check if user is Admin
const requireAdmin = async (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const user = await User.findById(req.session.userId);
        if (!user || user.role !== 'Admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.user = user;
        return next();
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Middleware to check permission
const requirePermission = (permissionId) => {
    return async (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        try {
            const allowed = await hasPermission(req.session.userId, permissionId);
            if (allowed) {
                return next();
            }
            res.status(403).json({ error: 'Permission denied' });
        } catch (error) {
            res.status(401).json({ error: 'Unauthorized' });
        }
    };
};

// Get system functions
app.get('/api/admin/functions', requireAuth, requireAdmin, (req, res) => {
    res.json(SYSTEM_FUNCTIONS);
});

// Get all role permissions
app.get('/api/admin/permissions', requireAuth, requireAdmin, async (req, res) => {
    try {
        const permissions = await RolePermission.find();
        res.json(permissions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update role permissions
app.post('/api/admin/permissions', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { role, permissions } = req.body;
        
        if (role === 'Admin') {
            return res.status(400).json({ error: 'Cannot modify Admin permissions' });
        }
        
        await RolePermission.findOneAndUpdate(
            { role },
            { 
                role,
                permissions,
                updated_at: Date.now(),
                updated_by: req.session.userId
            },
            { upsert: true }
        );
        
        // Log the action
        await logAuditAction(
            req.session.userId,
            'UPDATE_PERMISSIONS',
            'RolePermission',
            role,
            { permissions },
            req.ip
        );
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all financial periods
app.get('/api/admin/periods', requireAuth, async (req, res) => {
    try {
        const periods = await FinancialPeriod.find().sort({ start_date: -1 });
        res.json(periods);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current period statistics
app.get('/api/admin/period-stats', requireAuth, async (req, res) => {
    try {
        const currentPeriod = await FinancialPeriod.findOne({ status: 'Open' });
        
        if (!currentPeriod) {
            return res.json({ payment_count: 0, policy_count: 0, total_collections: 0 });
        }
        
        const [payments, policies] = await Promise.all([
            Payment.find({
                created_at: { $gte: currentPeriod.start_date, $lte: currentPeriod.end_date }
            }),
            Policy.countDocuments({
                created_at: { $gte: currentPeriod.start_date, $lte: currentPeriod.end_date }
            })
        ]);
        
        const totalCollections = payments.reduce((sum, p) => sum + p.amount, 0);
        
        res.json({
            payment_count: payments.length,
            policy_count: policies,
            total_collections: totalCollections
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new financial period
app.post('/api/admin/periods', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { period_name, start_date, end_date } = req.body;
        
        const period = new FinancialPeriod({
            period_name,
            start_date: new Date(start_date),
            end_date: new Date(end_date),
            status: 'Open'
        });
        
        await period.save();
        
        await logAuditAction(
            req.session.userId,
            'CREATE_PERIOD',
            'FinancialPeriod',
            period._id.toString(),
            { period_name },
            req.ip
        );
        
        res.json({ success: true, id: period._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Close current period
app.post('/api/admin/periods/close-current', requireAuth, requireAdmin, async (req, res) => {
    try {
        const currentPeriod = await FinancialPeriod.findOne({ status: 'Open' });
        
        if (!currentPeriod) {
            return res.status(404).json({ error: 'No open period found' });
        }
        
        // Calculate total collections
        const payments = await Payment.find({
            created_at: { $gte: currentPeriod.start_date, $lte: currentPeriod.end_date }
        });
        const totalCollections = payments.reduce((sum, p) => sum + p.amount, 0);
        
        const policies = await Policy.countDocuments({
            created_at: { $gte: currentPeriod.start_date, $lte: currentPeriod.end_date }
        });
        
        currentPeriod.status = 'Closed';
        currentPeriod.total_collections = totalCollections;
        currentPeriod.total_policies_created = policies;
        currentPeriod.closed_by = req.session.userId;
        currentPeriod.closed_at = Date.now();
        
        await currentPeriod.save();
        
        await logAuditAction(
            req.session.userId,
            'CLOSE_PERIOD',
            'FinancialPeriod',
            currentPeriod._id.toString(),
            { total_collections: totalCollections },
            req.ip
        );
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Close specific period
app.post('/api/admin/periods/:id/close', requireAuth, requireAdmin, async (req, res) => {
    try {
        const period = await FinancialPeriod.findById(req.params.id);
        
        if (!period) {
            return res.status(404).json({ error: 'Period not found' });
        }
        
        if (period.status === 'Closed') {
            return res.status(400).json({ error: 'Period is already closed' });
        }
        
        // Calculate total collections
        const payments = await Payment.find({
            created_at: { $gte: period.start_date, $lte: period.end_date }
        });
        const totalCollections = payments.reduce((sum, p) => sum + p.amount, 0);
        
        const policies = await Policy.countDocuments({
            created_at: { $gte: period.start_date, $lte: period.end_date }
        });
        
        period.status = 'Closed';
        period.total_collections = totalCollections;
        period.total_policies_created = policies;
        period.closed_by = req.session.userId;
        period.closed_at = Date.now();
        
        await period.save();
        
        await logAuditAction(
            req.session.userId,
            'CLOSE_PERIOD',
            'FinancialPeriod',
            period._id.toString(),
            { total_collections: totalCollections },
            req.ip
        );
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get audit log
app.get('/api/admin/audit-log', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { date } = req.query;
        let query = {};
        
        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            query.created_at = { $gte: startDate, $lte: endDate };
        }
        
        const logs = await AuditLog.find(query)
            .populate('user_id', 'username full_name')
            .sort({ created_at: -1 })
            .limit(500);
        
        res.json(logs.map(log => ({
            ...log.toObject(),
            user_name: log.user_id ? log.user_id.full_name : 'Unknown'
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Override arrears for customer
app.post('/api/admin/override-arrears', requireAuth, requirePermission('override_outstanding_balance'), async (req, res) => {
    try {
        const { customer_id, reason } = req.body;
        
        await Customer.findByIdAndUpdate(customer_id, {
            arrears_override: true,
            arrears_override_by: req.session.userId,
            arrears_override_at: Date.now()
        });
        
        await logAuditAction(
            req.session.userId,
            'OVERRIDE_ARREARS',
            'Customer',
            customer_id,
            { reason },
            req.ip
        );
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reset system
app.post('/api/admin/reset-system', requireAuth, requireAdmin, async (req, res) => {
    try {
        // Check permission
        const allowed = await hasPermission(req.session.userId, 'reset_system');
        if (!allowed) {
            return res.status(403).json({ error: 'Permission denied' });
        }
        
        // Delete all data except users and role permissions
        await Promise.all([
            Customer.deleteMany({}),
            Policy.deleteMany({}),
            Payment.deleteMany({}),
            Receipt.deleteMany({}),
            FinancialPeriod.deleteMany({})
        ]);
        
        // Create default financial period
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        
        const period = new FinancialPeriod({
            period_name: `FY ${now.getFullYear()}`,
            start_date: startOfYear,
            end_date: endOfYear,
            status: 'Open'
        });
        await period.save();
        
        await logAuditAction(
            req.session.userId,
            'RESET_SYSTEM',
            'System',
            null,
            { timestamp: Date.now() },
            req.ip
        );
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate user report
app.get('/api/admin/reports/users', requireAuth, requirePermission('generate_user_report'), async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users.map(u => ({
            username: u.username,
            full_name: u.full_name,
            email: u.email,
            role: u.role,
            created_at: u.created_at
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate cash statement
app.get('/api/admin/reports/cash-statement', requireAuth, requirePermission('generate_cash_statements'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        const payments = await Payment.find({
            payment_date: { $gte: start, $lte: end }
        })
        .populate('policy_id', 'policy_number')
        .populate({
            path: 'policy_id',
            populate: { path: 'customer_id', select: 'first_name middle_name last_name' }
        })
        .populate('received_by', 'full_name')
        .sort({ payment_date: 1 });
        
        const total = payments.reduce((sum, p) => sum + p.amount, 0);
        
        res.json({
            startDate,
            endDate,
            total,
            summary: `Cash Statement from ${startDate} to ${endDate}`,
            payments: payments.map(p => ({
                date: p.payment_date,
                receipt_number: p.receipt_number,
                policy_number: p.policy_id?.policy_number,
                customer_name: p.policy_id?.customer_id ? 
                    `${p.policy_id.customer_id.first_name} ${p.policy_id.customer_id.middle_name || ''} ${p.policy_id.customer_id.last_name}`.trim() : '',
                amount: p.amount,
                payment_method: p.payment_method,
                received_by: p.received_by?.full_name
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate policy report
app.get('/api/admin/reports/policies', requireAuth, async (req, res) => {
    try {
        const policies = await Policy.find()
            .populate('customer_id', 'first_name middle_name last_name id_number')
            .sort({ created_at: -1 });
        
        res.json(policies.map(p => ({
            policy_number: p.policy_number,
            customer_name: p.customer_id ? 
                `${p.customer_id.first_name} ${p.customer_id.middle_name || ''} ${p.customer_id.last_name}`.trim() : '',
            customer_id_number: p.customer_id?.id_number,
            total_premium_due: p.total_premium_due,
            amount_paid: p.amount_paid,
            outstanding_balance: p.outstanding_balance,
            status: p.status,
            created_at: p.created_at
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user permissions for current user
app.get('/api/user/permissions', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        // Admin has all permissions
        if (user.role === 'Admin') {
            return res.json({
                role: user.role,
                permissions: Object.values(SYSTEM_FUNCTIONS).map(f => f.id)
            });
        }
        
        const rolePermission = await RolePermission.findOne({ role: user.role });
        res.json({
            role: user.role,
            permissions: rolePermission ? rolePermission.permissions : []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Waiting for MongoDB connection...');
});
