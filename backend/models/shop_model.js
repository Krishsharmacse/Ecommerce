import mongoose from "mongoose";

const shopSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    logo: { type: String, default: null },
    banner: { type: String, default: null },
    category: { type: String, required: true, trim: true },

    // Owner (manager/vendor who owns this shop)
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    // Who requested this shop (e.g., a shopkeeper requesting to open a shop)
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    // Status managed by super-admin (owner role)
    status: {
        type: String,
        enum: ["pending", "approved", "suspended", "rejected"],
        default: "pending"
    },

    statusUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    statusUpdatedAt: { type: Date, default: null },
    statusNote: { type: String, default: "" },      // Admin note on rejection etc

    // Contact
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },

    // Analytics (cached totals, updated on every sale)
    totalSales: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalProducts: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },

}, { timestamps: true });

shopSchema.index({ ownerId: 1 });
shopSchema.index({ status: 1 });

export const Shop = mongoose.model("Shop", shopSchema);
