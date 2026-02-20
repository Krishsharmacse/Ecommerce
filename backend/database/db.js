import mongoose from "mongoose";

const connectDB = async () => {
    try {
        // Use 127.0.0.1 for local stability
        const conn = await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ekart-YT");
        console.log(`Database connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
}
export default connectDB;