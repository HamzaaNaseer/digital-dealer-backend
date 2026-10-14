import { Schema, model, type Types } from "mongoose";

export type ProductUnit = "sqf" | "lft" | "piece" | "box" | "ton" | "bottle";
export type ProductTone = "light" | "grey" | "dark";

export interface ProductVariantPackSize {
  piecesPerSkid?: number;
  coveragePerSkid?: number;
  coveragePerPiece?: number;
  piecesPerBox?: number;
}

export interface ProductVariantDocument {
  label: string;
  size?: string;
  sizeMM?: string;
  thickness?: string;
  unit: ProductUnit;
  price: number;
  packSize?: ProductVariantPackSize;
  discountPercent?: number;
  discountThreshold?: number;
  isNewArrival?: boolean;
}

export interface ProductDocument {
  slug: string;
  name: string;
  categoryId: Types.ObjectId;
  subcategoryId: Types.ObjectId | null;
  colorName?: string;
  tone?: ProductTone;
  images: string[];
  description?: string;
  isActive: boolean;
  variants: ProductVariantDocument[];
  addOnProductIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const productVariantPackSizeSchema = new Schema<ProductVariantPackSize>(
  {
    piecesPerSkid: { type: Number, min: 0 },
    coveragePerSkid: { type: Number, min: 0 },
    coveragePerPiece: { type: Number, min: 0 },
    piecesPerBox: { type: Number, min: 0 },
  },
  { _id: false }
);

const productVariantSchema = new Schema<ProductVariantDocument>(
  {
    label: { type: String, required: true, trim: true },
    size: { type: String, trim: true },
    sizeMM: { type: String, trim: true },
    thickness: { type: String, trim: true },
    unit: {
      type: String,
      enum: ["sqf", "lft", "piece", "box", "ton", "bottle"],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    packSize: { type: productVariantPackSizeSchema, default: undefined },
    discountPercent: { type: Number, min: 0, max: 100 },
    discountThreshold: { type: Number, min: 0 },
    isNewArrival: { type: Boolean, default: false },
  },
  { _id: false }
);

const productSchema = new Schema<ProductDocument>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    subcategoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    colorName: { type: String, trim: true },
    tone: { type: String, enum: ["light", "grey", "dark"] },
    images: { type: [String], default: [] },
    description: { type: String, trim: true },
    isActive: { type: Boolean, required: true, default: true },
    variants: {
      type: [productVariantSchema],
      required: true,
      validate: {
        validator: (variants: ProductVariantDocument[]) => variants.length > 0,
        message: "At least one product variant is required",
      },
    },
    addOnProductIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Product" }],
      default: [],
    },
  },
  { timestamps: true }
);

productSchema.index({ categoryId: 1, subcategoryId: 1, name: 1 });

export const Product = model<ProductDocument>("Product", productSchema);
