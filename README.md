# Eman Jewelers API

Customer authentication and profile API for the Eman Jewelers storefront.

## Setup
1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and configure MongoDB, a strong random JWT secret, and allowed frontend origins.
4. Run `npm run dev`.

## Endpoints
- `POST /api/auth/register` — create a customer account and sign in.
- `POST /api/auth/login` — sign in.
- `POST /api/auth/logout` — clear the session cookie.
- `GET /api/auth/me` — get the current customer.
- `PUT /api/auth/profile` — update name and delivery/contact details.
- `PUT /api/auth/password` — change password (requires current password).
- `DELETE /api/auth/account` — permanently delete account (requires password).
- `GET /api/health` — health check.

Passwords are hashed with bcrypt (12 rounds). Session JWTs are stored in HttpOnly cookies. Configure HTTPS in production and set exact trusted origins. Admin provisioning and admin-only routes must be added separately; public registration always creates customer accounts.

## Deployment
Set environment variables in the hosting provider. Set `CLIENT_ORIGIN` to the deployed storefront origin. If the frontend and API are on different sites, use HTTPS and configure cookie/CORS settings for that deployment. Never commit `.env`.
