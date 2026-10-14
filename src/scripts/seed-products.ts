import { connectDb, disconnectDb } from "../config/db.js";
import { productCatalogSeed } from "../data/product-catalog.seed.js";
import { Category } from "../models/category.model.js";
import { Product, type ProductVariantDocument } from "../models/product.model.js";

async function main() {
  await connectDb();

  const categories = await Category.find().select("slug");
  const slugToId = new Map(categories.map((category) => [category.slug, category.id]));

  const operations = productCatalogSeed.map((product) => {
    const categoryId = slugToId.get(product.categorySlug);
    const subcategoryId = slugToId.get(product.subcategorySlug);

    if (!categoryId || !subcategoryId) {
      throw new Error(
        `Unknown category/subcategory for product "${product.slug}". Run seed:categories first.`
      );
    }

    return {
      updateOne: {
        filter: { slug: product.slug },
        update: {
          $set: {
            slug: product.slug,
            name: product.name,
            categoryId,
            subcategoryId,
            colorName: product.colorName,
            tone: product.tone,
            images: product.images,
            isActive: true,
            variants: product.variants as ProductVariantDocument[],
          },
        },
        upsert: true,
      },
    };
  });

  const result = await Product.bulkWrite(operations);

  console.log(
    `Seeded products: ${result.upsertedCount} created, ${result.modifiedCount} updated, ${result.matchedCount} matched`
  );
}

main()
  .catch((error) => {
    console.error("Failed to seed products:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb();
  });
