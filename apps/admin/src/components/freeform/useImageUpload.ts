"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useState } from "react";

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const webAppUrl = process.env["NEXT_PUBLIC_WEB_APP_URL"] || "http://localhost:3000";
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: `${webAppUrl}/api/admin/upload`,
      });
      return blob.url;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const uploadMultipleImages = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      const webAppUrl = process.env["NEXT_PUBLIC_WEB_APP_URL"] || "http://localhost:3000";
      const results = await Promise.all(
        files.map(async (file) => {
          const blob = await upload(file.name, file, {
            access: "public",
            handleUploadUrl: `${webAppUrl}/api/admin/upload`,
          });
          return blob.url;
        })
      );
      return results;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { uploadImage, uploadMultipleImages, isUploading };
}
