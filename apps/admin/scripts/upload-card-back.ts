import { put } from "@vercel/blob";
import { promises as fs } from "fs";
import sharp from "sharp";

async function uploadCardBack() {
  try {
    const filePath = "/Users/home/Downloads/card-back.png";
    const fileBuffer = await fs.readFile(filePath);

    // Get image dimensions
    const metadata = await sharp(fileBuffer).metadata();
    const width = metadata.width || 750;
    const height = metadata.height || 1050;

    // Upload to Vercel Blob
    const blob = await put("card-back/card-back.png", fileBuffer, {
      access: "public",
      contentType: "image/png",
    });

    console.log("Card back uploaded successfully!");
    console.log("Blob URL:", blob.url);
    console.log("Dimensions:", width, "x", height);
    console.log("\nNow add this to Convex with:");
    console.log(`filename: "card-back.png"`);
    console.log(`blobUrl: "${blob.url}"`);
    console.log(`width: ${width}`);
    console.log(`height: ${height}`);
    console.log(`tags: ["card-back"]`);
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
}

uploadCardBack();
