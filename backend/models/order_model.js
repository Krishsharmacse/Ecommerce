import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true },
    image: { type: String, default: null }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    // Who ordered
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    // Items ordered (can span multiple shops)
    items: [orderItemSchema],

    // Shops involved (for multi-vendor orders)
    shops: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop"
    }],

    // Financial
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // Status
    status: {
        type: String,
        enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"],
        default: "pending"
    },

    // Shipping Info
    shippingAddress: {
        name: String,
        address: String,
        city: String,
        zipcode: String,
        phone: String,
    },

    // Payment
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending"
    },
    paymentMethod: { type: String, default: "cod" },   // cod, online etc.

    notes: { type: String, default: "" },

}, { timestamps: true });

orderSchema.index({ userId: 1 });
orderSchema.index({ "items.shopId": 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model("Order", orderSchema);
