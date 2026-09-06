import "./order.worker.js";
import "./shipment.worker.js";
import "./refund.worker.js";
import "./email.worker.js";
import "./notification.worker.js";
import { logger } from "../lib/logger.js";

logger.info("BullMQ worker process started");