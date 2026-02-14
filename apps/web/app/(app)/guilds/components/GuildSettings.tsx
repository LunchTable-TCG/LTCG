"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateGuild } from "@/hooks/guilds/useCreateGuild";
import { useGuild } from "@/hooks/guilds/useGuild";
import { cn } from "@/lib/utils";
import type { Visibility } from "@/types/common";
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
  const [visibility, setVisibility] = useState<Visibility>(guild?.visibility || "public");
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
    } catch (_error) {
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
    } catch (_error) {
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
    } catch (_error) {
      toast.error(`Failed to upload ${type} image`);
    } finally {
      setUploading(false);
    }
  };

  if (!guild) return null;

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Basic Info */}
      <div className="space-y-6 p-6 rounded-xl bg-card/40 border border-border">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Guild Information</h3>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <label htmlFor="guild-name" className="text-sm font-medium text-muted-foreground">
              Guild Name
            </label>
            <Input
              id="guild-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter guild name"
              maxLength={32}
              className="bg-card/40 border-border text-foreground focus:border-primary/50"
            />
            <p className="text-xs text-muted-foreground">
              3-32 characters, letters, numbers, spaces, and hyphens
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label
              htmlFor="guild-description"
              className="text-sm font-medium text-muted-foreground"
            >
              Description
            </label>
            <Textarea
              id="guild-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell others about your guild..."
              maxLength={500}
              rows={4}
              className="bg-card/40 border-border text-foreground focus:border-primary/50 resize-none"
            />
            <p className="text-xs text-muted-foreground">{description.length}/500 characters</p>
          </div>

          {/* Visibility */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Visibility</p>
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
                        ? "bg-primary/10 border-primary/50"
                        : "bg-card/20 border-border hover:border-primary/30"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5 mb-2",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <p
                      className={cn("font-medium", isSelected ? "text-primary" : "text-foreground")}
                    >
                      {option.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{option.desc}</p>
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
            hasChanges
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
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
      <div className="space-y-6 p-6 rounded-xl bg-card/40 border border-border">
        <div className="flex items-center gap-3 mb-4">
          <ImageIcon className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Guild Images</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile Image */}
          <div className="space-y-3">
            <label
              htmlFor="guild-profile-image"
              className="text-sm font-medium text-muted-foreground"
            >
              Profile Image
            </label>
            <button
              type="button"
              onClick={() => profileInputRef.current?.click()}
              className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors group"
            >
              {guild.profileImageUrl ? (
                <img
                  src={guild.profileImageUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-card">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {isUploadingProfile ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
              </div>
            </button>
            <input
              id="guild-profile-image"
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
            <label
              htmlFor="guild-banner-image"
              className="text-sm font-medium text-muted-foreground"
            >
              Banner Image
            </label>
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              className="relative aspect-[16/9] rounded-xl overflow-hidden border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors group"
            >
              {guild.bannerImageUrl ? (
                <img
                  src={guild.bannerImageUrl}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-card">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {isUploadingBanner ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-white" />
                )}
              </div>
            </button>
            <input
              id="guild-banner-image"
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
      <div className="space-y-6 p-6 rounded-xl bg-destructive/5 border border-destructive/20">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h3 className="font-bold text-destructive">Danger Zone</h3>
        </div>

        {showDeleteConfirm ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. Type{" "}
              <strong className="text-destructive">{guild.name}</strong> to confirm.
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type guild name to confirm"
              className="bg-card/40 border-destructive/30 text-foreground focus:border-destructive/50"
            />
            <div className="flex gap-3">
              <Button
                onClick={handleDelete}
                disabled={deleteConfirmText !== guild.name || isDeleting}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl py-5"
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
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Delete Guild</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this guild and all its data
              </p>
            </div>
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 rounded-xl"
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
