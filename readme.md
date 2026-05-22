# Rivox

A workspace app for small-to-mid product teams to manage API keys, tasks, and team permissions in one place. Built as a desktop-first experience with a clean, utilitarian design inspired by Linear and Vercel.

## Features

- **API Keys** - Store secrets, control per-key sharing, and track usage across your team
- **Sticky Board** - Capture tasks and notes in canvas, kanban, or grid layouts
- **Team & Permissions** - Manage users, groups, and granular access controls
- **Issues** - Track and manage project issues
- **Notifications** - Stay updated on team activity
- **Organizations** - Multi-workspace support
- **Discord Auth** - Sign in with Discord OAuth

## Tech Stack

**Frontend**
- React 19 + TypeScript
- Tailwind CSS v4
- Vite 7
- React Router v7
- Tauri v2 (desktop shell)

**Backend**
- Express 5 (Node.js)
- MySQL + Sequelize ORM
- JWT authentication
- Discord OAuth integration

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- MySQL running locally
- Rust toolchain (for Tauri desktop builds)

### Setup

```bash
# Install frontend dependencies
pnpm install

# Install server dependencies
cd server && npm install && cd ..

# Configure environment
cp server/.env.example server/.env
# Edit server/.env with your database and Discord credentials
```

### Database

Create a MySQL database named `rivox_local` and run the schema:

```bash
mysql -u root -p rivox_local < database/schema.sql
```

### Development

```bash
# Run both API server and Vite dev server
pnpm dev:web

# Or run them separately
pnpm dev:api    # API on port 3001
npx vite        # Frontend on port 1420

# Run as Tauri desktop app
pnpm dev
```

### Build

```bash
# Web build
pnpm build

# Tauri desktop build
pnpm tauri build
```

## Project Structure

```
rivox/
├── src/                # React frontend
│   ├── components/     # Shared UI components
│   ├── pages/          # Route pages
│   ├── hooks/          # Custom React hooks
│   └── lib/            # API client & utilities
├── server/             # Express backend
│   └── src/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       └── utils/
├── src-tauri/          # Tauri desktop config & Rust glue
├── database/           # SQL schema & ERD
└── Rivox-branding/     # Brand assets & design explorations
```

## License

Private
