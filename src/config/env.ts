import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongodbUri: requireEnv("MONGODB_URI", "mongodb://localhost:27017/digital-dealer"),
  jwtSecret: requireEnv(
    "JWT_SECRET",
    process.env.NODE_ENV === "production" ? undefined : "development-only-change-me"
  ),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigins: requireEnv("CORS_ORIGIN", "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  nodeEnv: process.env.NODE_ENV ?? "development",
  resendApiKey: process.env.RESEND_API_KEY,
  resendFrom: process.env.RESEND_FROM,
  quoteNotificationEmails: (
    process.env.QUOTE_NOTIFICATION_EMAIL ?? "hamzanaseer.dev@gmail.com,hamzanaseer711@gmail.com"
  )
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean),
};
