# Roadside Assistance MVP

This is a full-stack MVP scaffold for a roadside assistance platform built with:

- **Mobile app:** Expo + React Native + Expo Router + TypeScript
- **Backend:** Node.js + Express + Socket.io + TypeScript
- **Database/Auth/Storage:** Supabase
- **Maps / location:** Expo Location ready, Google Maps-ready integration points

## Included

- Customer flow
  - View nearby mechanics
  - Create a booking
  - Track booking status in real time
- Mechanic flow
  - Toggle availability
  - View open jobs
  - Accept a job
  - Update status to arrived / completed
- Realtime booking updates with Socket.io
- Supabase schema and seed examples
- Clean folder structure for scaling

## What you still need to configure

- Supabase project URL / anon key / service role key
- Google Maps API key if you want full maps rendering and directions
- SMS/OTP provider like Twilio or MSG91
- Razorpay or Stripe for payments
- FCM push notifications

## Structure

- `mobile/` → Expo app
- `backend/` → Express API + Socket.io server
- `docs/supabase-schema.sql` → SQL schema
- `docs/env.example.*` → environment variables

## Run

### 1. Supabase
Create a Supabase project, then run `docs/supabase-schema.sql` in the SQL editor.

### 2. Backend
```bash
cd backend
npm install
cp ../docs/env.example.backend .env
npm run dev
```

### 3. Mobile
```bash
cd mobile
npm install
cp ../docs/env.example.mobile .env
npx expo start
```

## Notes

This is an **MVP foundation**, not a finished production app. It is structured so you can now extend it with:
- OTP login
- Google Maps routes + ETA
- payments
- notifications
- admin tools
- service proofs and image uploads
