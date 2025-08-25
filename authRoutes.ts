import express from "express";
import bcrypt from "bcryptjs";
import { queryDb } from "./db";

const router = express.Router();

router.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      firstName: "Admin",
      lastName: "User",
      accessLevel: "admin",
      massAccess: true,
      teamId: null,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
