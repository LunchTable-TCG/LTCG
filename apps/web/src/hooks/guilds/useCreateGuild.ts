"use client";

import { handleHookError } from "@/lib/errorHandling";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

interface CreateGuildData {
  name: string;
  description?: string;
  visibility: "public" | "private";
}

/**
 * Hook for creating a new guild with image uploads
 *
 * @returns Guild creation form state and actions
 */
export function useCreateGuild() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mutations
  const createGuildMutation = useMutation(api.social.guilds.createGuild);
  const setProfileImageMutation = useMutation(api.social.guilds.setProfileImage);
  const setBannerImageMutation = useMutation(api.social.guilds.setBannerImage);
  const generateUploadUrl = useMutation(api.core.storage.generateUploadUrl);

  // Upload a file to Convex storage
  const uploadFile = async (file: File): Promise<Id<"_storage">> => {
    const uploadUrl = await generateUploadUrl();
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = await result.json();
    return storageId;
  };

  // Create guild with optional images
  const createGuild = async (
    data: CreateGuildData,
    profileImage?: File,
    bannerImage?: File
  ): Promise<Id<"guilds">> => {
    setIsCreating(true);
    setError(null);

    try {
      // Create the guild first
      const { guildId } = await createGuildMutation({
        name: data.name,
        description: data.description,
        visibility: data.visibility,
      });

      // Upload and set profile image if provided
      if (profileImage) {
        try {
          const storageId = await uploadFile(profileImage);
          await setProfileImageMutation({ guildId, storageId });
        } catch (uploadError) {
          console.error("Failed to upload profile image:", uploadError);
          // Don't fail the whole operation for image upload failures
          toast.warning("Guild created but profile image upload failed");
        }
      }

      // Upload and set banner image if provided
      if (bannerImage) {
        try {
          const storageId = await uploadFile(bannerImage);
          await setBannerImageMutation({ guildId, storageId });
        } catch (uploadError) {
          console.error("Failed to upload banner image:", uploadError);
          toast.warning("Guild created but banner image upload failed");
        }
      }

      toast.success("Guild created successfully!");
      return guildId;
    } catch (error) {
      const message = handleHookError(error, "Failed to create guild");
      setError(message);
      toast.error(message);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createGuild,
    uploadFile,
    isCreating,
    error,
    clearError: () => setError(null),
  };
}
