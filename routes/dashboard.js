const express = require('express');
const pool = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Get dashboard statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userRole = req.session.userRole;

    let whereClause = '';
    const params = [];

    if (userRole === 'customer') {
      whereClause = 'WHERE customer_id = $1';
      params.push(userId);
    }

    // Basic ticket stats
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(*) FILTER (WHERE status = 'open') as open_tickets,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tickets,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_tickets,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_tickets,
        COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_tickets,
        COUNT(*) FILTER (WHERE priority = 'high') as high_tickets
      FROM tickets ${whereClause}
    `, params);

    // Top customers by ticket count (admin and agent only)
    let topCustomers = [];
    if (userRole !== 'customer') {
      const customersResult = await pool.query(`
        SELECT 
          u.id,
          u.full_name,
          u.email,
          COUNT(t.id) as ticket_count
        FROM users u
        LEFT JOIN tickets t ON u.id = t.customer_id
        WHERE u.role = 'customer'
        GROUP BY u.id, u.full_name, u.email
        ORDER BY ticket_count DESC
        LIMIT 10
      `);
      topCustomers = customersResult.rows;
    }

    // Top products by issue count
    const topProductsResult = await pool.query(`
      SELECT 
        p.id,
        p.name,
        COUNT(t.id) as issue_count
      FROM products p
      LEFT JOIN tickets t ON p.id = t.product_id ${whereClause ? 'AND ' + whereClause.replace('WHERE ', '') : ''}
      WHERE p.is_active = true
      GROUP BY p.id, p.name
      ORDER BY issue_count DESC
      LIMIT 10
    `, params);

    res.json({
      ...stats.rows[0],
      top_customers: topCustomers,
      top_products: topProductsResult.rows
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
