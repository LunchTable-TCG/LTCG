"use client";

import { upload } from "@vercel/blob/client";
import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useState } from "react";

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const { getAccessToken } = usePrivy();

  const buildUploadHeaders = useCallback(async () => {
    const accessToken = await getAccessToken();
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
  }, [getAccessToken]);

  const uploadImage = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const webAppUrl = process.env["NEXT_PUBLIC_WEB_APP_URL"] || "http://localhost:3000";
      const headers = await buildUploadHeaders();
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: `${webAppUrl}/api/admin/upload`,
        headers,
      });
      return blob.url;
    } finally {
      setIsUploading(false);
    }
  }, [buildUploadHeaders]);

  const uploadMultipleImages = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      const webAppUrl = process.env["NEXT_PUBLIC_WEB_APP_URL"] || "http://localhost:3000";
      const headers = await buildUploadHeaders();
      const results = await Promise.all(
        files.map(async (file) => {
          const blob = await upload(file.name, file, {
            access: "public",
            handleUploadUrl: `${webAppUrl}/api/admin/upload`,
            headers,
          });
          return blob.url;
        })
      );
      return results;
    } finally {
      setIsUploading(false);
    }
  }, [buildUploadHeaders]);

  return { uploadImage, uploadMultipleImages, isUploading };
}
