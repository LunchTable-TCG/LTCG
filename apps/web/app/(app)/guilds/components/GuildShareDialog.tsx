"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useGuildInviteLink } from "@/hooks/guilds";
import { Check, Copy, Link2, Loader2, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface GuildShareDialogProps {
  guildName: string;
  children: React.ReactNode;
}

function getInviteUrl(code: string) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/invite/guild/${code}`;
}

function getShareText(guildName: string) {
  return `Join my guild "${guildName}" on Lunchtable TCG!`;
}

// X/Twitter icon (no lucide icon for this)
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// Telegram icon
function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

// Discord icon
function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
    </svg>
  );
}

export function GuildShareDialog({ guildName, children }: GuildShareDialogProps) {
  const { myInviteLink, generateLink, isLoading } = useGuildInviteLink();
  const [isGenerating, setIsGenerating] = useState(false);
  const [justCopied, setJustCopied] = useState<string | null>(null);

  const inviteCode = myInviteLink?.code;
  const inviteUrl = inviteCode ? getInviteUrl(inviteCode) : null;
  const shareText = getShareText(guildName);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateLink({});
      toast.success("Invite link generated!");
    } catch {
      // Error handled by hook
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setJustCopied(label);
      toast.success("Copied to clipboard!");
      setTimeout(() => setJustCopied(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleShareX = () => {
    if (!inviteUrl) return;
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(inviteUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareTelegram = () => {
    if (!inviteUrl) return;
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareDiscord = () => {
    if (!inviteUrl) return;
    // Discord doesn't have a share URL, so copy a formatted message
    const discordMessage = `${shareText}\n${inviteUrl}`;
    handleCopy(discordMessage, "discord");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-[#1a1614] border-[#3d2b1f] text-[#e8e0d5] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-[#e8e0d5]">
            Invite Friends
          </DialogTitle>
          <DialogDescription className="text-[#a89f94]">
            Share this link to invite players to {guildName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Invite Link Section */}
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-[#d4af37]" />
            </div>
          ) : inviteUrl ? (
            <div className="space-y-3">
              {/* Link display + copy */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-black/40 border border-[#3d2b1f]">
                <Link2 className="w-4 h-4 text-[#d4af37] shrink-0" />
                <span className="text-sm text-[#a89f94] truncate flex-1 font-mono">
                  {inviteUrl}
                </span>
                <Button
                  onClick={() => handleCopy(inviteUrl, "link")}
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-[#d4af37] hover:text-[#f9e29f] hover:bg-[#d4af37]/10"
                >
                  {justCopied === "link" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Expiry info */}
              {myInviteLink?.expiresAt && (
                <p className="text-xs text-[#a89f94]/60 text-center">
                  Expires {new Date(myInviteLink.expiresAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {myInviteLink.uses > 0 && (
                    <span className="ml-2">
                      · {myInviteLink.uses} {myInviteLink.uses === 1 ? "use" : "uses"}
                    </span>
                  )}
                </p>
              )}

              {/* Share buttons */}
              <div className="grid grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={handleShareX}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-black/40 border border-[#3d2b1f] hover:border-[#d4af37]/50 hover:bg-[#d4af37]/5 transition-all"
                >
                  <XIcon />
                  <span className="text-xs text-[#a89f94] font-medium">X</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareTelegram}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-black/40 border border-[#3d2b1f] hover:border-[#d4af37]/50 hover:bg-[#d4af37]/5 transition-all"
                >
                  <TelegramIcon />
                  <span className="text-xs text-[#a89f94] font-medium">Telegram</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareDiscord}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-black/40 border border-[#3d2b1f] hover:border-[#d4af37]/50 hover:bg-[#d4af37]/5 transition-all"
                >
                  {justCopied === "discord" ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <DiscordIcon />
                  )}
                  <span className="text-xs text-[#a89f94] font-medium">Discord</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(inviteUrl, "link")}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-black/40 border border-[#3d2b1f] hover:border-[#d4af37]/50 hover:bg-[#d4af37]/5 transition-all"
                >
                  {justCopied === "link" ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                  <span className="text-xs text-[#a89f94] font-medium">Copy</span>
                </button>
              </div>

              {/* Regenerate link */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                variant="outline"
                className="w-full border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 rounded-xl"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                Generate New Link
              </Button>
            </div>
          ) : (
            /* No link yet - generate one */
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center">
                <Share2 className="w-8 h-8 text-[#d4af37]" />
              </div>
              <div>
                <p className="text-[#e8e0d5] font-medium">No active invite link</p>
                <p className="text-sm text-[#a89f94] mt-1">
                  Generate a link to share with friends
                </p>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="tcg-button-primary rounded-xl px-8"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                Generate Invite Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
