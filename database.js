// database.js
const sqlite3 = require('sqlite3').verbose();

class Database {
  constructor() {
    this.db = new sqlite3.Database('./users.db', (err) => {
      if (err) console.error(err.message);
      else {
        console.log('Connected to SQLite database.');
        this.db.run('PRAGMA foreign_keys = ON'); // Enable foreign keys
      }
    });
  }

  async init() {
    // Create USERS table
    await this.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT UNIQUE,
        type TEXT DEFAULT 'user',
        role TEXT DEFAULT 'unassisted',
        role_id TEXT DEFAULT '1',
        next_step TEXT DEFAULT 'unassisted',
        next_step_id TEXT DEFAULT '1',
        status TEXT DEFAULT '1',
        pin TEXT DEFAULT 'ab1122',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create message table if it doesn't exist
    await this.run(`
      CREATE TABLE IF NOT EXISTS message (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vch_code TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        message TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT
      )
    `);
  }

  async run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async get(query, params) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(query, params) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = new Database();