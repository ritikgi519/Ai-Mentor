// backend/routes/userRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import { updateUserProfile, getUserProfile } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Ensure karein ki 'uploads' folder backend root mein hai
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Profile Route - upload.single("avatar") lagana zaroori hai
router.route("/profile")
  .get(protect, getUserProfile)
  .put(protect, upload.single("avatar"), updateUserProfile);

export default router;