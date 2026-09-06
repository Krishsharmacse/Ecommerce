# Ecommerce Backend Implementation Plan

## Specification Verification

**Verdict: approved as the target specification, but not ready to claim complete implementation yet.**

The attached prompt correctly describes an Amazon/Flipkart-style marketplace backend and gives good production constraints. It must be implemented in phases because the current repository is only a partial TypeScript migration.

### Verified gaps in the current repository

- The old JavaScript/Mongoose runtime still exists and must remain untouched until replacement validation passes.
- The current Prisma schema does not yet contain `RefreshToken`, `Otp`, `Address`, `ShopMember`, `Category`, `ProductImage`, `Cart`, `CartItem`, `OrderAddress`, `Refund`, `WebhookEvent`, `IdempotencyKey`, `ShipmentItem`, `ShipmentEvent`, or notification relationships.
- Authentication, users, shops, cart, refunds, notifications, uploads, vendor, and admin modules are not complete.
- The current payment implementation needs the provider interface, COD handling, refund queue, webhook event persistence, and Redis/PostgreSQL idempotency protection from the specification.
- The current shipment implementation needs the requested module/provider file layout and shipment event history.
- The current workers live under the legacy root `worker/`; they must move to `src/workers/` before legacy cleanup.
- The current route registration is in `src/app.ts`; it must be centralized in `src/routes/index.ts`.
- Tests, seed data, Docker files, Azure storage configuration, and complete SMTP configuration are still required.

### Decisions applied to this plan

1. This is a marketplace backend, not a restaurant or food-delivery backend. The domain uses `shops`, `vendors`, `products`, `orders`, `shipments`, and `admin`.
2. PostgreSQL and Prisma are the only database stack. No MongoDB, Mongoose, ObjectId, or legacy model imports may remain after cleanup.
3. `src/config/redis.ts` owns Redis configuration and `src/lib/redis.ts` owns the shared initialized client. BullMQ, caching, OTP, locks, and rate limiting reuse that client configuration.
4. `src/server.ts` starts the local HTTP server. `src/app.ts` exports the Express app without starting workers, allowing Vercel adapters to import it safely.
5. `src/workers/index.ts` is the only worker process entrypoint. It is never imported by the API.
6. Money is stored as integer paise everywhere, including product prices, order totals, refunds, shipping, tax, discounts, and payment amounts.
7. Razorpay and Shiprocket remain behind provider interfaces so external vendors can be replaced without changing order business logic.
8. Legacy deletion is a final gated step, not an initial destructive action.

## Goal

Rebuild the existing Express/Mongoose backend as a production-oriented TypeScript, Express, Prisma, PostgreSQL, Redis, BullMQ, Razorpay, and courier-based ecommerce backend.

The old JavaScript and MongoDB implementation will be removed after the replacement structure is ready and the new API passes build and integration checks.

## Target Structure

```text
backend/
  src/
    app.ts
    server.ts
    config/
      env.ts
      cors.ts
      redis.ts
      razorpay.ts
      mail.ts
      azure.ts
    lib/
      prisma.ts
      redis.ts
      jwt.ts
      logger.ts
      constants.ts
      errors.ts
    middleware/
      authenticate.ts
      requireRole.ts
      validate.ts
      errorHandler.ts
      notFound.ts
      rateLimit.ts
    services/
      mail.service.ts
      otp.service.ts
      notification.service.ts
      storage.service.ts
      sse.service.ts
      push.service.ts
      price.service.ts
      payment-utils.service.ts
    queues/
      refund.queue.ts
      email.queue.ts
      notification.queue.ts
      shipment.queue.ts
      order.queue.ts
      index.ts
    workers/
      refund.worker.ts
      email.worker.ts
      notification.worker.ts
      shipment.worker.ts
      order.worker.ts
      index.ts
    modules/
      auth/
      users/
      cart/
      orders/
      payments/
      shops/
      notifications/
      uploads/
      public/
      vendor/
      admin/
    routes/
      index.ts
    types/
      express.d.ts
      auth.types.ts
      pagination.types.ts
      common.types.ts
    utils/
      formatCurrency.ts
      pagination.ts
      generateOtp.ts
      generateOrderId.ts
      hash.ts
      dates.ts
  prisma/
    schema.prisma
    seed.ts
    migrations/
  tests/
    auth/
    users/
    products/
    cart/
    orders/
    payments/
    shipments/
  uploads/
  Dockerfile
  docker-compose.yml
  package.json
  tsconfig.json
  .env.example
```

## Architecture Rules

Each feature module follows this pattern:

```text
<module>.routes.ts       HTTP endpoints
<module>.controller.ts   Request/response handling only
<module>.service.ts      Business logic
<module>.schema.ts       Zod validation
<module>.types.ts        Module types and DTOs
```

The request flow is:

```text
route -> middleware -> controller -> service -> Prisma/repository
```

Controllers must not contain business logic or access Prisma directly.

## Phase 1: Remove Legacy Runtime

Remove the old JavaScript and MongoDB implementation:

- `server.js`
- `controllers/`
- `database/`
- `models/`
- old `routes/`
- old `middleware/`
- `EMAILVERIFY/`
- old root worker implementation

The TypeScript API will run from `src/server.ts`, and the queue process will run from `src/workers/index.ts`.

The actual deletion happens only after the acceptance gate at the end of this document. During implementation, the legacy tree is treated as migration reference material and is not mounted by the new API.

## Phase 2: Configuration and Libraries

Implement configuration for:

- Environment variables with Zod validation
- CORS
- PostgreSQL and Prisma
- Redis
- Razorpay
- SMTP mail
- Azure Blob Storage or local development storage

Shared libraries will provide:

- Prisma singleton
- Redis singleton
- JWT signing and verification
- Pino logger
- Application constants
- Typed application errors

## Phase 3: Middleware

Implement:

- JWT authentication
- Role-based authorization
- Zod request validation
- Centralized error handling
- Not-found handling
- Redis-backed rate limiting

Redis will also support caching, OTP expiration, payment locks, and idempotency records.

## Phase 4: Prisma and PostgreSQL

The Prisma schema will model:

- User
- Shop
- Product
- Cart
- CartItem
- Order
- OrderItem
- Payment
- Refund
- Shipment
- Notification
- RefreshToken
- OTP record

Database rules:

- Store all money as integer paise
- Use PostgreSQL CUIDs as primary keys
- Add indexes for common filters and status queries
- Add unique constraints for payment and webhook idempotency
- Use transactions for stock decrement and order creation
- Seed development data through `prisma/seed.ts`

## Phase 5: Feature Modules

Implement the following modules:

### Auth

- Register
- Login
- Refresh token
- Logout
- Password reset
- Email verification
- OTP and optional two-factor authentication

### Users

- Profile management
- Address management
- Account security
- Role-aware user administration

### Products and Shops

- Product CRUD
- Product search and pagination
- Shop CRUD
- Seller ownership checks
- Redis caching and invalidation

### Cart

- Add item
- Update quantity
- Remove item
- Clear cart
- Stock and price validation before checkout

### Orders

- Create order transactionally
- Decrement stock atomically
- Store immutable order item prices
- View customer orders
- Seller and admin order management
- Order status transitions

### Payments

- Razorpay order creation
- HMAC SHA256 signature verification
- Razorpay webhook handling
- Payment status transitions
- Refund creation and tracking
- Duplicate payment protection

Supported payment paths:

- Razorpay UPI
- Razorpay cards
- Razorpay net banking
- Razorpay wallets where enabled
- Cash on delivery as an internal payment method

### Shipments

Create a courier provider abstraction:

```ts
interface ShipmentProvider {
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  trackShipment(trackingNumber: string): Promise<TrackingResult>;
  cancelShipment(shipmentId: string): Promise<void>;
}
```

Implement Shiprocket first, with the ability to add Delhivery or another provider later without changing order business logic.

### Notifications, Uploads, Vendor, and Admin

- Email and in-app notifications
- SSE notification stream
- Product image uploads
- Seller dashboard operations
- Admin moderation and reporting

## Phase 6: Queues and Workers

Queues:

- Order queue
- Shipment queue
- Refund queue
- Email queue
- Notification queue

Background flow:

```text
payment verified
  -> order:paid job
  -> shipment:schedule job
  -> courier provider
  -> shipment record
  -> order status update
```

Workers run as a separate always-on process:

```bash
npm run worker
```

Workers must not be imported into Vercel's serverless API entrypoint.

## Phase 7: Routes

Mount all module routers from `src/routes/index.ts`:

```text
/api/v1/auth
/api/v1/users
/api/v1/products
/api/v1/cart
/api/v1/orders
/api/v1/payments
/api/v1/shops
/api/v1/vendor
/api/v1/admin
/api/v1/notifications
/api/v1/uploads
/api/v1/public
```

Also expose:

```text
GET /health
```

The health endpoint checks both PostgreSQL and Redis connectivity.

## Phase 8: Tests

Add tests for:

- Registration and login
- Authentication failures
- Role authorization
- Product CRUD
- Cart behavior
- Transactional stock decrement
- Order creation
- Razorpay signature verification
- Duplicate payment verification
- Duplicate webhook handling
- Refund processing
- Shipment scheduling
- Redis rate limiting

## Phase 9: Local Development Infrastructure

Add:

- `Dockerfile`
- `docker-compose.yml`
- PostgreSQL service
- Redis service
- API service
- Worker service

Expected commands:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
npm run worker
npm run build
npm test
```

## Phase 10: Final Validation

Before removing the old implementation completely:

1. Run the TypeScript build.
2. Validate and generate Prisma client.
3. Apply migrations to PostgreSQL.
4. Verify API and worker start independently.
5. Test Redis connectivity.
6. Test Razorpay signature and webhook handling.
7. Test shipment provider integration with sandbox credentials.
8. Verify frontend endpoint compatibility.
9. Confirm no Mongoose imports remain.
10. Delete the remaining legacy JavaScript files.

## Implementation Order

The work will be executed in this order so every step remains buildable:

1. Normalize package scripts, TypeScript output paths, environment validation, and shared configuration.
2. Complete the Prisma schema, migrations, seed script, and database singleton.
3. Add shared types, errors, JWT helpers, logging, Redis helpers, validation, authentication, and role middleware.
4. Implement auth and users, then products, shops, and categories.
5. Implement cart and transactional checkout with server-side price and stock calculation.
6. Implement the Razorpay provider, payment records, webhook events, idempotency, COD, and refunds.
7. Implement shipment providers, shipment events, order fulfillment, and workers.
8. Add notifications, email, uploads, vendor, admin, and public routes.
9. Add tests, Docker services, health checks, and deployment configuration.
10. Run the final acceptance gate, verify frontend compatibility, and remove the legacy JavaScript/Mongoose tree.

## Acceptance Gate Before Legacy Deletion

Legacy files may be removed only when all of these checks pass:

- `npm install`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:seed`
- `npm run build`
- `npm test`
- API starts successfully with `npm run dev` or the production start command.
- Worker starts successfully with `npm run worker`.
- PostgreSQL and Redis health checks pass.
- Auth, product, cart, checkout, payment verification, webhook, refund, and shipment tests pass.
- Razorpay and Shiprocket calls are mocked in automated tests and verified against sandbox credentials separately.
- Frontend endpoint compatibility has been checked.
- A repository search returns no imports or references to `mongoose`, `mongodb`, `MongoClient`, `ObjectId`, legacy controllers, legacy models, legacy routes, `server.js`, or the old worker directory.

If any check fails, the legacy implementation remains available for reference and is not deleted.

## Deployment Targets

- API: Vercel serverless functions
- Worker: Railway or Render
- PostgreSQL: Neon or Supabase
- Redis: Upstash TCP Redis
- Payments: Razorpay
- Courier: Shiprocket initially
- Storage: Azure Blob Storage in production, local `uploads/` only in development

The API and worker must be deployed separately because Vercel functions cannot keep persistent BullMQ listeners alive.