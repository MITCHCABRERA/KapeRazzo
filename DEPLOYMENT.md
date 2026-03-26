# Simple production deployment

## Recommended
Deploy as a single Node service so the backend serves the frontend and API from the same domain.

## Environment variables
Set the values from `backend/.env.example` in your host dashboard.

## Firebase checklist
- Enable Email/Password and Google in Authentication
- Add your deployed domain to Authorized domains
- Enable Storage and apply profile photo rules

## Render example
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`

## Smoke tests after deploy
- `/api/health` returns `{ ok: true }`
- Customer login works
- Google login works
- Admin dashboard loads
- Order and reservation submission work
- Profile photo upload works
