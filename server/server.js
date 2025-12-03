const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const { User, Customer, Policy, Payment, Receipt, generateReceiptNumber, generatePolicyNumber } = require('./database');
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Waiting for MongoDB connection...');
});
