import { Schema, model, type Types } from "mongoose";
import type { ProductUnit } from "./product.model.js";

export interface QuoteItemDocument {
  productId: Types.ObjectId;
  collectionId: string;
  name: string;
  size: string;
  sizeMM: string;
  unit: ProductUnit;
  pricePerUnit: number;
  fullSkids: number;
  loosePcs: number;
  totalPcs: number;
  totalCoverage: number;
  materialCost: number;
  handlingFee: number;
  discountAmount: number;
  total: number;
}

export interface QuoteDocument {
  submittedBy: {
    userId: Types.ObjectId | null;
    email: string;
    company?: string;
  };
  notes?: string;
  items: QuoteItemDocument[];
  materialTotal: number;
  handlingTotal: number;
  discountTotal: number;
  grandTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

const quoteItemSchema = new Schema<QuoteItemDocument>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    collectionId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    size: { type: String, required: true, trim: true },
    sizeMM: { type: String, trim: true, default: "" },
    unit: {
      type: String,
      enum: ["sqf", "lft", "piece", "box", "ton", "bottle"],
      required: true,
    },
    pricePerUnit: { type: Number, required: true, min: 0 },
    fullSkids: { type: Number, required: true, min: 0 },
    loosePcs: { type: Number, required: true, min: 0 },
    totalPcs: { type: Number, required: true, min: 0 },
    totalCoverage: { type: Number, required: true, min: 0 },
    materialCost: { type: Number, required: true, min: 0 },
    handlingFee: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const quoteSchema = new Schema<QuoteDocument>(
  {
    submittedBy: {
      userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
      email: { type: String, required: true, lowercase: true, trim: true },
      company: { type: String, trim: true },
    },
    notes: { type: String, trim: true },
    items: {
      type: [quoteItemSchema],
      required: true,
      validate: {
        validator: (items: QuoteItemDocument[]) => items.length > 0,
        message: "At least one quote item is required",
      },
    },
    materialTotal: { type: Number, required: true, min: 0 },
    handlingTotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export const Quote = model<QuoteDocument>("Quote", quoteSchema);
