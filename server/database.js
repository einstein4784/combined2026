const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ic_insurance';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
    initializeDatabase();
}).catch(err => {
    console.error('MongoDB connection error:', err);
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

// Role Permissions Schema
const rolePermissionSchema = new mongoose.Schema({
    role: { 
        type: String, 
        required: true, 
        unique: true,
        enum: ['Admin', 'Supervisor', 'Cashier', 'Underwriter'] 
    },
    permissions: [{
        type: String,
        enum: Object.values(SYSTEM_FUNCTIONS).map(f => f.id)
    }],
    updated_at: { type: Date, default: Date.now },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// System Settings Schema
const systemSettingsSchema = new mongoose.Schema({
    setting_key: { type: String, required: true, unique: true },
    setting_value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String },
    updated_at: { type: Date, default: Date.now },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Financial Period Schema
const financialPeriodSchema = new mongoose.Schema({
    period_name: { type: String, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    status: { 
        type: String, 
        default: 'Open', 
        enum: ['Open', 'Closed'] 
    },
    total_collections: { type: Number, default: 0 },
    total_policies_created: { type: Number, default: 0 },
    closed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    closed_at: { type: Date },
    created_at: { type: Date, default: Date.now }
});

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    entity_type: { type: String, required: true },
    entity_id: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    ip_address: { type: String },
    created_at: { type: Date, default: Date.now }
});

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        required: true, 
        enum: ['Admin', 'Supervisor', 'Cashier', 'Underwriter'] 
    },
    full_name: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Customer Schema
const customerSchema = new mongoose.Schema({
    first_name: { type: String, required: true },
    middle_name: { type: String },
    last_name: { type: String, required: true },
    address: { type: String, required: true },
    contact_number: { type: String, required: true },
    email: { type: String, required: true },
    sex: { type: String, enum: ['Male', 'Female', 'Other'] },
    id_number: { type: String, required: true, unique: true },
    has_arrears: { type: Boolean, default: false },
    arrears_override: { type: Boolean, default: false },
    arrears_override_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    arrears_override_at: { type: Date },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Policy Schema
const policySchema = new mongoose.Schema({
    policy_number: { type: String, required: true, unique: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    total_premium_due: { type: Number, required: true },
    amount_paid: { type: Number, default: 0 },
    outstanding_balance: { type: Number, required: true },
    status: { 
        type: String, 
        default: 'Active', 
        enum: ['Active', 'Cancelled', 'Expired'] 
    },
    financial_period: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialPeriod' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Payment Schema
const paymentSchema = new mongoose.Schema({
    policy_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', required: true },
    amount: { type: Number, required: true },
    payment_date: { type: Date, default: Date.now },
    payment_method: { type: String, default: 'Cash' },
    receipt_number: { type: String, required: true, unique: true },
    received_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    arrears_override_used: { type: Boolean, default: false },
    financial_period: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialPeriod' },
    notes: { type: String },
    created_at: { type: Date, default: Date.now }
});

// Receipt Schema
const receiptSchema = new mongoose.Schema({
    receipt_number: { type: String, required: true, unique: true },
    payment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
    policy_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', required: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, required: true },
    payment_date: { type: Date, required: true },
    generated_at: { type: Date, default: Date.now },
    generated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Create Models
const User = mongoose.model('User', userSchema);
const Customer = mongoose.model('Customer', customerSchema);
const Policy = mongoose.model('Policy', policySchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Receipt = mongoose.model('Receipt', receiptSchema);
const RolePermission = mongoose.model('RolePermission', rolePermissionSchema);
const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);
const FinancialPeriod = mongoose.model('FinancialPeriod', financialPeriodSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// Default permissions for each role
const DEFAULT_PERMISSIONS = {
    Admin: Object.values(SYSTEM_FUNCTIONS).map(f => f.id), // Admin has ALL permissions
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

// Initialize database with default admin user and permissions
async function initializeDatabase() {
    try {
        // Create default admin user if not exists
        const adminCount = await User.countDocuments({ role: 'Admin' });
        
        if (adminCount === 0) {
            const defaultPassword = bcrypt.hashSync('admin123', 10);
            const admin = new User({
                username: 'admin',
                email: 'admin@icinsurance.com',
                password: defaultPassword,
                role: 'Admin',
                full_name: 'System Administrator'
            });
            
            await admin.save();
            console.log('Default admin user created: username=admin, password=admin123');
        }

        // Initialize role permissions if not exists
        for (const [role, permissions] of Object.entries(DEFAULT_PERMISSIONS)) {
            const existingRole = await RolePermission.findOne({ role });
            if (!existingRole) {
                const rolePermission = new RolePermission({
                    role,
                    permissions
                });
                await rolePermission.save();
                console.log(`Default permissions created for role: ${role}`);
            }
        }

        // Create default financial period if not exists
        const periodCount = await FinancialPeriod.countDocuments();
        if (periodCount === 0) {
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
            console.log('Default financial period created');
        }

    } catch (error) {
        console.error('Error initializing database:', error);
    }
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
async function hasPermission(userId, permissionId) {
    try {
        const user = await User.findById(userId);
        if (!user) return false;
        
        // Admin always has all permissions
        if (user.role === 'Admin') return true;
        
        const rolePermission = await RolePermission.findOne({ role: user.role });
        if (!rolePermission) return false;
        
        return rolePermission.permissions.includes(permissionId);
    } catch (error) {
        console.error('Error checking permission:', error);
        return false;
    }
}

// Log audit action
async function logAuditAction(userId, action, entityType, entityId, details, ipAddress) {
    try {
        const log = new AuditLog({
            user_id: userId,
            action,
            entity_type: entityType,
            entity_id,
            details,
            ip_address: ipAddress
        });
        await log.save();
    } catch (error) {
        console.error('Error logging audit action:', error);
    }
}

module.exports = {
    mongoose,
    User,
    Customer,
    Policy,
    Payment,
    Receipt,
    RolePermission,
    SystemSettings,
    FinancialPeriod,
    AuditLog,
    SYSTEM_FUNCTIONS,
    DEFAULT_PERMISSIONS,
    generateReceiptNumber,
    generatePolicyNumber,
    hasPermission,
    logAuditAction
};
