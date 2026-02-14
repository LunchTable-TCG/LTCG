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
  guildId: Id<any>;
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
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Basic Info */}
      <div className="paper-panel border-4 border-primary p-6 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
        <div className="absolute top-0 right-0 p-2 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest border-l-4 border-b-4 border-primary">
          Configuration
        </div>

        <div className="flex items-center gap-3 mb-8 border-b-4 border-primary pb-4">
          <div className="w-10 h-10 border-2 border-primary bg-secondary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-black text-2xl uppercase italic tracking-tighter ink-bleed">Manifesto & Identity</h3>
        </div>

        <div className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <label htmlFor="guild-name" className="text-sm font-black uppercase tracking-wide">
              Guild Designation
            </label>
            <Input
              id="guild-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ENTER GUILD NAME"
              maxLength={32}
              className="border-2 border-primary bg-secondary/10 font-bold focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all uppercase placeholder:text-muted-foreground/50 h-12"
            />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              3-32 characters • Letters/Numbers/Hyphens Only
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label
              htmlFor="guild-description"
              className="text-sm font-black uppercase tracking-wide"
            >
              Mission Statement
            </label>
            <Textarea
              id="guild-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State your purpose..."
              maxLength={500}
              rows={4}
              className="border-2 border-primary bg-secondary/10 font-bold focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all resize-none placeholder:text-muted-foreground/50 placeholder:uppercase"
            />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">{description.length}/500 CHARS</p>
          </div>

          {/* Visibility */}
          <div className="space-y-3">
            <p className="text-sm font-black uppercase tracking-wide">Protocol Visibility</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { value: "public" as const, icon: Eye, label: "Public Domain", desc: "Open Recruitment" },
                { value: "private" as const, icon: EyeOff, label: "Classified", desc: "Invite-Only Access" },
              ].map((option) => {
                const Icon = option.icon;
                const isSelected = visibility === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setVisibility(option.value)}
                    className={cn(
                      "flex items-center gap-4 p-4 border-2 transition-all text-left relative overflow-hidden group",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        : "bg-white text-muted-foreground border-primary/20 hover:border-primary hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 border-2 flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "border-primary-foreground bg-black/20" : "border-primary/20 bg-secondary/10 group-hover:border-primary"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-black uppercase tracking-tight text-sm">
                        {option.label}
                      </p>
                      <p className={cn(
                        "text-[10px] font-bold uppercase tracking-widest mt-0.5",
                        isSelected ? "text-primary-foreground/70" : "text-muted-foreground/60"
                      )}>{option.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 pt-6 border-t-4 border-primary/10">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={cn(
              "w-full rounded-none h-14 font-black uppercase tracking-widest text-sm border-2 transition-all",
              hasChanges
                ? "bg-primary text-primary-foreground border-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                : "bg-secondary/20 text-muted-foreground border-primary/20 cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                Committing Changes...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-3" />
                Commit Updates
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Images */}
      <div className="paper-panel border-4 border-primary p-6 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
        <div className="absolute top-0 right-0 p-2 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest border-l-4 border-b-4 border-primary">
          Visuals
        </div>

        <div className="flex items-center gap-3 mb-8 border-b-4 border-primary pb-4">
          <div className="w-10 h-10 border-2 border-primary bg-secondary/20 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-black text-2xl uppercase italic tracking-tighter ink-bleed">Insignia & Banner</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Profile Image */}
          <div className="space-y-3">
            <label
              htmlFor="guild-profile-image"
              className="text-sm font-black uppercase tracking-wide block"
            >
              Crest (Square)
            </label>
            <button
              type="button"
              onClick={() => profileInputRef.current?.click()}
              className="w-full relative aspect-square border-4 border-dashed border-primary/30 hover:border-primary cursor-pointer transition-all group bg-secondary/5 hover:bg-secondary/10 overflow-hidden"
            >
              {guild.profileImageUrl ? (
                <img
                  src={guild.profileImageUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-primary/30 group-hover:text-primary transition-colors">
                  <Camera className="w-12 h-12 mb-2" />
                  <span className="font-black uppercase text-xs tracking-widest">Upload</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                {isUploadingProfile ? (
                  <Loader2 className="w-10 h-10 animate-spin mb-2" />
                ) : (
                  <Camera className="w-10 h-10 mb-2" />
                )}
                <span className="font-bold uppercase text-xs tracking-widest">
                  {isUploadingProfile ? "Processing..." : "Change Image"}
                </span>
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
              className="text-sm font-black uppercase tracking-wide block"
            >
              Standard (16:9)
            </label>
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              className="w-full relative aspect-[16/9] border-4 border-dashed border-primary/30 hover:border-primary cursor-pointer transition-all group bg-secondary/5 hover:bg-secondary/10 overflow-hidden"
            >
              {guild.bannerImageUrl ? (
                <img
                  src={guild.bannerImageUrl}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-primary/30 group-hover:text-primary transition-colors">
                  <ImageIcon className="w-12 h-12 mb-2" />
                  <span className="font-black uppercase text-xs tracking-widest">Upload</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                {isUploadingBanner ? (
                  <Loader2 className="w-10 h-10 animate-spin mb-2" />
                ) : (
                  <ImageIcon className="w-10 h-10 mb-2" />
                )}
                <span className="font-bold uppercase text-xs tracking-widest">
                  {isUploadingBanner ? "Processing..." : "Change Image"}
                </span>
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
      <div className="paper-panel border-4 border-destructive bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(239,68,68,0.05)_10px,rgba(239,68,68,0.05)_20px)] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 border-2 border-destructive bg-destructive text-destructive-foreground flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-2xl uppercase italic tracking-tighter text-destructive ink-bleed leading-none">Nuclear Option</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-destructive/70">Irreversible Action</span>
          </div>
        </div>

        {showDeleteConfirm ? (
          <div className="space-y-4 bg-white border-2 border-destructive p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-sm font-bold uppercase tracking-wide text-destructive">
              To confirm dissolution, type the guild name:
              <br />
              <span className="text-black bg-destructive/20 px-1">{guild.name}</span>
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="CONFIRM GUILD NAME"
              className="border-2 border-destructive bg-secondary/10 font-bold focus:shadow-[4px_4px_0px_0px_rgba(239,68,68,1)] transition-all uppercase placeholder:text-destructive/40 text-destructive h-12"
            />
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleDelete}
                disabled={deleteConfirmText !== guild.name || isDeleting}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-none h-12 border-2 border-destructive font-black uppercase tracking-widest"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Dissolving...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Dissolve Guild
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                variant="outline"
                className="flex-[0.5] border-2 border-destructive text-destructive hover:bg-destructive/10 rounded-none h-12 font-black uppercase tracking-widest"
              >
                Abort
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-2 border-destructive/20 p-4">
            <div>
              <p className="font-black text-destructive uppercase tracking-tight">Dissolve Guild</p>
              <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Permanently delete this guild and all records.
              </p>
            </div>
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="outline"
              className="border-2 border-destructive text-destructive hover:bg-destructive hover:text-white rounded-none shadow-[2px_2px_0px_0px_rgba(239,68,68,1)] hover:shadow-[4px_4px_0px_0px_rgba(239,68,68,1)] hover:-translate-y-0.5 transition-all font-black uppercase tracking-widest h-12 px-6"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Initiate
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
