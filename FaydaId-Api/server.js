const express = require('express');
const app = express();
const { faker } = require('@faker-js/faker');
const cors = require('cors');
const { Pool } = require('pg'); // PostgreSQL ለመጠቀም

app.use(cors());
app.use(express.json());

// --- የዳታቤዝ ግንኙነት (Database Connection) ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Render ላይ የሰጠኸው ሊንክ
    ssl: { rejectUnauthorized: false } // ለ Render ግዴታ ነው
});

// --- ሰንጠረዡን በራሱ እንዲፈጥር የሚያደርግ ተግባር ---
const initializeDB = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            fayda_id VARCHAR(20) UNIQUE NOT NULL,
            fullName VARCHAR(255),
            email VARCHAR(255),
            dob DATE,
            address TEXT,
            birthPlace Text,
            Nationality Text,
            photo TEXT,
            status VARCHAR(50) DEFAULT 'Verified'
        );
    `;
    try {
        await pool.query(createTableQuery);
        console.log("Database Table Ready!");
    } catch (err) {
        console.error("Error creating table:", err);
    }
};
initializeDB();

// --- 1. ሁሉንም ተጠቃሚዎች ለማየት (Read) ---
app.get('/all-users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY id DESC');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 2. ማንነትን ለማረጋገጥ (Verify) ---
app.post('/verify', async (req, res) => {
    const { idNumber } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE fayda_id = $1', [idNumber]);
        if (result.rows.length > 0) {
            res.json({ success: true, data: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: "ID not found." });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- 3. አዲስ ሰው ለመመዝገብ (Create) ---
// --- አዲስ ሰው ለመመዝገብ (የተስተካከለ) ---
app.post('/add-person', async (req, res) => {
    const { fullName, email, dob, address,birthPlace,Nationality, photo } = req.body;
    
    // በራሱ 12 የዘፈቀደ ቁጥሮችን ያመነጫል
    const generatedFaydaId = Math.floor(100000000000 + Math.random() * 900000000000).toString();

    try {
        const query = `
            INSERT INTO users (fayda_id, fullName, email, dob, address, photo)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
        const values = [generatedFaydaId, fullName, email, dob, address, photo];
        const result = await pool.query(query, values);
        
        res.json({ 
            success: true, 
            message: "በተሳካ ሁኔታ ተመዝግቧል!", 
            fayda_id: generatedFaydaId, // አዲሱን ቁጥር ለፍሮንት-ኤንድ ይመልሳል
            data: result.rows[0] 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "ምዝገባው አልተሳካም።" });
    }
});


// --- 4. መረጃ ለመቀየር (Update) ---
app.put('/update-person/:fayda_id', async (req, res) => {
    const { fayda_id } = req.params;
    const { fullName, email, address } = req.body;
    try {
        const query = 'UPDATE users SET fullName=$1, email=$2, address=$3 WHERE fayda_id=$4 RETURNING *';
        const result = await pool.query(query, [fullName, email, address, fayda_id]);
        
        if (result.rows.length > 0) {
            res.json({ success: true, message: "መረጃው ተስተካክሏል!", data: result.rows[0] });
        } else {
            res.status(404).json({ success: false, message: "ሰውየው አልተገኘም" });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// --- 5. Login Route (ፍሮንት-ኤንድህ የሚፈልገው) ---
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // ለጊዜው በቋሚነት (Static) እንዲገባ
    if (username === "admin" && password === "fayda2024") {
        res.json({ success: true, token: "fake-jwt-token", message: "እንኳን ደህና መጡ!" });
    } else {
        res.status(401).json({ success: false, message: "የተሳሳተ የተጠቃሚ ስም ወይም የይለፍ ቃል!" });
    }
});
app.get('/', (req, res) => res.send('Welcome to Direct-Bet API (PostgreSQL Ready)!'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
