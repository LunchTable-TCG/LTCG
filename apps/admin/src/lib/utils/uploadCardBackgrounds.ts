import { promises as fs } from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";
import sharp from "sharp";

interface UploadResult {
  filename: string;
  blobUrl: string;
  width: number;
  height: number;
  success: boolean;
  error?: string;
}

export async function uploadCardBackgrounds(
  sourcePath: string,
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  try {
    // Read all files from source directory
    const files = await fs.readdir(sourcePath);
    const imageFiles = files.filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));

    for (let i = 0; i < imageFiles.length; i++) {
      const filename = imageFiles[i];
      onProgress?.(i + 1, imageFiles.length, filename);

      try {
        const filePath = path.join(sourcePath, filename);
        const fileBuffer = await fs.readFile(filePath);

        // Upload to Vercel Blob
        const blob = await put(`card-backgrounds/${filename}`, fileBuffer, {
          access: "public",
          contentType: getContentType(filename),
        });

        // Get image dimensions using sharp
        const dimensions = await getImageDimensions(fileBuffer);

        results.push({
          filename,
          blobUrl: blob.url,
          width: dimensions.width,
          height: dimensions.height,
          success: true,
        });
      } catch (error) {
        results.push({
          filename,
          blobUrl: "",
          width: 0,
          height: 0,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to upload backgrounds: ${error}`);
  }
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 750,
    height: metadata.height || 1050,
  };
}
