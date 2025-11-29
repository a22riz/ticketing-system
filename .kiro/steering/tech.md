# Tech Stack

## Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Authentication**: Session-based (express-session)
- **Password Hashing**: bcrypt

## Frontend
- **Architecture**: Single Page Application (SPA)
- **Stack**: Vanilla JavaScript, HTML5, CSS3
- **No framework**: Pure DOM manipulation, no React/Vue/Angular

## Dependencies
- `express`: Web framework
- `express-session`: Session management
- `pg`: PostgreSQL client
- `bcrypt`: Password hashing
- `dotenv`: Environment variables

## Development
- `nodemon`: Auto-reload during development

## Deployment
- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL container with volume persistence
- **Port**: 3000 (default)

## Common Commands

```bash
# Development
npm run dev          # Start with auto-reload (nodemon)

# Production
npm start            # Start server

# Database
npm run init-db      # Initialize database schema and seed data

# Docker
docker-compose up -d # Start all services
docker-compose down  # Stop all services
```

## Environment Variables

Required in `.env` file:
- `PORT`: Server port (default: 3000)
- `SESSION_SECRET`: Session encryption key (change in production!)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: PostgreSQL connection

## Code Style

- **Module System**: CommonJS (`require`/`module.exports`)
- **Async/Await**: Preferred for async operations
- **Error Handling**: Try-catch blocks with console.error logging
- **SQL**: Parameterized queries ($1, $2) to prevent SQL injection
