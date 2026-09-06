# Mongo to Prisma migration

The new API is under `src/`; the existing JavaScript folders are retained temporarily as read-only migration input. Do not run both APIs against the same port.

1. Export users, shops, and products from MongoDB as JSON, preserving each Mongo `_id` as a string.
2. Create users first. Map `user` and `shopkeeper` to `CUSTOMER` or `SELLER` according to the approved shop relationship, map `manager` and `owner` to `SELLER` or `ADMIN`, and record the source `_id` in `User.legacyMongoId`.
3. Create shops next, resolving `ownerId` and `requestedById` through a map of Mongo ID to new Prisma cuid. Store the source shop `_id` in `Shop.legacyMongoId`.
4. Create products last, resolving `shopId` and `createdById` through those maps. Convert rupee values to integer paise with `Math.round(Number(price) * 100)` and store the source `_id` in `Product.legacyMongoId`.
5. Keep a durable JSON or CSV mapping file such as `{ "mongoId": "prismaCuid" }` for every imported collection. The unique legacy columns make reruns safe and make rollback reconciliation possible.
6. Verify counts, ownership, prices, stock, and a sample of relationships before switching the frontend to `/api/v1/products`, `/api/v1/orders`, and `/api/v1/payments`.

The import should be a separate script or one-off job. It must never run during an API request or inside a Vercel function.