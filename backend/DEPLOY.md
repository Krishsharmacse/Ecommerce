# Deployment

## Postgres

Create a Neon or Supabase PostgreSQL project and set `DATABASE_URL` with `sslmode=require`. Run `npm run prisma:deploy` from a trusted deployment step. Neon and Supabase free plans have limited compute, storage, and connection capacity; the commonly advertised baseline is about 0.5 GB database storage, but quotas and pause rules change, so confirm the current plan page before launch.

## Redis

Create an Upstash Redis database and use its `rediss://` TCP URL in `REDIS_URL`. The free plan is intended for development and low traffic, with a small storage limit and a daily command quota that has changed over time. Monitor command usage because rate limiting, cache reads, and BullMQ bookkeeping all consume Redis commands.

## Vercel API

1. Set the backend root directory to `backend` and deploy with the included `vercel.json`.
2. Add every variable from `.env.example` to the Vercel project.
3. Run migrations separately with `npm run prisma:deploy` before sending traffic.
4. Keep webhook requests under the function body/time limits and configure Razorpay's webhook URL as `/api/v1/payments/webhook`.

Vercel's free tier has execution-duration, request, bandwidth, and serverless concurrency limits. It must host only the API. It cannot host a persistent BullMQ listener.

## Worker

Deploy the same repository to Railway or Render with a separate worker service. Build with `npm run build` and start with `npm run worker`. Add the same database, Redis, courier, Razorpay, JWT, and SMTP variables. Railway's current free usage is generally a trial or credit-based allowance rather than an unlimited always-on free tier; Render's free services sleep when idle and are unsuitable for latency-sensitive production workers. Confirm current limits before choosing a provider.

The worker must remain a separate always-on process because BullMQ requires a persistent Redis connection and listener.