# Ticketing System

Sistem ticketing lightweight yang dibangun dengan Node.js, Express, PostgreSQL, dan vanilla JavaScript.

## Fitur

- **User Management**: 3 role (Admin, Agent, Customer)
- **Ticket Management**: Create, view, update, delete tickets
- **Status Tracking**: Open, In Progress, Resolved, Closed
- **Priority Levels**: Low, Medium, High, Urgent
- **Assignment**: Assign tickets ke agents
- **Comments**: Internal notes dan public comments
- **Product Management**: Admin dapat mengelola daftar produk
- **Dashboard**: Statistik tickets, top customers, dan produk dengan issue terbanyak
- **Search & Filter**: Cari dan filter tickets berdasarkan status, priority, dll

## Tech Stack

- Backend: Node.js + Express
- Database: PostgreSQL
- Frontend: HTML, CSS, Vanilla JavaScript
- Authentication: Session-based
- Deployment: Docker & Docker Compose

## Instalasi

### Menggunakan Docker (Recommended)

1. Clone repository
2. Copy file environment:
```bash
cp .env.example .env
```

3. Jalankan dengan Docker Compose:
```bash
docker-compose up -d
```

4. Aplikasi akan berjalan di `http://localhost:3000`

### Manual Installation

1. Install dependencies:
```bash
npm install
```

2. Setup PostgreSQL database dan buat database `ticketing_db`

3. Copy dan edit file `.env`:
```bash
cp .env.example .env
```

4. Initialize database:
```bash
npm run init-db
```

5. Jalankan aplikasi:
```bash
npm start
```

Untuk development dengan auto-reload:
```bash
npm run dev
```

## Default Credentials

Setelah instalasi, gunakan credentials berikut untuk login:

- **Username**: admin
- **Password**: admin123

**PENTING**: Segera ganti password default setelah login pertama kali!

## Database Schema

### Users
- id, username, password, full_name, email, role, is_active, timestamps

### Products
- id, name, description, is_active, timestamps

### Tickets
- id, ticket_number, title, description, status, priority, customer_id, assigned_to, product_id, timestamps

### Comments
- id, ticket_id, user_id, comment, is_internal, created_at

## API Endpoints

### Authentication
- POST `/api/auth/login` - Login
- POST `/api/auth/logout` - Logout
- GET `/api/auth/me` - Get current user

### Tickets
- GET `/api/tickets` - List tickets (dengan filter)
- GET `/api/tickets/:id` - Get ticket detail
- POST `/api/tickets` - Create ticket
- PUT `/api/tickets/:id` - Update ticket
- DELETE `/api/tickets/:id` - Delete ticket (admin only)

### Comments
- GET `/api/comments/ticket/:ticketId` - Get ticket comments
- POST `/api/comments` - Add comment

### Users (Admin only)
- GET `/api/users` - List users
- GET `/api/users/agents` - List agents
- POST `/api/users` - Create user
- PUT `/api/users/:id` - Update user
- POST `/api/users/:id/reset-password` - Reset password

### Products
- GET `/api/products` - List active products
- GET `/api/products/:id` - Get product detail
- POST `/api/products` - Create product (admin only)
- PUT `/api/products/:id` - Update product (admin only)
- DELETE `/api/products/:id` - Delete product (admin only)

### Dashboard
- GET `/api/dashboard/stats` - Get statistics (includes top customers and top products by issue count)

## User Roles

### Admin
- Full access ke semua fitur
- Manage users
- Manage semua tickets
- View internal notes

### Agent
- View dan manage assigned tickets
- View semua tickets
- Add internal notes
- Assign tickets

### Customer
- Create tickets
- View own tickets
- Add comments
- Update own ticket details

## Environment Variables

```
PORT=3000
SESSION_SECRET=your-secret-key-change-this
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketing_db
DB_USER=postgres
DB_PASSWORD=postgres
```

## Development

Struktur folder:
```
├── config/          # Database configuration
├── database/        # SQL schema
├── middleware/      # Express middleware
├── routes/          # API routes
├── public/          # Frontend files
│   ├── css/
│   ├── js/
│   └── index.html
├── scripts/         # Utility scripts
├── server.js        # Main server file
└── docker-compose.yml
```

## Production Deployment

1. Update `SESSION_SECRET` di `.env` dengan random string yang aman
2. Update database credentials
3. Gunakan reverse proxy (nginx) untuk SSL/TLS
4. Setup backup database secara regular
5. Monitor logs dan performance

## License

MIT
