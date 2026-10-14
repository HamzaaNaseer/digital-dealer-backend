import { Schema, model } from "mongoose";

export interface HealthDocument {
  status: string;
  checkedAt: Date;
}

const healthSchema = new Schema<HealthDocument>(
  {
    status: { type: String, required: true, default: "ok" },
    checkedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

export const Health = model<HealthDocument>("Health", healthSchema);
