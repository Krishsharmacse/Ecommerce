# Complete API & System Routes Specification

**Base URL**: `http://localhost:5000/api/v1`  
**WebSocket URL**: `ws://localhost:5000/ws` (or `wss://` with TLS in production)  
**Environment Prefix**: `/api/v1`  
**ID Format**: High-entropy **CUID v2 / CUID** strings across all entities (`@default(cuid())`), eliminating sequential integer ID enumeration vulnerabilities.

---

## 1. Authentication, Security Headers & Trust Boundaries

### Headers & Protocols
* **Authorization**: `Authorization: Bearer <accessToken>` (15-minute validity).
* **WebSocket Authentication**: Supported via `Authorization: Bearer <token>`, `Sec-WebSocket-Protocol: <token>`, or `?token=<token>`.
* **Transport Security**: `wss://` and `https://` enforced in production via reverse-proxy TLS termination.
* **Security Headers**: Managed by Helmet in `app.ts` (`Content-Security-Policy: default-src 'none'`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Origin-Agent-Cluster: ?1`).
* **CORS**: Strict origin whitelist (`http://localhost:3000` or production frontend URL) with `credentials: true`.
* **Request Tracing**: `X-Request-Id` injected on all requests for end-to-end distributed tracing.

### Rate Limiting Tiers
All rate limiters are Redis-backed (`rate-limiter-flexible`) keyed by client IP:
* **Global Rate Limit**: `200 requests / 15 minutes` per IP (applied across all endpoints).
* **Auth Rate Limit**: `10 requests / 1 minute` per IP (applied to `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`). Keyed by IP to prevent alias bypass.
* **OTP Rate Limit**: `5 requests / 5 minutes` per IP (applied to `/auth/verify-otp`, `/auth/verify-email`, `/auth/reset-password`). All OTPs are time-expired (10 min) and single-use (`consumedAt`).

### RBAC Roles
* `CUSTOMER`: Standard shopper.
* `VENDOR`: Store manager / merchant (manages owned shop and products).
* `ADMIN`: Platform administrator with unrestricted access.

---

## 2. Authentication & User Routes (`/api/v1/auth` & `/api/v1/users`)

*Compatibility Note: `/api/v1/user/*` is also supported as an alias for client compatibility.*

| Method | Endpoint | Auth | Rate Limit | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Auth (10/min) | Registers a new user. Supports both `firstname`/`lastname` and `firstName`/`lastName`. Returns user profile & token pair. |
| `POST` | `/auth/login` | Public | Auth (10/min) | Authenticates with email and password. Returns access and refresh tokens (both top-level and nested). |
| `POST` | `/auth/refresh` | Public | Auth (10/min) | Rotates refresh token and issues a new access token. Revokes previous token in DB. |
| `POST` | `/auth/logout` | Public | Auth (10/min) | Revokes active refresh token in PostgreSQL database. |
| `POST` | `/auth/forgot-password` | Public | Auth (10/min) | Issues a 6-digit password reset OTP and enqueues an email. |
| `POST` | `/auth/reset-password` | Public | OTP (5/5min) | Validates OTP and updates the account password in a transaction. |
| `POST` | `/auth/verify-email` | Public | OTP (5/5min) | Validates email verification OTP and marks email verified. |
| `POST` | `/auth/verify-otp` | Public | OTP (5/5min) | General OTP verification endpoint. |
| `GET` | `/auth/google` | Public | Global | Initiates Google OAuth with cryptographically secure CSRF state stored in Redis (5-minute TTL). |
| `GET` | `/auth/google/callback` | Public | Global | Verifies state (consumed immediately on use) and redirects to frontend with auth tokens. |
| `GET` | `/users/me` | Bearer Token | Global | Retrieves the profile of the currently logged-in user. |
| `GET` | `/users/profile` | Bearer Token | Global | Alias for `/users/me`. |
| `PATCH` | `/users/me` | Bearer Token | Global | Updates profile (`firstName`, `lastName`, `phone`). Mass assignment strictly prevented via Zod schema parsing. |
| `GET` | `/users/me/addresses` | Bearer Token | Global | Lists all saved delivery addresses for the user. |
| `POST` | `/users/me/addresses` | Bearer Token | Global | Adds a new delivery address (supports setting as default). |
| `DELETE` | `/users/me/addresses/:id` | Bearer Token | Global | Deletes an address. **Ownership enforced**: queries `where: { id, userId }`. |

---

## 3. Product Catalog Routes (`/api/v1/products`)

| Method | Endpoint | Auth | Allowed Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/products` | Public | Anyone | Lists active products with pagination, search, category & price filters. |
| `GET` | `/products/:id` | Public | Anyone | Retrieves detailed product information including images and stock. |
| `POST` | `/products` | Bearer Token | `VENDOR`, `ADMIN` | Creates product. Asserts vendor owns approved shop (`assertShopAccess`). |
| `PATCH` | `/products/:id` | Bearer Token | `VENDOR`, `ADMIN` | Updates product. **Ownership verified**: only shop owner can modify. `shopId` modification blocked in schema. |
| `DELETE` | `/products/:id` | Bearer Token | `VENDOR`, `ADMIN` | Soft-deletes product (`isActive: false`). **Ownership verified**. |

---

## 4. Multi-Vendor Shop Routes (`/api/v1/shops`)

*Compatibility Note: `/api/v1/shop/*` is also supported as an alias.*

| Method | Endpoint | Auth | Allowed Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/shops` | Public | Anyone | Lists all approved shops. |
| `GET` | `/shops/all` | Public | Anyone | Alias for `/shops`. |
| `GET` | `/shops/:id` | Public | Anyone | Fetches single shop by ID. |
| `POST` | `/shops` | Bearer Token | `VENDOR`, `ADMIN` | Registers a storefront. Creates shop and assigns creator as member. |
| `POST` | `/shops/create` | Bearer Token | `VENDOR`, `ADMIN` | Alias for creating a shop. |
| `PATCH` | `/shops/:id` | Bearer Token | `VENDOR`, `ADMIN` | Updates shop details. **Ownership verified**: checks `ShopMember` table. Mass assignment prevented. |
| `DELETE` | `/shops/:id` | Bearer Token | `VENDOR`, `ADMIN` | Deactivates or suspends a shop. **Ownership verified**. |

---

## 5. Cart Management Routes (`/api/v1/cart`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/cart` | Bearer Token | Retrieves current items in the user's active shopping cart (`where: { userId }`). |
| `POST` | `/cart/items` | Bearer Token | Adds a product and quantity to the cart. Validates active stock. |
| `PATCH` | `/cart/items/:id` | Bearer Token | Updates quantity. **Ownership verified**: scoped to `where: { id, cart: { userId } }`. |
| `DELETE` | `/cart/items/:id` | Bearer Token | Removes item. **Ownership verified**: scoped to `where: { id, cart: { userId } }`. |
| `DELETE` | `/cart` | Bearer Token | Clears all items from the authenticated user's cart. |

---

## 6. Orders & Checkout Routes (`/api/v1/orders`)

| Method | Endpoint | Auth | Allowed Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/orders` | Bearer Token | Any Authenticated | Lists orders. Customers see their own; Vendors/Admins see relevant shop/all orders. |
| `GET` | `/orders/:id` | Bearer Token | Any Authenticated | Gets single order details. **Ownership verified**: `order.userId === userId` or Admin. |
| `POST` | `/orders` | Bearer Token | `CUSTOMER`, `ADMIN` | Creates an order from cart items, deducting stock atomically in a transaction. Supports idempotency key. |
| `POST` | `/orders/:id/cancel` | Bearer Token | Any Authenticated | Cancels order. **Strict ownership check**: `order.userId === userId` or Admin. Restores product inventory in a database transaction and emits `order.cancelled` event. |

---

## 7. Payments & Webhook Routes (`/api/v1/payments`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/payments/create-order` | Bearer Token | Creates a Razorpay order. **Amount is 100% server-calculated from `order.totalPaise`**; client amounts are never accepted. Asserts order ownership. |
| `POST` | `/payments/verify` | Bearer Token | Verifies HMAC-SHA256 client payment signature (`razorpay_signature`). Acquires Redis lock to prevent race conditions. |
| `POST` | `/payments/webhook` | Public (HMAC Verified) | Receives direct webhooks from Razorpay. **Replay protected**: rejects events older than 15 minutes. **Idempotency guaranteed**: checks `webhookEvent.eventId` in DB. |

---

## 8. In-App Notifications & File Uploads

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/notifications` | Bearer Token | Lists user's notifications. |
| `PATCH` | `/notifications/:id/read`| Bearer Token | Marks notification as read. Ownership verified. |
| `POST` | `/uploads/images` | Bearer Token (`VENDOR`, `ADMIN`) | Uploads image assets (max 5MB). **MIME type filtered**: strictly allows `image/jpeg`, `image/png`, `image/webp`, `image/gif`. **SVGs and executables are blocked** to prevent stored XSS. |

---

## 9. Real-Time WebSocket API (`/ws`)

### Connection:
```javascript
// Header/subprotocol (preferred) or query param
const ws = new WebSocket('ws://localhost:5000/ws', ['access-token', accessToken]);
// Or
const ws = new WebSocket(`ws://localhost:5000/ws?token=${accessToken}`);
```

### Server-to-Client Events:
| Event Name | Payload | Trigger |
| :--- | :--- | :--- |
| `order.confirmed` | `{ orderId, totalAmount, status }` | Dispatched by `order.worker.ts` when order is confirmed. |
| `order.cancelled` | `{ orderId }` | Dispatched when an order is cancelled and inventory is restored. |
| `payment.captured`| `{ orderId, paymentId }` | Dispatched upon successful payment capture. |
| `payment.failed`   | `{ orderId, reason }` | Dispatched when payment authorization fails. |
| `notification.new` | `{ id, title, message, type, createdAt }` | Dispatched by `notification.worker.ts` on new notification. |
| `shipment.updated` | `{ orderId, trackingNumber, status }` | Dispatched on shipping status updates. |
