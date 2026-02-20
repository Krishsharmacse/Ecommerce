import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./database/db.js";
import userroute from "./routes/userroutes.js";
import productroute from "./routes/product_routes.js"; 

const app = express();
const PORT = process.env.PORT || 8000;

// Enable CORS for frontend (allow both 3000 and 3001 for dev flexibility)
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use("/api/v1/user", userroute);
app.use("/api/v1/product", productroute);

app.listen(PORT, () => {
    connectDB();
    console.log(`Server is running at http://localhost:${PORT}`);
});
