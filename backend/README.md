# Ecommerce Backend

TypeScript Express marketplace backend for products, shops, carts, orders, Razorpay payments, Shiprocket shipments, PostgreSQL, Redis, and BullMQ.

## Setup

```bash
npm install
copy .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Set real development values in `.env`. Required services are PostgreSQL and Redis. Razorpay, SMTP, and Shiprocket credentials are required when their flows are used.

## Development

```bash
npm run dev
npm run worker
```

The API runs on `PORT` and exposes `/health` plus `/api/v1` routes. The worker is a separate process and must not be started inside the API deployment.

## Verification

```bash
npm run build
npm test
```

## Docker

```bash
docker compose up --build
```

The compose file runs PostgreSQL, Redis, API, and worker services. Run Prisma migrations from the backend environment before using the API.

## Core endpoints

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/products
GET  /api/v1/shops
GET  /api/v1/cart
POST /api/v1/orders
POST /api/v1/payments/:orderId/order
POST /api/v1/payments/verify
POST /api/v1/payments/webhook
GET  /api/v1/notifications
GET  /health
```

All payment amounts are integer paise. Razorpay signatures and webhooks are verified server-side. Card data is never stored.