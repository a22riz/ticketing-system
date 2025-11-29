# Project Structure

```
├── config/          # Configuration files
│   └── database.js  # PostgreSQL connection pool
├── database/        # Database schemas
│   └── schema.sql   # Table definitions and initial data
├── middleware/      # Express middleware
│   └── auth.js      # Authentication & authorization (requireAuth, requireRole)
├── routes/          # API route handlers
│   ├── auth.js      # Login, logout, current user
│   ├── tickets.js   # Ticket CRUD operations
│   ├── comments.js  # Comment operations
│   ├── users.js     # User management (admin only)
│   ├── products.js  # Product management (admin only)
│   └── dashboard.js # Statistics endpoints
├── public/          # Frontend static files
│   ├── css/         # Stylesheets
│   ├── js/          # Client-side JavaScript
│   └── index.html   # SPA entry point
├── scripts/         # Utility scripts
│   └── init-db.js   # Database initialization
├── server.js        # Main application entry point
├── docker-compose.yml
├── Dockerfile
└── .env.example     # Environment template
```

## Architecture Patterns

### Backend
- **RESTful API**: All endpoints under `/api/*`
- **Session-based Auth**: User info stored in `req.session` (userId, userRole, username)
- **Middleware Chain**: `requireAuth` → `requireRole` → route handler
- **Database Access**: Direct pool queries (no ORM)
- **Error Responses**: JSON format `{ error: "message" }`

### Frontend
- **SPA Routing**: Server sends `index.html` for all routes, client-side routing handles navigation
- **API Communication**: Fetch API for all backend requests
- **State Management**: Session storage for user state

## Route Conventions

- All API routes prefixed with `/api/`
- RESTful patterns:
  - `GET /api/resource` - List
  - `GET /api/resource/:id` - Get single
  - `POST /api/resource` - Create
  - `PUT /api/resource/:id` - Update
  - `DELETE /api/resource/:id` - Delete

## Database Conventions

- **Parameterized Queries**: Always use `$1, $2, ...` placeholders
- **Timestamps**: `created_at`, `updated_at` (automatic via DEFAULT)
- **Soft Deletes**: Use `is_active` flag for users
- **Foreign Keys**: Cascade deletes where appropriate
- **Naming**: Snake_case for columns and tables

## Security Practices

- Passwords hashed with bcrypt before storage
- Session cookies: httpOnly, 24-hour expiry
- Role-based access control on all protected routes
- SQL injection prevention via parameterized queries
- Input validation on all POST/PUT endpoints
