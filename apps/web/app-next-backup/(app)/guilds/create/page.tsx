"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { useMyGuild } from "@/hooks/guilds";
import { useCreateGuild } from "@/hooks/guilds/useCreateGuild";
import { cn } from "@/lib/utils";
import type { Visibility } from "@/types/common";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  Shield,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

type Step = 1 | 2 | 3;

export default function CreateGuildPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { guild } = useMyGuild();
  const { createGuild, isCreating } = useCreateGuild();

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const profileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Redirect if already in a guild
  if (guild) {
    router.push("/guilds");
    return null;
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-[#a89f94]/50" />
          <p className="text-[#a89f94]">Please log in to create a guild</p>
        </div>
      </div>
    );
  }

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "profile" | "banner"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      if (type === "profile") {
        setProfileImage(file);
        setProfilePreview(event.target?.result as string);
      } else {
        setBannerImage(file);
        setBannerPreview(event.target?.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Guild name is required");
      return;
    }

    setIsUploading(true);
    try {
      // Create the guild with images (hook handles upload)
      await createGuild(
        {
          name: name.trim(),
          description: description.trim() || undefined,
          visibility,
        },
        profileImage ?? undefined,
        bannerImage ?? undefined
      );

      router.push("/guilds");
    } catch {
      // Error handled by hook
    } finally {
      setIsUploading(false);
    }
  };

  const isNameValid = name.trim().length >= 3 && name.trim().length <= 32;
  const canProceedStep1 = isNameValid;
  const canCreate = canProceedStep1;

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-amber-900/10 via-[#0d0a09] to-[#0d0a09]" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Back Link */}
        <Link
          href="/guilds"
          className="inline-flex items-center gap-2 text-[#a89f94] hover:text-[#e8e0d5] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Guilds</span>
        </Link>

        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 mb-4">
              <Shield className="w-4 h-4 text-[#d4af37]" />
              <span className="text-xs font-bold text-[#d4af37] uppercase tracking-wider">
                Create Guild
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-[#e8e0d5] mb-2">
              Forge Your Guild
            </h1>
            <p className="text-[#a89f94]">Create a home for your champions</p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all",
                    step >= s ? "bg-[#d4af37] text-[#1a1614]" : "bg-[#3d2b1f] text-[#a89f94]"
                  )}
                >
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={cn(
                      "w-16 h-1 rounded-full transition-all",
                      step > s ? "bg-[#d4af37]" : "bg-[#3d2b1f]"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="p-8 rounded-2xl bg-gradient-to-br from-[#1a1614] to-[#261f1c] border border-[#3d2b1f]">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-[#e8e0d5]">Guild Identity</h2>
                  <p className="text-sm text-[#a89f94]">Choose a name and description</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="create-guild-name"
                      className="text-sm font-medium text-[#a89f94]"
                    >
                      Guild Name *
                    </label>
                    <Input
                      id="create-guild-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter guild name"
                      maxLength={32}
                      className="bg-black/40 border-[#3d2b1f] text-[#e8e0d5] text-lg py-6 focus:border-[#d4af37]/50"
                    />
                    <p className="text-xs text-[#a89f94]">
                      {name.length}/32 characters (minimum 3)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="create-guild-description"
                      className="text-sm font-medium text-[#a89f94]"
                    >
                      Description
                    </label>
                    <Textarea
                      id="create-guild-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell others about your guild..."
                      maxLength={500}
                      rows={4}
                      className="bg-black/40 border-[#3d2b1f] text-[#e8e0d5] focus:border-[#d4af37]/50 resize-none"
                    />
                    <p className="text-xs text-[#a89f94]">{description.length}/500 characters</p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-[#a89f94]">Visibility</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          value: "public" as const,
                          icon: Eye,
                          label: "Public",
                          desc: "Anyone can join",
                        },
                        {
                          value: "private" as const,
                          icon: EyeOff,
                          label: "Private",
                          desc: "Invite only",
                        },
                      ].map((option) => {
                        const Icon = option.icon;
                        const isSelected = visibility === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setVisibility(option.value)}
                            className={cn(
                              "p-4 rounded-xl border transition-all text-left",
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
              </div>
            )}

            {/* Step 2: Images */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-[#e8e0d5]">Guild Appearance</h2>
                  <p className="text-sm text-[#a89f94]">Add images to make your guild stand out</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Profile Image */}
                  <div className="space-y-3">
                    <label
                      htmlFor="create-guild-profile-image"
                      className="text-sm font-medium text-[#a89f94]"
                    >
                      Profile Image
                    </label>
                    <button
                      type="button"
                      onClick={() => profileInputRef.current?.click()}
                      className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-[#3d2b1f] hover:border-[#d4af37]/50 cursor-pointer transition-colors group"
                    >
                      {profilePreview ? (
                        <img
                          src={profilePreview}
                          alt="Profile preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1614]">
                          <Camera className="w-10 h-10 text-[#a89f94] mb-2" />
                          <p className="text-sm text-[#a89f94]">Click to upload</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    </button>
                    <input
                      id="create-guild-profile-image"
                      ref={profileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageSelect(e, "profile")}
                    />
                  </div>

                  {/* Banner Image */}
                  <div className="space-y-3">
                    <label
                      htmlFor="create-guild-banner-image"
                      className="text-sm font-medium text-[#a89f94]"
                    >
                      Banner Image
                    </label>
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="relative aspect-[16/9] rounded-xl overflow-hidden border-2 border-dashed border-[#3d2b1f] hover:border-[#d4af37]/50 cursor-pointer transition-colors group"
                    >
                      {bannerPreview ? (
                        <img
                          src={bannerPreview}
                          alt="Banner preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1614]">
                          <ImageIcon className="w-10 h-10 text-[#a89f94] mb-2" />
                          <p className="text-sm text-[#a89f94]">Click to upload</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-white" />
                      </div>
                    </button>
                    <input
                      id="create-guild-banner-image"
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageSelect(e, "banner")}
                    />
                  </div>
                </div>

                <p className="text-xs text-[#a89f94] text-center">
                  Images are optional. You can add them later in guild settings.
                </p>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-[#e8e0d5]">Review Your Guild</h2>
                  <p className="text-sm text-[#a89f94]">Make sure everything looks good</p>
                </div>

                {/* Preview Card */}
                <div className="rounded-xl overflow-hidden border border-[#3d2b1f]">
                  {/* Banner */}
                  <div className="relative h-32">
                    {bannerPreview ? (
                      <img
                        src={bannerPreview}
                        alt="Banner"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#8b4513] to-[#3d2b1f]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1614] to-transparent" />
                  </div>

                  <div className="relative px-6 pb-6 -mt-10">
                    <div className="flex items-end gap-4">
                      {/* Profile */}
                      {profilePreview ? (
                        <img
                          src={profilePreview}
                          alt="Profile"
                          className="w-20 h-20 rounded-xl object-cover border-4 border-[#1a1614]"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#8b4513] to-[#3d2b1f] border-4 border-[#1a1614] flex items-center justify-center">
                          <Shield className="w-8 h-8 text-[#d4af37]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pb-1">
                        <h3 className="text-xl font-bold text-[#e8e0d5] truncate">
                          {name || "Guild Name"}
                        </h3>
                        <p className="text-sm text-[#a89f94]">
                          {visibility === "public" ? "Public Guild" : "Private Guild"}
                        </p>
                      </div>
                    </div>
                    {description && (
                      <p className="mt-4 text-sm text-[#a89f94] line-clamp-3">{description}</p>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-[#d4af37] shrink-0" />
                  <p className="text-sm text-[#d4af37]">
                    You'll be the Guild Leader with full control over settings and members.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#3d2b1f]">
              {step > 1 ? (
                <Button
                  onClick={() => setStep((step - 1) as Step)}
                  variant="ghost"
                  className="text-[#a89f94] hover:text-[#e8e0d5]"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <Button
                  onClick={() => setStep((step + 1) as Step)}
                  disabled={step === 1 && !canProceedStep1}
                  className="tcg-button-primary rounded-xl px-6"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={!canCreate || isCreating || isUploading}
                  className="tcg-button-primary rounded-xl px-8 py-6"
                >
                  {isCreating || isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Create Guild
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
