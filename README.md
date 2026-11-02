# Ibadah360 Namaz Tracker 

Node.js + Express + MongoDB + plain HTML/CSS/JS.

## Setup
1. Install Node.js and MongoDB (or use a free MongoDB Atlas URI).
2. `npm install`
3. Copy `.env.example` to `.env`, set `MONGO_URI` and a long random `JWT_SECRET`.
4. `npm start`, then open http://localhost:3000

## Rules
- On time: today only, needs confirmation, then locked forever (server enforced).
- Qaza: any past day or today, needs confirmation, can be undone.
- Future days cannot be marked.
