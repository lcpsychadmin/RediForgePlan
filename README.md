# RediForge - Full-Stack Web Application

A complete full-stack web application built with React + TypeScript (frontend), Node.js + Express (backend), and PostgreSQL (database). This project is configured for local development and deployment to Heroku.

## Project Structure

```
/app
  /client              # React + Vite + TypeScript frontend
  /server              # Express + Node.js backend
  /db                  # PostgreSQL migrations and seeds
  package.json         # Root monorepo configuration
  Procfile             # Heroku deployment configuration
  README.md            # This file
```

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast dev environment
- **Material-UI (MUI)** for component library
- **React Router v6** for navigation
- **Axios** for API calls

### Backend
- **Express.js** for REST API server
- **PostgreSQL** for data persistence
- **Node.js** with TypeScript support

### Deployment
- **Heroku** for hosting
- **Heroku Postgres** for managed database

## Prerequisites

Before you begin, ensure you have installed:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [PostgreSQL](https://www.postgresql.org/download/) (for local development)
- [Git](https://git-scm.com/)
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd app
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
npm install --prefix client

# Install server dependencies
npm install --prefix server
```

### 3. Setup Local Database

```bash
# Create a local PostgreSQL database
createdb rediforge

# Run migrations
psql -U postgres -d rediforge -f db/schema.sql

# (Optional) Seed with sample data
psql -U postgres -d rediforge -f db/seeds/01_users.sql
```

### 4. Configure Environment Variables

Create `.env` files in both client and server directories:

**client/.env**
```
VITE_API_URL=http://localhost:5000/api
```

**server/.env**
```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/rediforge
```

### 5. Start Development Server

```bash
# Run both frontend and backend concurrently
npm run dev

# Or run separately:
npm run client   # React dev server (port 3000)
npm run server   # Express server (port 5000)
```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:5000/api/health`.

## Folder Overview

### `/client` - React Frontend
- `src/` - Source code
  - `components/` - Reusable React components
  - `contexts/` - React context providers (auth, etc.)
  - `pages/` - Page components for routes
  - `api/` - Axios API client setup
  - `App.tsx` - Main app component
  - `main.tsx` - Entry point
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Frontend dependencies
- `.env.example` - Environment variables template

### `/server` - Express Backend
- `src/`
  - `server.ts` - Main Express app
  - `db.ts` - PostgreSQL connection
  - `routes/` - API route handlers
  - `middleware/` - Custom middleware
- `tsconfig.json` - TypeScript configuration
- `package.json` - Backend dependencies
- `.env.example` - Environment variables template

### `/db` - Database
- `schema.sql` - Base database schema
- `migrations/` - Versioned database migrations
- `seeds/` - Sample data for development
- `README.md` - Database documentation

## Deployment to Heroku

### Prerequisites
- Heroku account (free tier available)
- Heroku CLI installed
- Git repository initialized

### Step 1: Login to Heroku

```bash
heroku login
```

### Step 2: Create Heroku App

```bash
cd app
heroku create your-app-name
```

### Step 3: Add PostgreSQL Add-on

```bash
heroku addons:create heroku-postgresql:hobby-dev --app your-app-name
```

### Step 4: Set Environment Variables

```bash
heroku config:set NODE_ENV=production --app your-app-name
```

The `DATABASE_URL` is automatically set by the Heroku Postgres add-on.

### Step 5: Deploy

```bash
git push heroku main
```

### Step 6: Run Database Migrations

```bash
# SSH into your Heroku app
heroku ps:exec --app your-app-name

# Run migrations
psql $DATABASE_URL < db/migrations/001_initial_schema.sql

# Exit
exit
```

Or use Heroku releases:

```bash
heroku releases:create --app your-app-name --description "Initial migration"
```

### Step 7: View Your App

```bash
heroku open --app your-app-name
```

## Build for Production

### Frontend

```bash
npm run build --prefix client
```

This generates an optimized build in `client/dist/`.

### Backend

```bash
npm run build --prefix server
```

This generates compiled JS in `server/dist/`.

### Full Build

```bash
npm run build
```

## Available Scripts

### Root Level

```bash
npm run dev              # Start both frontend and backend
npm run build            # Build both frontend and backend
npm run start            # Start only the server
npm run server           # Start only backend dev
npm run client           # Start only frontend dev
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with sample data
```

### Client

```bash
cd client
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint
```

### Server

```bash
cd server
npm run dev              # Start with nodemon
npm run build            # Compile TypeScript
npm run start            # Start compiled server
npm run lint             # Run ESLint
```

## API Endpoints

### Health Check

```
GET /api/health
```

Returns server status.

## Database Migrations

See [db/README.md](./db/README.md) for detailed migration documentation.

## Troubleshooting

### Frontend won't connect to backend
- Check that the backend is running on port 5000
- Verify `VITE_API_URL` in `client/.env`
- Check CORS settings in `server/src/server.ts`

### Database connection error
- Ensure PostgreSQL is running
- Verify `DATABASE_URL` in `server/.env`
- Check database credentials

### Heroku deployment fails
- Check logs: `heroku logs --tail --app your-app-name`
- Ensure `Procfile` is in the root `/app` directory
- Verify all dependencies are listed in `package.json`

## Authentication

The frontend includes an `AuthContext` placeholder. Authentication will be implemented in the next iteration of this project.

## Next Steps

1. Implement user authentication
2. Add protected routes
3. Expand database schema for your app
4. Add form validation
5. Implement error boundaries
6. Add unit and integration tests

## License

This project is licensed under the MIT License.

## Support

For issues or questions, please create a GitHub issue in the repository.
