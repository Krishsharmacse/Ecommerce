import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    createdAt: { type: Date, default: Date.now, expires: 30 * 24 * 60 * 60 },  // Auto-expire after 30 days
});

export const Session = mongoose.model("Session", sessionSchema);