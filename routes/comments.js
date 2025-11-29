const express = require('express');
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Get comments for a ticket
router.get('/ticket/:ticketId', requireAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.session.userId;
    const userRole = req.session.userRole;

    // Check ticket access
    const ticketResult = await pool.query('SELECT customer_id FROM tickets WHERE id = $1', [ticketId]);
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    if (userRole === 'customer' && ticket.customer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get comments (hide internal notes from customers)
    let query = `
      SELECT c.*, u.full_name as user_name, u.role as user_role
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.ticket_id = $1
    `;

    if (userRole === 'customer') {
      query += ' AND c.is_internal = false';
    }

    query += ' ORDER BY c.created_at ASC';

    const result = await pool.query(query, [ticketId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment
router.post('/', requireAuth, async (req, res) => {
  try {
    const { ticket_id, comment, is_internal } = req.body;
    const userId = req.session.userId;
    const userRole = req.session.userRole;

    if (!ticket_id || !comment) {
      return res.status(400).json({ error: 'Ticket ID and comment are required' });
    }

    // Check ticket access
    const ticketResult = await pool.query('SELECT customer_id FROM tickets WHERE id = $1', [ticket_id]);
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    if (userRole === 'customer' && ticket.customer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Customers cannot create internal notes
    const isInternalNote = userRole !== 'customer' && is_internal === true;

    const result = await pool.query(
      `INSERT INTO comments (ticket_id, user_id, comment, is_internal) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [ticket_id, userId, comment, isInternalNote]
    );

    // Get user info
    const commentWithUser = await pool.query(
      `SELECT c.*, u.full_name as user_name, u.role as user_role
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(commentWithUser.rows[0]);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
