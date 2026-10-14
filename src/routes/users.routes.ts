import bcrypt from "bcryptjs";
import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.middleware.js";
import { User, type UserRole } from "../models/user.model.js";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireAdmin);

usersRouter.get("/", async (_req, res, next) => {
  try {
    const users = await User.find()
      .select("email role createdAt")
      .sort({ createdAt: -1 });

    res.json({
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/", async (req, res, next) => {
  try {
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "");
    const role = String(req.body.role ?? "user") as UserRole;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    if (!["admin", "user"].includes(role)) {
      res.status(400).json({ error: "Role must be admin or user" });
      return;
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(409).json({ error: "A user with that email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, role });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});
