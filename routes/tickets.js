const express = require('express');
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Generate ticket number
const generateTicketNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TKT-${year}${month}-${random}`;
};

// Get all tickets
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, priority, assigned_to, search } = req.query;
    const userId = req.session.userId;
    const userRole = req.session.userRole;

    let query = `
      SELECT t.*, 
        u1.full_name as customer_name,
        u2.full_name as assigned_name,
        p.name as product_name
      FROM tickets t
      LEFT JOIN users u1 ON t.customer_id = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      LEFT JOIN products p ON t.product_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    // Role-based filtering
    if (userRole === 'customer') {
      paramCount++;
      query += ` AND t.customer_id = $${paramCount}`;
      params.push(userId);
    }

    // Status filter
    if (status) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
    }

    // Priority filter
    if (priority) {
      paramCount++;
      query += ` AND t.priority = $${paramCount}`;
      params.push(priority);
    }

    // Assigned to filter
    if (assigned_to) {
      paramCount++;
      query += ` AND t.assigned_to = $${paramCount}`;
      params.push(assigned_to);
    }

    // Search filter
    if (search) {
      paramCount++;
      query += ` AND (t.title ILIKE $${paramCount} OR t.ticket_number ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single ticket
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    const userRole = req.session.userRole;

    const result = await pool.query(
      `SELECT t.*, 
        u1.full_name as customer_name, u1.email as customer_email,
        u2.full_name as assigned_name,
        p.name as product_name
      FROM tickets t
      LEFT JOIN users u1 ON t.customer_id = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      LEFT JOIN products p ON t.product_id = p.id
      WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = result.rows[0];

    // Check permissions
    if (userRole === 'customer' && ticket.customer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create ticket
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, priority, product_id } = req.body;
    const userId = req.session.userId;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const ticketNumber = generateTicketNumber();

    const result = await pool.query(
      `INSERT INTO tickets (ticket_number, title, description, priority, customer_id, product_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [ticketNumber, title, description, priority || 'medium', userId, product_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update ticket
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assigned_to } = req.body;
    const userId = req.session.userId;
    const userRole = req.session.userRole;

    // Get current ticket
    const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Check permissions
    if (userRole === 'customer' && ticket.customer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Customers can only update title, description, and product
    if (userRole === 'customer') {
      const updates = [];
      const params = [];
      let paramCount = 0;

      if (title !== undefined) {
        paramCount++;
        updates.push(`title = $${paramCount}`);
        params.push(title);
      }
      if (description !== undefined) {
        paramCount++;
        updates.push(`description = $${paramCount}`);
        params.push(description);
      }
      if (req.body.product_id !== undefined) {
        paramCount++;
        updates.push(`product_id = $${paramCount}`);
        params.push(req.body.product_id || null);
      }

      if (updates.length === 0) {
        return res.json(ticket);
      }

      paramCount++;
      params.push(id);

      const result = await pool.query(
        `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        params
      );
      return res.json(result.rows[0]);
    }

    // Admin and agents can update everything
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (title !== undefined) {
      paramCount++;
      updates.push(`title = $${paramCount}`);
      params.push(title);
    }
    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }
    if (status !== undefined) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
      
      if (status === 'resolved') {
        paramCount++;
        updates.push(`resolved_at = $${paramCount}`);
        params.push(new Date());
      } else if (status === 'closed') {
        paramCount++;
        updates.push(`closed_at = $${paramCount}`);
        params.push(new Date());
      }
    }
    if (priority !== undefined) {
      paramCount++;
      updates.push(`priority = $${paramCount}`);
      params.push(priority);
    }
    if (assigned_to !== undefined) {
      paramCount++;
      updates.push(`assigned_to = $${paramCount}`);
      params.push(assigned_to || null);
    }
    if (req.body.product_id !== undefined) {
      paramCount++;
      updates.push(`product_id = $${paramCount}`);
      params.push(req.body.product_id || null);
    }

    paramCount++;
    params.push(id);

    const result = await pool.query(
      `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete ticket (admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.session.userRole;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query('DELETE FROM tickets WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
