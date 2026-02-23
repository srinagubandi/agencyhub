# Health Scale Digital — Agency Management App

Full-stack agency management platform for digital marketing agencies.

## Stack
- **Backend:** Node.js, Express, PostgreSQL, JWT Auth
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS (TailAdmin template)
- **Storage:** Railway Volume for media uploads

## Features
- Role-based access: Super Admin, Manager, Worker, Client Portal
- Client → Account → Website → Campaign hierarchy
- Time tracking with cascading dropdowns
- Change log (system + manual entries)
- Reports by employee, client, campaign
- In-app notifications
- Image uploads (agency logo, client logos, worker photos)

## Getting Started

### Backend
```bash
cd backend
cp .env.example .env      # fill in your values
npm install
npm run migrate           # sets up DB + seeds admin@agency.com / Admin@123456
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Environment Variables

See `backend/.env.example` and `frontend/.env.example`.

## Default Login
After running migrate:
- **Email:** admin@agency.com
- **Password:** Admin@123456

## Deployment (Railway)
1. Create a Railway project with a Node.js service and PostgreSQL plugin
2. Set env vars from `.env.example`
3. Build command: `cd frontend && npm install && npm run build && cp -r dist ../backend/public`
4. Start command: `cd backend && npm install && npm start`
