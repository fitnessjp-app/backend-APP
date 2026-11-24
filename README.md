# FitZone Admin — Backend (Node / Express / MongoDB)

Admin-only API. **Admin ID/password are stored in the database (bcrypt-hashed), not in `.env`.**

## Setup
```bash
npm install
cp .env.example .env      # fill MONGO_URI, JWT_SECRET, CLIENT_URL, Cloudinary, SMTP
npm run create-admin      # creates the FIRST owner (asks name / username / password)
npm run dev
```
After that, the owner adds any number of admins (2, 50…) from the app: **Profile → Admins**.

## Roles
- `owner` — everything + add / remove admins + reset their passwords
- `admin` — admissions, plans, members, analytics + manage own name / username / password

## Auth API
| Method | Route | Who |
|---|---|---|
| POST | /api/auth/login | public (rate-limited) |
| GET | /api/auth/me | any admin |
| PUT | /api/auth/profile | own name / username |
| PUT | /api/auth/password | own password (needs current) |
| GET/POST | /api/auth/admins | owner |
| PUT | /api/auth/admins/:id/password | owner |
| DELETE | /api/auth/admins/:id | owner (not self, not last owner) |

Changing a password invalidates all older login tokens.

## Members list (`GET /api/members`)
`search` (name / phone / email) · `status` (active, expiring, expired) · `batch` · `plan` · `gender` ·
`admittedFrom/To` · `expiryFrom/To` · `ageMin/Max` · `sort` (newest, oldest, expiry_soon, expiry_late,
name_asc, name_desc, amount_high, amount_low) · `page` · `limit`. Response includes `counts` for the status chips.

## Deploy (Render / Railway)
- Build: `npm install` · Start: `npm start`
- Env vars: everything from `.env.example`. Set `CLIENT_URL` to your frontend URL (comma-separate several).
- MongoDB Atlas: allow the host's IP (or 0.0.0.0/0).
- Run `npm run create-admin` once on your own computer with the same `MONGO_URI`.

## Receipt QR / PDF
After every admission or renewal the app shows a QR. Scanning it opens `GET /api/receipts/:token` (public, token is a
48-char random string) and the receipt PDF downloads directly. Optional header details: `GYM_NAME`, `GYM_ADDRESS`, `GYM_PHONE` in `.env`.
The QR contains your backend URL, so it only works on a member's phone when the backend is hosted (not `localhost`).
# backend-APP
