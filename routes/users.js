const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

// Get all users (admin only)
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get agents (for assignment)
router.get('/agents', requireRole('admin', 'agent'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, full_name FROM users WHERE role IN ($1, $2) AND is_active = true ORDER BY full_name',
      ['admin', 'agent']
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user (admin only)
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { username, password, full_name, email, role } = req.body;

    if (!username || !password || !full_name || !email || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (username, password, full_name, email, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, full_name, email, role, created_at',
      [username, hashedPassword, full_name, email, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user (admin only)
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, is_active } = req.body;

    const result = await pool.query(
      'UPDATE users SET full_name = $1, email = $2, role = $3, is_active = $4 WHERE id = $5 RETURNING id, username, full_name, email, role, is_active',
      [full_name, email, role, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password (admin only)
router.post('/:id/reset-password', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2 RETURNING id',
      [hashedPassword, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
