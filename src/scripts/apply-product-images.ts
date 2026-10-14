import { connectDb, disconnectDb } from "../config/db.js";
import "../models/category.model.js";
import { Product } from "../models/product.model.js";

const CLOUD_NAME = "hzkqpzcb";

function cloudinaryUrl(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const base = filename.slice(0, dot);
  const ext = filename.slice(dot);
  const cleaned = base
    .replace(/[^a-zA-Z0-9\s_-]/g, "") // strip anything Cloudinary would strip (parens, &, etc.)
    .replace(/\s+/g, "_"); // collapse whitespace runs to a single underscore
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_800/${cleaned}${ext}`;
}

// Natural Stone + shared Accessories colors, matched by Product.colorName
const colorNameImageMap: Record<string, string> = {
  "Alicante Black": "Alicante-Black-Granite-STONEarch.png",
  Beige: "Beige-Sandstone-STONEarch.png",
  "Black Berry": "Black-Berry-Granite-STONEarch.png",
  Black: "Black-Limestone-Kota-Black-STONEarch.png",
  Bronze: "Bronze Limestone.png",
  Brown: "Brown.png",
  Buff: "Buff.png",
  Butterfly: "Butterfly-Granite-STONEarch.png",
  Carbon: "Carbon-Basalt-STONEarch.png",
  "Crema Nova": "Crema Nova.png",
  "Desert Gray": "Desert Gray.png",
  Dove: "Dove-Gray-Sandstone-STONEarch.png",
  Flint: "Flint-Sandstone-STONEarch.png",
  "Flint - Venetian": "Venetian Flint.png",
  Fossil: "Fossil.png",
  "Indus Gray": "Indus-Gray-STONEarch.png",
  Lavender: "Lavendar-Sandstone-STONEarch.png",
  Mahogany: "Mahogany.png",
  "Moderno Beige": "Moderno Beige STONEarch.jpg",
  "Muskoka Silver": "Muskoka-Silver-STONEarch.png",
  "New Ebony": "New-Ebony-Granite-STONEarch.png",
  "Nordic Gray": "Nordic-Gray-Granite-STONEarch.png",
  Oak: "Oak-Sandstone-STONEarch.png",
  "Onyx Black": "Onyx-Black-Pearl-Granite-STONEarch.jpg",
  Rustic: "Rustic-Walling-Veneer-STONEarch.png",
  Saga: "Saga.png",
  "Sil. Valley/Antique": "Sil. Valley Antique-Limestone-STONEarch.jpg.png",
  "Silver Antique": "Silver-Antique-Black-STONEarch.jpg.png",
  "Silver Valley": "Silver-Valley-Limestone-STONEarch.jpg",
  "Slate Gray": "Slate Gray.png",
  Spring: "Spring-Granite-STONEarch.png",
  Sunset: "Sunset-Granite-STONEarch.png",
  "Travertine Gray Mix": "Gray Mix.png",
  "Travertine Ivory Mix": "Ivory Mix.png",
  "White Star": "White-Star-Salt-_-Pepper-Granite-STONEarch.png",
  "Corn Silk": "Corn-Silk-Veneer-STONEarch.png",
  "Desert Gold": "Desert Gold.png",
  European: "Euro Cobble.png",
  "Pebbles - Black": "Pebbles-Black-STONEarch.png",
  "Pebbles - White": "Pebbles-White-STONEarch.png",

  // Porcelain Tiles (Standard Pavers/Tiles) — matched by Product.colorName
  Algonquin: "Porcea Algonquin.png",
  Almond: "Porcea Almond.png",
  "Almond-N": "Porcea Almond.png", // no distinct photo supplied, reuse base color
  Amalfi: "Porcea Amalfi.png",
  "Ash Timber": "Porcea Ash Timber.png",
  "Aura White": "Porcea Aura White.png",
  "Birch Timber": "Porcea Birch Timber.png",
  "Black Opal": "Porcea Black Opal.png",
  Casablanca: "Porcea Casablanca.png",
  Cashmere: "Porcea Cashmere.png",
  Coast: "Porcea Coast.png",
  "Coast-N": "Porcea Coast.png", // no distinct photo supplied, reuse base color
  "Creek Light": "Porcea Creek Light.png",
  "Crema Antico": "Porcea Crema Antico.jpg",
  Eramosa: "Porcea Eramosa.png",
  "Gray Tusk": "Porcea Gray Tusk.png",
  Greige: "Porcea Greige.png",
  Gris: "Porcea Gris.png",
  "Ice Grey": "Porcea Ice Grey.png",
  "Ice Grey - N": "Porcea Ice Grey-N.png",
  Iceberg: "Porcea Iceberg.png",
  Imperial: "Porcea Imperial.png",
  Indus: "Porcea Indus.png",
  "Indus White": "Porcea Indus White.png",
  "Light Timber": "Porcea Light Timber.png",
  Moongrey: "Porcea Moongrey.png",
  Nero: "Porcea Nero.png",
  "Nickel Black": "Porcea Nickel Black.png",
  "Rio Black": "Porcea Rio Black.png",
  Seashell: "Porcea Seashell.png",
  "Seashell (3cm)": "Porcea Seashell (3 cm).png",
  Silver: "Porcea silver.png",
  "Slate Grey": "Porcea Slate Grey.png",
  Terrazzo: "Porcea Terrazzo.png",
  Thundercloud: "Porcea Thundercloud.png",
  Travertino: "Porcea Travertino.png",
  Tundra: "Porcea Tundra.png",
};

// "Silver Valley" exists as a colorName in both Natural Stone and Porcelain Tiles,
// each with its own photo — handled separately from the colorName loop below.
const porcelainSilverValleyUrl = cloudinaryUrl("Porcea Silver Valley.png");

// Exact Product.name matches (Accessories products have no colorName; Turf shares a
// colorName with a second product we must NOT touch)
const productNameImageMap: Record<string, string[]> = {
  CleanSeal: [
    "2 in 1 Color enhancer and sealer.png",
    "All surface cleaner.png",
    "Organic Stain Remover.png",
    "Rust&Haze Remover.png",
  ],
  "Gravel Grid": ["Gravel-Grid-STONEarch.png"],
  "Stone Grid": ["Stone Grid STONEarch.png"],
  "Artificial Turf": ["Turf-Artifical-Grass-STONEarch.png"],
};

async function main() {
  await connectDb();

  let updatedCount = 0;
  const noMatch: string[] = [];

  for (const [colorName, filename] of Object.entries(colorNameImageMap)) {
    const url = cloudinaryUrl(filename);
    const result = await Product.updateMany({ colorName }, { $set: { images: [url] } });

    if (result.matchedCount === 0) {
      noMatch.push(colorName);
    } else {
      updatedCount += result.matchedCount;
    }
  }

  // "Silver Valley" is ambiguous by colorName alone (exists in both categories), so
  // resolve it explicitly: only the porcelain-tiles product gets the porcelain photo.
  const silverValleyProducts = await Product.find({ colorName: "Silver Valley" }).populate<{
    categoryId: { slug: string };
  }>("categoryId", "slug");

  for (const product of silverValleyProducts) {
    if (product.categoryId?.slug === "porcelain-tiles") {
      product.images = [porcelainSilverValleyUrl];
      await product.save();
      updatedCount += 1;
    }
  }

  for (const [name, filenames] of Object.entries(productNameImageMap)) {
    const urls = filenames.map(cloudinaryUrl);
    const result = await Product.updateMany({ name }, { $set: { images: urls } });

    if (result.matchedCount === 0) {
      noMatch.push(name);
    } else {
      updatedCount += result.matchedCount;
    }
  }

  console.log(`Updated images on ${updatedCount} products.`);
  if (noMatch.length > 0) {
    console.log("No product matched for:", noMatch.join(", "));
  }
}

main()
  .catch((error) => {
    console.error("Failed to apply product images:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb();
  });
