import { Router } from "express";
import { Category } from "../models/category.model.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res, next) => {
  try {
    const categories = await Category.find().sort({ order: 1, name: 1 });

    res.json({
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        parentId: category.parentId,
      })),
    });
  } catch (error) {
    next(error);
  }
});
