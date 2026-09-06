import "./order.worker.js";
import "./shipment.worker.js";
import "./email.worker.js";
import { logger } from "../src/lib/logger.js";

logger.info("BullMQ worker process started: orders, shipments, emails");