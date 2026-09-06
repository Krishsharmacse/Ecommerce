import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { addAddress, deleteAddress, getProfile, listAddresses, updateProfile } from "./users.controller.js";

export const usersRoutes = Router();
usersRoutes.use(authenticate);
usersRoutes.get("/me", getProfile);
usersRoutes.patch("/me", updateProfile);
usersRoutes.get("/me/addresses", listAddresses);
usersRoutes.post("/me/addresses", addAddress);
usersRoutes.delete("/me/addresses/:id", deleteAddress);