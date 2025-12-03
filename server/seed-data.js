const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Helper to run queries with promises
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Random data generators
const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Emma', 'Robert', 'Olivia', 
    'William', 'Sophia', 'Richard', 'Isabella', 'Joseph', 'Mia', 'Thomas', 'Charlotte', 'Christopher', 'Amelia',
    'Daniel', 'Harper', 'Matthew', 'Evelyn', 'Anthony', 'Abigail', 'Mark', 'Elizabeth', 'Donald', 'Sofia',
    'Steven', 'Avery', 'Paul', 'Ella', 'Andrew', 'Scarlett', 'Joshua', 'Grace', 'Kenneth', 'Chloe'];

const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'];

const streets = ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine Rd', 'Elm St', 'Washington Blvd', 
    'Park Ave', 'Lake Dr', 'River Rd', 'Church St', 'Market St', 'High St', 'Bridge Rd', 'Mill St'];

const cities = ['Castries', 'Vieux Fort', 'Soufriere', 'Gros Islet', 'Micoud', 'Dennery', 'Laborie', 'Choiseul'];

const paymentMethods = ['Cash', 'Cheque', 'Bank Transfer', 'Credit Card', 'Debit Card'];

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateID() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return random(letters.split('')) + random(letters.split('')) + randomInt(100000, 999999);
}

function generatePhone() {
    return `+1-758-${randomInt(100, 999)}-${randomInt(1000, 9999)}`;
}

function generateEmail(firstName, lastName) {
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 99)}@${random(domains)}`;
}

async function seedData() {
    console.log('🌱 Starting database seeding...\n');

    try {
        // 1. Create users for each role
        console.log('👥 Creating users for each role...');
        const password = await bcrypt.hash('password123', 10);
        
        const users = [
            { username: 'underwriter1', email: 'underwriter@icinsurance.com', password, full_name: 'John Underwriter', role: 'Underwriter' },
            { username: 'cashier1', email: 'cashier@icinsurance.com', password, full_name: 'Jane Cashier', role: 'Cashier' },
            { username: 'supervisor1', email: 'supervisor@icinsurance.com', password, full_name: 'Mike Supervisor', role: 'Supervisor' },
            { username: 'admin2', email: 'admin2@icinsurance.com', password, full_name: 'Sarah Admin', role: 'Admin' }
        ];

        for (const user of users) {
            try {
                await run(
                    `INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)`,
                    [user.username, user.email, user.password, user.full_name, user.role]
                );
                console.log(`  ✓ Created ${user.role}: ${user.username} (password: password123)`);
            } catch (e) {
                if (e.message.includes('UNIQUE')) {
                    console.log(`  - ${user.username} already exists, skipping`);
                } else {
                    throw e;
                }
            }
        }

        // 2. Create 100 dummy customers
        console.log('\n👤 Creating 100 customers...');
        const customerIds = [];
        
        for (let i = 0; i < 100; i++) {
            const firstName = random(firstNames);
            const lastName = random(lastNames);
            const middleName = random(firstNames);
            const sex = Math.random() > 0.5 ? 'Male' : 'Female';
            const address = `${randomInt(1, 999)} ${random(streets)}, ${random(cities)}, St. Lucia`;
            const contactNumber = generatePhone();
            const email = generateEmail(firstName, lastName);
            const idNumber = generateID();

            try {
                const result = await run(
                    `INSERT INTO customers (first_name, last_name, middle_name, address, contact_number, email, sex, id_number) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [firstName, lastName, middleName, address, contactNumber, email, sex, idNumber]
                );
                customerIds.push(result.lastID);
                
                if ((i + 1) % 20 === 0) {
                    console.log(`  ✓ Created ${i + 1} customers...`);
                }
            } catch (e) {
                if (!e.message.includes('UNIQUE')) throw e;
            }
        }
        console.log(`  ✓ Total customers created: ${customerIds.length}`);

        // 3. Create 100 dummy policies
        console.log('\n📋 Creating 100 policies...');
        const policyIds = [];
        
        for (let i = 0; i < 100; i++) {
            const customerId = random(customerIds);
            const policyNumber = `POL-${Date.now().toString(36).toUpperCase()}-${randomInt(1000, 9999)}`;
            const totalPremium = randomInt(500, 10000);
            const amountPaid = Math.random() > 0.3 ? randomInt(0, totalPremium) : totalPremium;
            const outstanding = totalPremium - amountPaid;
            const status = 'Active'; // Status is Active, Cancelled, or Expired
            const createdAt = randomDate(new Date(2024, 0, 1), new Date());

            try {
                const result = await run(
                    `INSERT INTO policies (customer_id, policy_number, total_premium_due, amount_paid, outstanding_balance, status, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [customerId, policyNumber, totalPremium, amountPaid, outstanding, status, createdAt.toISOString()]
                );
                policyIds.push({ id: result.lastID, customerId, amountPaid });
                
                if ((i + 1) % 20 === 0) {
                    console.log(`  ✓ Created ${i + 1} policies...`);
                }
            } catch (e) {
                if (!e.message.includes('UNIQUE')) throw e;
            }
        }
        console.log(`  ✓ Total policies created: ${policyIds.length}`);

        // 4. Create 100 dummy payments
        console.log('\n💰 Creating 100 payments...');
        let paymentsCreated = 0;
        
        for (let i = 0; i < 100; i++) {
            const policy = random(policyIds);
            const amount = randomInt(100, 2000);
            const paymentMethod = random(paymentMethods);
            const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}-${randomInt(100, 999)}`;
            const paymentDate = randomDate(new Date(2024, 0, 1), new Date());
            const receivedBy = random(['admin', 'cashier1', 'supervisor1']);

            try {
                await run(
                    `INSERT INTO payments (policy_id, amount, payment_method, receipt_number, payment_date, received_by) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [policy.id, amount, paymentMethod, receiptNumber, paymentDate.toISOString(), receivedBy]
                );
                paymentsCreated++;
                
                if ((i + 1) % 20 === 0) {
                    console.log(`  ✓ Created ${i + 1} payments...`);
                }
            } catch (e) {
                if (!e.message.includes('UNIQUE')) throw e;
            }
        }
        console.log(`  ✓ Total payments created: ${paymentsCreated}`);

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('✅ DATABASE SEEDING COMPLETE!');
        console.log('='.repeat(50));
        console.log('\n📊 Summary:');
        console.log('  - Users created: 4 (one per role)');
        console.log(`  - Customers created: ${customerIds.length}`);
        console.log(`  - Policies created: ${policyIds.length}`);
        console.log(`  - Payments created: ${paymentsCreated}`);
        console.log('\n🔐 Test User Credentials:');
        console.log('  Username: underwriter1  | Password: password123 | Role: Underwriter');
        console.log('  Username: cashier1      | Password: password123 | Role: Cashier');
        console.log('  Username: supervisor1   | Password: password123 | Role: Supervisor');
        console.log('  Username: admin2        | Password: password123 | Role: Admin');
        console.log('\n');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        db.close();
    }
}

seedData();

