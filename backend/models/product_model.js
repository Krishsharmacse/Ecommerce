import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    productName: { type: String, trim: true },        // backward compat
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    stock: { type: Number, default: 0, min: 0 },
    image: { type: String, default: null },
    imageType: { type: String, default: "url", enum: ["url", "base64"] },
    tags: [{ type: String, trim: true }],

    // ─── Shop / Vendor reference ──────────────────────────────
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    // ─── Sales Analytics ──────────────────────────────────────
    totalSold: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },

}, { timestamps: true });

productSchema.index({ shopId: 1 });
productSchema.index({ category: 1 });
productSchema.index({ createdBy: 1 });
productSchema.index({ name: "text", description: "text" });

export const Product = mongoose.model("Product", productSchema);