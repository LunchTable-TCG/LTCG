"use server";

import { uploadCardBackgrounds } from "@/lib/utils/uploadCardBackgrounds";

export async function runUploadBackgrounds(sourcePath: string) {
  const results = await uploadCardBackgrounds(sourcePath);
  return results;
}
