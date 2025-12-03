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

// Initialize database with default admin user
async function initializeDatabase() {
    try {
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

module.exports = {
    mongoose,
    User,
    Customer,
    Policy,
    Payment,
    Receipt,
    generateReceiptNumber,
    generatePolicyNumber
};
