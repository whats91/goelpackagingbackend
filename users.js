// users.js
const bcrypt = require('bcrypt');
const shortid = require('short-uuid');
const db = require('./database');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const generator = shortid();

const generateUID = () => generator.generate();

// User Registration
const registerUser = async (userData) => {
  const { first_name, last_name, email, password, phone, type, role = 'unassisted', next_step = 'unassisted', status = '1', role_id = '1', next_step_id = '1' } = userData;

  if (!email || !password) throw new Error('Email and password are required');

  const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (existingUser) throw new Error('Email already registered');

  const hashedPassword = await bcrypt.hash(password, 10);
  const uid = generateUID();

  await db.run(`
    INSERT INTO users (uid, first_name, last_name, email, password, phone, type, role, next_step, status, role_id, next_step_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [uid, first_name, last_name, email, hashedPassword, phone, type, role, next_step, status, role_id, next_step_id]);

  // Fetch the created user (excluding password)
  const newUser = await db.get('SELECT * FROM users WHERE uid = ?', [uid]);
  return newUser;
};

// User Login
const loginUser = async ({ email, password }) => {
  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) throw new Error('Invalid credentials');

  const passwordValid = await bcrypt.compare(password, user.password);
  if (!passwordValid) throw new Error('Invalid credentials');

  const token = jwt.sign(
    { uid: user.uid, type: user.type, role: user.role, next_step: user.next_step, status: user.status, user_id: user.id },
    JWT_SECRET,
    { expiresIn: '5d' }
  );

  // Sanitize user data (exclude password)
  const { password: userPassword, ...sanitizedUser } = user;

  return { token, user: sanitizedUser };
};

// Delete User
const deleteUser = async (userId) => {
    await db.run('DELETE FROM users WHERE id = ?', [userId]);
  };
  
  // Update User
  const updateUser = async (userId, userData) => {
    const { first_name, last_name, email, phone, type, role, next_step, status } = userData;
  
    await db.run(`
      UPDATE users
      SET first_name = ?, last_name = ?, email = ?, phone = ?, type = ?, role = ?, next_step = ?, status = ?
      WHERE id = ?
    `, [first_name, last_name, email, phone, type, role, next_step, status, userId]);
  };


  // Get Single User by ID
const getUserById = async (userId) => {
    const user = await db.get(`
      SELECT id, uid, first_name, last_name, email, phone, type, role, next_step, status, created_at, updated_at
      FROM users
      WHERE id = ?
    `, [userId]);
  
    if (!user) throw new Error('User not found');
  
    return user;
  };
  
  module.exports = { registerUser, loginUser, deleteUser, updateUser, getUserById };

