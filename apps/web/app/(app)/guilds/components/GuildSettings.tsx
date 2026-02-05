"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateGuild } from "@/hooks/guilds/useCreateGuild";
import { useGuild } from "@/hooks/guilds/useGuild";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import {
  AlertTriangle,
  Camera,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  Save,
  Shield,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface GuildSettingsProps {
  guildId: Id<"guilds">;
}

export function GuildSettings({ guildId }: GuildSettingsProps) {
  const router = useRouter();
  const { guild, updateGuild, deleteGuild, setProfileImage, setBannerImage } = useGuild(guildId);
  const { generateUploadUrl } = useCreateGuild();

  const [name, setName] = useState(guild?.name || "");
  const [description, setDescription] = useState(guild?.description || "");
  const [visibility, setVisibility] = useState<"public" | "private">(guild?.visibility || "public");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const profileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const hasChanges =
    name !== guild?.name ||
    description !== (guild?.description || "") ||
    visibility !== guild?.visibility;

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      await updateGuild({
        name: name !== guild?.name ? name : undefined,
        description: description !== (guild?.description || "") ? description : undefined,
        visibility: visibility !== guild?.visibility ? visibility : undefined,
      });
      toast.success("Guild settings updated");
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== guild?.name) {
      toast.error("Guild name doesn't match");
      return;
    }

    setIsDeleting(true);
    try {
      await deleteGuild();
      toast.success("Guild deleted");
      router.push("/guilds");
    } catch (error) {
      toast.error("Failed to delete guild");
      setIsDeleting(false);
    }
  };

  const handleImageUpload = async (file: File, type: "profile" | "banner") => {
    const setUploading = type === "profile" ? setIsUploadingProfile : setIsUploadingBanner;
    const setImage = type === "profile" ? setProfileImage : setBannerImage;

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) throw new Error("Upload failed");

      const { storageId } = await response.json();
      await setImage(storageId);

      toast.success(`${type === "profile" ? "Profile" : "Banner"} image updated`);
    } catch (error) {
      toast.error(`Failed to upload ${type} image`);
    } finally {
      setUploading(false);
    }
  };

  if (!guild) return null;

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Basic Info */}
      <div className="space-y-6 p-6 rounded-xl bg-black/40 border border-[#3d2b1f]">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-[#d4af37]" />
          <h3 className="font-bold text-[#e8e0d5]">Guild Information</h3>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#a89f94]">Guild Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter guild name"
              maxLength={32}
              className="bg-black/40 border-[#3d2b1f] text-[#e8e0d5] focus:border-[#d4af37]/50"
            />
            <p className="text-xs text-[#a89f94]">
              3-32 characters, letters, numbers, spaces, and hyphens
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#a89f94]">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell others about your guild..."
              maxLength={500}
              rows={4}
              className="bg-black/40 border-[#3d2b1f] text-[#e8e0d5] focus:border-[#d4af37]/50 resize-none"
            />
            <p className="text-xs text-[#a89f94]">{description.length}/500 characters</p>
          </div>

          {/* Visibility */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[#a89f94]">Visibility</label>
            <div className="flex gap-3">
              {[
                { value: "public" as const, icon: Eye, label: "Public", desc: "Anyone can join" },
                { value: "private" as const, icon: EyeOff, label: "Private", desc: "Invite only" },
              ].map((option) => {
                const Icon = option.icon;
                const isSelected = visibility === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setVisibility(option.value)}
                    className={cn(
                      "flex-1 p-4 rounded-xl border transition-all text-left",
                      isSelected
                        ? "bg-[#d4af37]/10 border-[#d4af37]/50"
                        : "bg-black/20 border-[#3d2b1f] hover:border-[#d4af37]/30"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 mb-2",
                        isSelected ? "text-[#d4af37]" : "text-[#a89f94]"
                      )}
                    />
                    <p
                      className={cn(
                        "font-medium",
                        isSelected ? "text-[#d4af37]" : "text-[#e8e0d5]"
                      )}
                    >
                      {option.label}
                    </p>
                    <p className="text-xs text-[#a89f94]">{option.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={cn(
            "w-full rounded-xl py-6 font-bold",
            hasChanges ? "tcg-button-primary" : "bg-[#3d2b1f] text-[#a89f94] cursor-not-allowed"
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Images */}
      <div className="space-y-6 p-6 rounded-xl bg-black/40 border border-[#3d2b1f]">
        <div className="flex items-center gap-3 mb-4">
          <ImageIcon className="w-5 h-5 text-[#d4af37]" />
          <h3 className="font-bold text-[#e8e0d5]">Guild Images</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile Image */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[#a89f94]">Profile Image</label>
            <div
              onClick={() => profileInputRef.current?.click()}
              className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-[#3d2b1f] hover:border-[#d4af37]/50 cursor-pointer transition-colors group"
            >
              {guild.profileImageUrl ? (
                <img
                  src={guild.profileImageUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1a1614]">
                  <Camera className="w-8 h-8 text-[#a89f94]" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {isUploadingProfile ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
              </div>
            </div>
            <input
              ref={profileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, "profile");
              }}
            />
          </div>

          {/* Banner Image */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[#a89f94]">Banner Image</label>
            <div
              onClick={() => bannerInputRef.current?.click()}
              className="relative aspect-[16/9] rounded-xl overflow-hidden border-2 border-dashed border-[#3d2b1f] hover:border-[#d4af37]/50 cursor-pointer transition-colors group"
            >
              {guild.bannerImageUrl ? (
                <img
                  src={guild.bannerImageUrl}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1a1614]">
                  <ImageIcon className="w-8 h-8 text-[#a89f94]" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {isUploadingBanner ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-white" />
                )}
              </div>
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file, "banner");
              }}
            />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-6 p-6 rounded-xl bg-red-500/5 border border-red-500/20">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h3 className="font-bold text-red-400">Danger Zone</h3>
        </div>

        {showDeleteConfirm ? (
          <div className="space-y-4">
            <p className="text-sm text-[#a89f94]">
              This action cannot be undone. Type{" "}
              <strong className="text-red-400">{guild.name}</strong> to confirm.
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type guild name to confirm"
              className="bg-black/40 border-red-500/30 text-[#e8e0d5] focus:border-red-500/50"
            />
            <div className="flex gap-3">
              <Button
                onClick={handleDelete}
                disabled={deleteConfirmText !== guild.name || isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded-xl py-5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Forever
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                variant="ghost"
                className="text-[#a89f94] hover:text-[#e8e0d5]"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[#e8e0d5]">Delete Guild</p>
              <p className="text-sm text-[#a89f94]">
                Permanently delete this guild and all its data
              </p>
            </div>
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 rounded-xl"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
