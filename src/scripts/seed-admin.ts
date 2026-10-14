import bcrypt from "bcryptjs";
import { connectDb, disconnectDb } from "../config/db.js";
import { User } from "../models/user.model.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "Yash@publicsquare.io";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function seedAdmin() {
  if (!ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is required to seed the admin user");
  }

  await connectDb();

  const email = ADMIN_EMAIL.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await User.findOneAndUpdate(
    { email },
    {
      email,
      passwordHash,
      role: "admin",
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  console.log(`Seeded admin user: ${email}`);
}

seedAdmin()
  .catch((error) => {
    console.error("Failed to seed admin user:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb();
  });
