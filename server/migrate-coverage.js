const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Starting migration to add coverage fields...');

db.serialize(() => {
    // Check if columns exist
    db.all("PRAGMA table_info(policies)", (err, columns) => {
        if (err) {
            console.error('Error checking table:', err);
            return;
        }
        
        const columnNames = columns.map(c => c.name);
        
        // Add coverage_type column if it doesn't exist
        if (!columnNames.includes('coverage_type')) {
            db.run(`ALTER TABLE policies ADD COLUMN coverage_type TEXT DEFAULT 'Third Party'`, (err) => {
                if (err) {
                    console.error('Error adding coverage_type:', err);
                } else {
                    console.log('Added coverage_type column');
                }
            });
        } else {
            console.log('coverage_type column already exists');
        }
        
        // Add coverage_start_date column if it doesn't exist
        if (!columnNames.includes('coverage_start_date')) {
            db.run(`ALTER TABLE policies ADD COLUMN coverage_start_date DATE`, (err) => {
                if (err) {
                    console.error('Error adding coverage_start_date:', err);
                } else {
                    console.log('Added coverage_start_date column');
                }
            });
        } else {
            console.log('coverage_start_date column already exists');
        }
        
        // Add coverage_end_date column if it doesn't exist
        if (!columnNames.includes('coverage_end_date')) {
            db.run(`ALTER TABLE policies ADD COLUMN coverage_end_date DATE`, (err) => {
                if (err) {
                    console.error('Error adding coverage_end_date:', err);
                } else {
                    console.log('Added coverage_end_date column');
                }
            });
        } else {
            console.log('coverage_end_date column already exists');
        }
        
        // Update existing policies with default values
        setTimeout(() => {
            db.run(`UPDATE policies SET 
                coverage_type = COALESCE(coverage_type, 'Third Party'),
                coverage_start_date = COALESCE(coverage_start_date, DATE(created_at)),
                coverage_end_date = COALESCE(coverage_end_date, DATE(created_at, '+1 year'))
                WHERE coverage_start_date IS NULL OR coverage_end_date IS NULL`, 
                (err) => {
                    if (err) {
                        console.error('Error updating existing policies:', err);
                    } else {
                        console.log('Updated existing policies with default coverage values');
                    }
                    
                    db.close((err) => {
                        if (err) {
                            console.error('Error closing database:', err);
                        } else {
                            console.log('Migration completed successfully!');
                        }
                    });
                });
        }, 500);
    });
});

