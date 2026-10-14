import { Schema, model, type Types } from "mongoose";

export interface CategoryDocument {
  name: string;
  slug: string;
  parentId: Types.ObjectId | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    order: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export const Category = model<CategoryDocument>("Category", categorySchema);
