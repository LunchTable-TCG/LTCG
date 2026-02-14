"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { sanitizeText, sanitizeURL } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { Bot, ChevronLeft, ChevronRight, Image, Link, Loader2, X } from "lucide-react";
import { useState } from "react";
import { ApiKeyDisplay } from "./ApiKeyDisplay";
import { StarterDeckPicker } from "./StarterDeckPicker";

interface RegisterAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3 | 4;

export function RegisterAgentModal({ isOpen, onClose, onSuccess }: RegisterAgentModalProps) {
  const { isAuthenticated } = useAuth();

  // Form state
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);

  // Result state
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Loading/error state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Queries and mutations
  const starterDecks = useConvexQuery(typedApi.agents.agents.getStarterDecks, {});
  const registerAgent = useConvexMutation(typedApi.agents.agents.registerAgent);

  const handleSubmit = async () => {
    if (!isAuthenticated || !name || !selectedDeck) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await registerAgent({
        name,
        profilePictureUrl: profilePictureUrl || undefined,
        socialLink: socialLink || undefined,
        starterDeckCode: selectedDeck,
      });

      setApiKey(result.apiKey);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = () => {
    onSuccess();
    handleClose();
  };

  const handleClose = () => {
    // Reset state
    setStep(1);
    setName("");
    setProfilePictureUrl("");
    setSocialLink("");
    setSelectedDeck(null);
    setApiKey(null);
    setError(null);
    onClose();
  };

  const canProceedStep1 = name.trim().length >= 3;
  const canProceedStep2 = selectedDeck !== null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={step < 4 ? handleClose : undefined}
        onKeyDown={step < 4 ? (e) => e.key === "Enter" && handleClose() : undefined}
        role={step < 4 ? "button" : undefined}
        tabIndex={step < 4 ? 0 : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-linear-to-br from-[#1a1614] to-[#261f1c] rounded-2xl border border-[#3d2b1f] shadow-2xl overflow-hidden flex flex-col">
        <div className="ornament-corner ornament-corner-tl" />
        <div className="ornament-corner ornament-corner-tr" />

        {/* Header */}
        <div className="p-6 border-b border-[#3d2b1f]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/30 flex items-center justify-center">
                <Bot className="w-5 h-5 text-[#d4af37]" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#e8e0d5] uppercase tracking-wide">
                  Register AI Agent
                </h2>
                <p className="text-[10px] text-[#a89f94] uppercase tracking-widest">
                  Step {step} of 4
                </p>
              </div>
            </div>
            {step < 4 && (
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4 flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  s <= step ? "bg-[#d4af37]" : "bg-[#3d2b1f]"
                )}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Agent Name */}
              <div>
                <label
                  htmlFor="register-agent-name"
                  className="block text-[10px] font-black text-[#a89f94] uppercase tracking-widest mb-2"
                >
                  Agent Name *
                </label>
                <div className="relative group">
                  <Bot className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94] group-focus-within:text-[#d4af37] transition-colors" />
                  <input
                    id="register-agent-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter agent name (3-32 chars)"
                    maxLength={32}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border border-[#3d2b1f]/20 focus:outline-none focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10 transition-all"
                  />
                </div>
                <p className="mt-1 text-[10px] text-[#a89f94]">{name.length}/32 characters</p>
              </div>

              {/* Profile Picture URL */}
              <div>
                <label
                  htmlFor="register-agent-profile-picture-url"
                  className="block text-[10px] font-black text-[#a89f94] uppercase tracking-widest mb-2"
                >
                  Profile Picture URL (Optional)
                </label>
                <div className="relative group">
                  <Image className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94] group-focus-within:text-[#d4af37] transition-colors" />
                  <input
                    id="register-agent-profile-picture-url"
                    type="url"
                    value={profilePictureUrl}
                    onChange={(e) => setProfilePictureUrl(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border border-[#3d2b1f]/20 focus:outline-none focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10 transition-all"
                  />
                </div>
              </div>

              {/* Social Link */}
              <div>
                <label
                  htmlFor="register-agent-social-link"
                  className="block text-[10px] font-black text-[#a89f94] uppercase tracking-widest mb-2"
                >
                  Social/Website Link (Optional)
                </label>
                <div className="relative group">
                  <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94] group-focus-within:text-[#d4af37] transition-colors" />
                  <input
                    id="register-agent-social-link"
                    type="url"
                    value={socialLink}
                    onChange={(e) => setSocialLink(e.target.value)}
                    placeholder="https://twitter.com/your_agent"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-parchment text-[#2a1f14] placeholder:text-[#2a1f14]/40 border border-[#3d2b1f]/20 focus:outline-none focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#d4af37]/10 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Choose Deck */}
          {step === 2 && starterDecks && (
            <StarterDeckPicker
              decks={starterDecks}
              selectedDeck={selectedDeck}
              onSelect={setSelectedDeck}
            />
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-black text-[#e8e0d5] uppercase tracking-wider">
                  Review & Confirm
                </h3>
                <p className="text-[#a89f94] text-xs mt-1">
                  Verify your agent's details before registration
                </p>
              </div>

              <div className="space-y-4 p-4 rounded-xl bg-black/30 border border-[#3d2b1f]">
                <div className="flex justify-between">
                  <span className="text-[#a89f94] text-sm">Name</span>
                  <span className="text-[#e8e0d5] font-bold">{sanitizeText(name)}</span>
                </div>
                {profilePictureUrl && sanitizeURL(profilePictureUrl) && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#a89f94] text-sm">Avatar</span>
                    <img
                      src={sanitizeURL(profilePictureUrl)}
                      alt="Preview"
                      className="w-8 h-8 rounded-lg object-cover border border-[#3d2b1f]"
                    />
                  </div>
                )}
                {socialLink && sanitizeURL(socialLink) && (
                  <div className="flex justify-between">
                    <span className="text-[#a89f94] text-sm">Social</span>
                    <a
                      href={sanitizeURL(socialLink)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#d4af37] text-sm hover:underline truncate max-w-[200px]"
                    >
                      {sanitizeText(socialLink)}
                    </a>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#a89f94] text-sm">Starter Deck</span>
                  <span className="text-[#e8e0d5] font-bold">
                    {starterDecks?.find(
                      (d: { deckCode: string; name: string }) => d.deckCode === selectedDeck
                    )?.name || selectedDeck}
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 4: API Key */}
          {step === 4 && apiKey && (
            <ApiKeyDisplay
              apiKey={apiKey}
              buttonLabel="Finish Registration"
              onAcknowledge={handleComplete}
            />
          )}
        </div>

        {/* Footer (setup flow only) */}
        {step < 4 && (
          <div className="p-6 border-t border-[#3d2b1f] flex items-center justify-between">
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={() => setStep((s) => (s - 1) as Step)}
                className="h-11 px-5 font-bold uppercase tracking-wide border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5]"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                className={cn(
                  "h-11 px-5 font-bold uppercase tracking-wide",
                  (step === 1 ? canProceedStep1 : canProceedStep2)
                    ? "tcg-button-primary text-white"
                    : "bg-[#3d2b1f]/50 text-[#a89f94]/50 cursor-not-allowed"
                )}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="h-11 px-6 font-bold uppercase tracking-wide tcg-button-primary text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register Agent"
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
