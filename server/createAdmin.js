require('dotenv').config();

const bcrypt = require('bcrypt');
const pool = require('./config/db');

async function createAdmin() {
    try {
        const username = process.env.ADMIN_USERNAME || 'admin';
        const email = process.env.ADMIN_EMAIL || 'admin@company.com';
        const plainPassword = process.env.ADMIN_PASSWORD || 'change-me-strong-password';

        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (existing.rows.length > 0) {
            console.log('ℹ️ Admin user already exists. Skipping creation.');
            console.log(`Email: ${email}`);
            return;
        }

        await pool.query(
            `INSERT INTO users (employee_id, username, email, password, role)
       VALUES ($1, $2, $3, $4, $5)`,
            [null, username, email, hashedPassword, 'admin']
        );

        console.log('✅ Admin user created successfully!');
        console.log(`Email: ${email}`);
        console.log('Password: ' + plainPassword);
    } catch (err) {
        console.error('❌ Error creating admin:', err.message);
    } finally {
        process.exit();
    }
}

createAdmin();