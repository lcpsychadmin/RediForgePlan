# RediForge Planning Application - Quick Start Guide

## ✨ Project Overview

Complete full-stack React + Node.js + PostgreSQL planning application with:
- ✅ JWT-based authentication with TOTP MFA
- ✅ Role-based access control (admin, analyst, viewer)
- ✅ Comprehensive REST API (50+ endpoints)
- ✅ Complete React UI with Material-UI
- ✅ Real-time data fetching with React Query
- ✅ Week-view schedule with drag-and-drop

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js v16+ installed
- PostgreSQL 12+ running locally
- Git (optional)

### 1. Setup Database

```bash
# Create database
createdb rediforge_db

# Run migrations
cd /Users/wescollins/Documents/RediForge\ -\ Plan/app
psql rediforge_db < db/migrations/001_initial_schema.sql

# (Optional) Seed sample data
psql rediforge_db < db/seeds/01_seed_data.sql
```

### 2. Install Dependencies

```bash
cd "/Users/wescollins/Documents/RediForge - Plan/app"

# Install all (root, client, server)
npm install && npm install --prefix client && npm install --prefix server
```

### 3. Start the Application

**Terminal 1 - Backend Server:**
```bash
npm run dev --prefix server
# Server running on http://localhost:5000
```

**Terminal 2 - Frontend Dev Server:**
```bash
npm run dev --prefix client
# Frontend running on http://localhost:5173
```

### 4. Login & Explore

1. Open http://localhost:5173
2. **Admin Login:**
   - Email: `admin@example.com`
   - Password: `AdminPass123!`
3. Verify TOTP MFA (demo token: use authenticator or check seed data)
4. Click "Projects" or "Dashboard"
5. Navigate through the 4 main views:
   - **Plan** - Data objects + task groups
   - **Inventory** - Table view with filtering
   - **Priorities** - Tasks by priority
   - **Schedule** - Week calendar

## 📁 Project Structure

```
app/
├── client/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── pages/         # 9 pages (5 new)
│   │   ├── components/    # 25+ components
│   │   ├── hooks/         # 5 React Query hooks
│   │   ├── layout/        # 4 layout components
│   │   ├── contexts/      # Auth context
│   │   └── api/           # Axios client
│   ├── package.json       # Frontend deps
│   └── vite.config.ts     # Vite config
│
├── server/                 # Express + TypeScript backend
│   ├── src/
│   │   ├── routes/        # 11 route files
│   │   ├── services/      # 7 service files
│   │   ├── middleware/    # Auth + error handling
│   │   ├── auth/          # Auth controller/service
│   │   └── utils/         # Response formatting
│   ├── package.json       # Backend deps
│   └── tsconfig.json      # TypeScript config
│
├── db/                    # Database
│   ├── schema.sql         # Full schema (16 tables)
│   ├── migrations/        # Migration files
│   ├── seeds/             # Sample data
│   └── *.md               # Database documentation
│
├── API_ENDPOINTS.md       # Complete API reference (1000+ lines)
├── FRONTEND_DOCUMENTATION.md  # Frontend guide (500+ lines)
├── FRONTEND_MANIFEST.md       # File manifest
└── QUICK_START.md         # This file
```

## 🔑 Test Credentials

### Admin Account (Full Access)
```
Email: admin@example.com
Password: AdminPass123!
Role: admin
MFA: Enabled
```

### Analyst Account (Data Management)
```
Email: analyst@example.com
Password: AnalystPass123!
Role: analyst
MFA: Enabled
```

### Viewer Account (Read-Only)
```
Email: viewer@example.com
Password: ViewerPass123!
Role: viewer
MFA: Enabled
```

**Note:** For MFA, check `db/seeds/01_seed_data.sql` for TOTP secrets or use a test authenticator.

## 🎯 Main Features

### Authentication
- Email + password login
- TOTP 2-factor authentication
- JWT tokens (7-day expiration)
- Session tracking in database
- Role-based access control

### Planning Dashboard
- **Projects Page** - Hierarchical view (Program → Cycle → Project)
- **Plan Tab** - Cards for data objects and task groups
- **Inventory Tab** - Table view with advanced filtering
- **Priorities Tab** - Tasks grouped by urgency
- **Schedule Tab** - Week-view calendar with drag-and-drop

### Data Management
- Create/read/update/delete programs, cycles, projects
- Manage data objects with complexity levels
- Track task groups and individual tasks
- Add task dependencies
- Schedule tasks with drag-and-drop
- Export inventory to CSV

### Analytics
- Project completion percentage
- Task status breakdown (complete, in-progress, blocked)
- Priority categorization
- User assignment tracking

## 📊 Database Schema

### 16 Tables
- users (auth)
- user_sessions (JWT tracking)
- programs (top-level planning)
- mock_cycles (project cycles)
- projects (execution containers)
- global_objects (canonical objects)
- project_objects (execution objects)
- task_groups (task containers)
- tasks (individual work items)
- task_dependencies (object relationships)
- schedule (scheduled work)
- audit_logs (change tracking)
- Plus 4 support tables for enums/constraints

### Key Features
- UUID primary keys
- Fully normalized (3NF)
- Cascading deletes
- JSONB audit logging
- 20+ strategic indexes
- Materialized views for reporting

## 🔗 API Architecture

### Base URL
```
http://localhost:5000/api
```

### Main Endpoints
```
/programs                    # List/create programs
/mock-cycles                 # Manage project cycles
/projects                    # Projects management
/project-objects             # Data objects
/tasks                       # Task management
/schedule                    # Schedule items
/priorities                  # Priority views
/audit                       # Audit logs (admin only)
```

### Authentication
```
GET /auth/login                  # Email/password
POST /auth/mfa/verify            # TOTP verification
POST /auth/logout                # Session invalidation
POST /auth/user (admin only)     # Create users
```

All requests require: `Authorization: Bearer {jwt_token}`

## 🛠️ Development Commands

### Frontend
```bash
npm run dev --prefix client      # Start dev server (http://localhost:5173)
npm run build --prefix client    # Production build
npm run preview --prefix client  # Preview build
npm run lint --prefix client     # Run ESLint
```

### Backend
```bash
npm run dev --prefix server      # Start dev server (http://localhost:5000)
npm run build --prefix server    # Compile TypeScript
npm start --prefix server        # Run compiled build
npm run migrate --prefix server  # Run migrations
```

### Database
```bash
# Connection
psql rediforge_db

# Useful queries
SELECT * FROM programs;
SELECT * FROM users;
SELECT COUNT(*) FROM tasks;
SELECT COUNT(*) FROM audit_logs;
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Database Connection Error
```bash
# Check PostgreSQL is running
brew services list  # macOS
sudo systemctl status postgresql  # Linux

# Check connection string in server/.env
cat server/.env | grep DATABASE_URL
```

### CORS Issues
```
Error: "Access to XMLHttpRequest blocked by CORS policy"
→ Backend CORS is configured in server.ts
→ Check frontend API_URL matches backend port
```

### Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules client/node_modules server/node_modules
npm install && npm install --prefix client && npm install --prefix server
```

### Hot Reload Not Working
```bash
# Vite should auto-reload. If not, try:
npm run dev --prefix client
# Then manually refresh browser
```

## 📈 Performance Tips

1. **React Query DevTools** - Install browser extension to see cache
2. **Network Tab** - Check API response times in DevTools
3. **Component Profiler** - Use React DevTools to find slow renders
4. **Database Indexes** - Schema already includes 20+ indexes
5. **Pagination** - Inventory table supports limit/offset

## 🔒 Security Features

- ✅ Password hashing with bcryptjs (10 salt rounds)
- ✅ JWT signed with HS256
- ✅ TOTP secrets encrypted with AES-256-CBC
- ✅ SQL injection protection via parameterized queries
- ✅ CORS configured
- ✅ Role-based access control
- ✅ Audit logging of all changes
- ✅ Session invalidation on logout

## 📱 Browser Support

✓ Chrome 90+
✓ Firefox 88+
✓ Safari 14+
✓ Edge 90+
✓ Mobile browsers

## 🎨 Customization

### Theme Colors
Edit in `client/src/App.tsx`:
```typescript
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },    // Change blue
    secondary: { main: '#dc004e' },  // Change pink
  },
});
```

### Status Colors
Edit in `client/src/components/shared/StatusChip.tsx`:
```typescript
const statusColorMap = {
  not_started: { background: '#e3f2fd', color: '#1976d2' },
  // ... customize here
};
```

### API Base URL
Edit in `client/src/api/client.ts`:
```typescript
baseURL: process.env.VITE_API_URL || 'http://localhost:5000',
```

## 📚 Documentation

- **API_ENDPOINTS.md** - 50+ endpoints with request/response examples
- **FRONTEND_DOCUMENTATION.md** - React components and hooks guide
- **FRONTEND_MANIFEST.md** - File listing and structure
- **db/DATABASE_DOCUMENTATION.md** - Database schema details
- **db/QUICK_REFERENCE.md** - Common database operations

## 🚢 Deployment (Heroku)

### Backend Deployment
```bash
# Create Heroku app
heroku create rediforge-api

# Set environment variables
heroku config:set -a rediforge-api DATABASE_URL=postgresql://...
heroku config:set -a rediforge-api JWT_SECRET=your-secret-key

# Deploy
git push heroku main
```

### Frontend Deployment
```bash
# Build optimized
npm run build --prefix client

# Deploy to Vercel/Netlify
vercel deploy client/dist

# Or build Docker image
docker build -t rediforge:latest .
```

## 🎓 Learning Resources

1. **React** - https://react.dev
2. **Material-UI** - https://mui.com
3. **React Query** - https://tanstack.com/query
4. **Express.js** - https://expressjs.com
5. **PostgreSQL** - https://postgresql.org
6. **TypeScript** - https://typescriptlang.org

## ❓ FAQ

**Q: How do I reset the database?**
```bash
dropdb rediforge_db
createdb rediforge_db
psql rediforge_db < db/migrations/001_initial_schema.sql
psql rediforge_db < db/seeds/01_seed_data.sql
```

**Q: Can I change the port numbers?**
- Frontend: Change `vite.config.ts` port
- Backend: Change `PORT` in `server/.env`

**Q: How do I access the API directly?**
```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/api/programs
```

**Q: Where are logs stored?**
- Frontend: Browser console (F12)
- Backend: stdout/stderr in terminal
- Database: Check audit_logs table

**Q: How do I add a new role?**
1. Update database enum: `CREATE TYPE user_role AS ENUM (...)`
2. Update middleware: `requireRole('newRole')`
3. Update components: Add permissions checks

## 🎉 You're All Set!

Your RediForge planning application is ready to use. Start with the quick start commands above, log in with the provided credentials, and explore the interface.

For detailed information, refer to the documentation files included in the project.

**Happy planning! 🚀**

---

*Last Updated: 2026-06-15*
*Version: 1.0*
*Created with React 18, Node 18, PostgreSQL 14*
