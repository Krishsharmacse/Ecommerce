import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    productName: { type: String, trim: true }, // For backward compatibility
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    stock: { type: Number, default: 0 },
    image: { type: String, default: null }, // URL or base64 image
    imageType: { type: String, default: 'url' }, // 'url' or 'base64'
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

export const Product = mongoose.model("Product", productSchema);