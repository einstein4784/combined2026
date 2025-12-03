const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(DB_PATH);

console.log('Checking for admin user...');

db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, user) => {
    if (err) {
        console.error('Error checking admin user:', err);
        db.close();
        return;
    }
    
    if (user) {
        console.log('Admin user already exists!');
        console.log('Username:', user.username);
        console.log('Email:', user.email);
        db.close();
        return;
    }
    
    console.log('Admin user not found. Creating admin user...');
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    
    db.run(`INSERT INTO users (username, email, password, role, full_name) 
            VALUES (?, ?, ?, ?, ?)`,
        ['admin', 'admin@icinsurance.com', hashedPassword, 'Admin', 'System Administrator'],
        function(err) {
            if (err) {
                console.error('Error creating admin user:', err);
                db.close();
                return;
            }
            
            console.log('✅ Admin user created successfully!');
            console.log('Username: admin');
            console.log('Password: admin123');
            console.log('Email: admin@icinsurance.com');
            console.log('Role: Admin');
            db.close();
        });
});


