// api.js
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('./database');
const users = require('./users');

const router = express.Router();

// Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Registration Endpoint
router.post('/register', async (req, res) => {
  try {
    const newUser = await users.registerUser(req.body);
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: newUser
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

// Login Endpoint
router.post('/login', async (req, res) => {
  try {
    const { token, user } = await users.loginUser(req.body);
    res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        token,
        user
      }
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      message: err.message
    });
  }
});

// Protected Endpoint for Admins to Get All Users
router.get('/users', authenticateJWT, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const users = await db.all('SELECT * FROM users'); // Exclude password field if needed
    res.json({
      success: true,
      message: 'All users retrieved successfully',
      data: users
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Protected Endpoint for Users to Get Their Own Data
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE uid = ?', [req.user.uid]);
    res.json({
      success: true,
      message: 'User data retrieved successfully',
      data: user
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Protected Endpoint for Admins to Delete a User
router.delete('/users/:id', authenticateJWT, async (req, res) => {
    try {
      if (req.user.type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }
  
      const userId = req.params.id;
      await db.run('DELETE FROM users WHERE id = ?', [userId]);
  
      res.json({
        success: true,
        message: 'User deleted successfully',
        data: { userId }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  });
  
  // Protected Endpoint for Admins to Update a User
  router.put('/users/:id', authenticateJWT, async (req, res) => {
    try {
      if (req.user.type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }
  
      const userId = req.params.id;
      console.log(req.body);
      const { first_name, last_name, email, phone, type, role, next_step, status, role_id, next_step_id, pin } = req.body;
  
      // Validate required fields
      if (!email) throw new Error('Email is required');
  
      // Check if email is already used by another user
      const existingUser = await db.get('SELECT * FROM users WHERE email = ? AND id <> ?', [email, userId]);
      if (existingUser) throw new Error('Email already registered');
  
      // Update user data
      await db.run(`
        UPDATE users
        SET first_name = ?, last_name = ?, email = ?, phone = ?, type = ?, role = ?, next_step = ?, status = ?, role_id = ?, next_step_id = ?, pin = ?
        WHERE id = ?
      `, [first_name, last_name, email, phone, type, role, next_step, status, role_id, next_step_id, pin, userId]);
  
      const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
  
      res.json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser
      });
    } catch (err) {
      console.error(err);
      res.status(400).json({
        success: false,
        message: err.message || 'Server error'
      });
    }
  });


  // DELETE endpoint
router.delete('/users/:id', authenticateJWT, async (req, res) => {
    try {
      if (req.user.type !== 'admin') return res.status(403).json({ success: false, message: 'Admin required' });
      await users.deleteUser(req.params.id);
      res.json({ success: true, message: 'User deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  
  // PUT endpoint
  router.put('/users/:id', authenticateJWT, async (req, res) => {
    try {
      if (req.user.type !== 'admin') return res.status(403).json({ success: false, message: 'Admin required' });
      await users.updateUser(req.params.id, req.body);
      res.json({ success: true, message: 'User updated' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });


  // Protected Endpoint for Admins to Get a Single User
router.get('/users/:id', authenticateJWT, async (req, res) => {
    try {
      if (req.user.type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }
  
      const userId = req.params.id;
      const user = await users.getUserById(userId);
  
      res.json({
        success: true,
        message: 'User retrieved successfully',
        data: user
      });
    } catch (err) {
      console.error(err);
      res.status(err.message === 'User not found' ? 404 : 500).json({
        success: false,
        message: err.message || 'Server error'
      });
    }
  });


// Message Endpoints

// POST /messages (Create Message)
router.post('/messages', authenticateJWT, async (req, res) => {
    try {
      const { vch_code, message, role, user_id } = req.body;

      console.log('messages', req.body);
  
      // Validate required fields
      if (!vch_code || !message || !role) {
        return res.status(400).json({
          success: false,
          message: 'vch_code, message, and role are required'
        });
      }
  
      // Always create a new message to maintain conversation history
      const isAdminOrEmployee = ['admin', 'employee'].includes(req.user.type);
      let userId = isAdminOrEmployee && user_id ? user_id : req.user.id;
  
      // Validate user_id for admins and employees
      if (isAdminOrEmployee && user_id) {
        const validUser = await db.get('SELECT * FROM users WHERE id = ?', [user_id]);
        if (!validUser) {
          return res.status(400).json({
            success: false,
            message: 'User_id does not exist'
          });
        }
      }
  
      // Insert new message
      const result = await db.run(
        'INSERT INTO message (vch_code, user_id, message, role) VALUES (?, ?, ?, ?)',
        [vch_code, userId, message, role]
      );
  
      const newMessage = await db.get('SELECT * FROM message WHERE id = ?', [result.lastID]);
      res.status(201).json({
        success: true,
        message: 'Message created successfully',
        data: newMessage
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ 
        success: false, 
        message: err.message || 'Server error' 
      });
    }
  });
  
  // GET /messages (Get All Messages) - Admin and Employee Only
  router.get('/messages', authenticateJWT, async (req, res) => {
    try {
      if (!['admin', 'employee'].includes(req.user.type)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin or Employee privileges required.'
        });
      }
  
      const messages = await db.all('SELECT * FROM message');
      res.json({
        success: true,
        message: 'All messages retrieved successfully',
        data: messages
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  });
  
  // GET /messages/:vch_code (Get Conversation History)
  router.get('/messages/:vch_code', authenticateJWT, async (req, res) => {
    try {
      const vch_code = req.params.vch_code;
      const messages = await db.all('SELECT * FROM message WHERE vch_code = ? ORDER BY id ASC', [vch_code]);
  
      if (messages.length === 0) {
        return res.status(404).json({ success: false, message: 'No messages found for this code' });
      }
  
      // For non-admin/employee users, check if they have access to this conversation
      if (!['admin', 'employee'].includes(req.user.type)) {
        // Check if any message in this conversation belongs to the user
        const hasAccess = messages.some(msg => msg.user_id === req.user.id);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You are not authorized to access this conversation.'
          });
        }
      }
  
      res.json({
        success: true,
        message: 'Conversation retrieved successfully',
        data: messages
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  });
  
  // PUT /messages/:id (Update Specific Message)
  router.put('/messages/:id', authenticateJWT, async (req, res) => {
    try {
      const messageId = req.params.id;
      const { message, role } = req.body;
  
      const existingMessage = await db.get('SELECT * FROM message WHERE id = ?', [messageId]);
      if (!existingMessage) {
        return res.status(404).json({ success: false, message: 'Message not found' });
      }
  
      const isAdminOrEmployee = ['admin', 'employee'].includes(req.user.type);
      if (!isAdminOrEmployee && existingMessage.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to update this message.'
        });
      }
  
      await db.run(
        'UPDATE message SET message = ?, role = ? WHERE id = ?',
        [message, role, messageId]
      );
  
      const updatedMessage = await db.get('SELECT * FROM message WHERE id = ?', [messageId]);
      res.json({
        success: true,
        message: 'Message updated successfully',
        data: updatedMessage
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  });
  
  // DELETE /messages/:id (Delete Specific Message)
  router.delete('/messages/:id', authenticateJWT, async (req, res) => {
    try {
      const messageId = req.params.id;
      const existingMessage = await db.get('SELECT * FROM message WHERE id = ?', [messageId]);
  
      if (!existingMessage) {
        return res.status(404).json({ success: false, message: 'Message not found' });
      }
  
      const isAdminOrEmployee = ['admin', 'employee'].includes(req.user.type);
      if (!isAdminOrEmployee && existingMessage.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to delete this message.'
        });
      }
  
      await db.run('DELETE FROM message WHERE id = ?', [messageId]);
      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  });
  

module.exports = { usersRouter: router };