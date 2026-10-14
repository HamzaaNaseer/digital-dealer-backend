import { connectDb, disconnectDb } from "../config/db.js";
import { categorySeed } from "../data/category.seed.js";
import { Category } from "../models/category.model.js";

async function main() {
  await connectDb();

  const slugToId = new Map<string, string>();

  for (const category of categorySeed.filter((entry) => entry.parentSlug === null)) {
    const doc = await Category.findOneAndUpdate(
      { slug: category.slug },
      { name: category.name, slug: category.slug, parentId: null, order: category.order },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    slugToId.set(category.slug, doc.id);
  }

  for (const category of categorySeed.filter((entry) => entry.parentSlug !== null)) {
    const parentId = slugToId.get(category.parentSlug as string);

    if (!parentId) {
      throw new Error(`Unknown parent category slug: ${category.parentSlug}`);
    }

    const doc = await Category.findOneAndUpdate(
      { slug: category.slug },
      { name: category.name, slug: category.slug, parentId, order: category.order },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    slugToId.set(category.slug, doc.id);
  }

  console.log(`Seeded ${slugToId.size} categories`);
}

main()
  .catch((error) => {
    console.error("Failed to seed categories:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb();
  });
