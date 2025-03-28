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

    // Check if message table exists
    const tableExists = await this.get("SELECT name FROM sqlite_master WHERE type='table' AND name='message'");
    
    if (tableExists) {
      // If the table exists, we need to recreate it with the new schema
      // First, let's backup the existing data
      await this.run(`CREATE TABLE IF NOT EXISTS message_backup AS SELECT * FROM message`);
      
      // Drop the existing table
      await this.run(`DROP TABLE message`);
      
      // Create the new message table with id as PRIMARY KEY
      await this.run(`
        CREATE TABLE message (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vch_code TEXT NOT NULL,
          user_id INTEGER REFERENCES users(id),
          message TEXT NOT NULL,
          role TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Try to restore data from backup if it exists
      // try {
      //   await this.run(`
      //     INSERT INTO message (vch_code, user_id, message, role, created_at)
      //     SELECT vch_code, user_id, message, role, created_at FROM message_backup
      //   `);
        
      //   // Drop the backup table
      //   await this.run(`DROP TABLE message_backup`);
      // } catch (err) {
      //   console.error('Error restoring message data:', err);
      // }
    } else {
      // If the table doesn't exist, create it with the new schema
      await this.run(`
        CREATE TABLE IF NOT EXISTS message (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          vch_code TEXT NOT NULL,
          user_id INTEGER REFERENCES users(id),
          message TEXT NOT NULL,
          role TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
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