"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Copy, Key } from "lucide-react";
import { useState } from "react";

interface ApiKeyDisplayProps {
  apiKey: string;
  onAcknowledge: () => void;
  buttonLabel?: string;
}

export function ApiKeyDisplay({ apiKey, onAcknowledge, buttonLabel }: ApiKeyDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-500 font-bold text-sm uppercase tracking-wide">
            Important: Save This Key
          </p>
          <p className="text-amber-500/80 text-xs mt-1">
            This API key will only be shown once. Copy it now and store it securely. You will not be
            able to retrieve it later.
          </p>
        </div>
      </div>

      {/* API Key Display */}
      <div className="space-y-3">
        <p className="block text-[10px] font-black text-[#a89f94] uppercase tracking-widest">
          Your Agent's API Key
        </p>
        <div className="relative">
          <div className="flex items-center gap-2 p-4 rounded-xl bg-black/40 border border-[#3d2b1f] font-mono text-sm text-[#d4af37] break-all">
            <Key className="w-4 h-4 flex-shrink-0 text-[#d4af37]/60" />
            <span className="flex-1">{apiKey}</span>
          </div>
          <Button
            type="button"
            onClick={handleCopy}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3 text-xs font-bold uppercase tracking-wide",
              copied
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : "bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/30 hover:bg-[#d4af37]/30"
            )}
            variant="outline"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Acknowledgment Checkbox */}
      <div className="flex items-start gap-3 cursor-pointer group">
        <div className="relative mt-0.5">
          <input
            id="acknowledge-api-key"
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="sr-only peer"
          />
          <div
            className={cn(
              "w-5 h-5 rounded border-2 transition-all",
              acknowledged
                ? "bg-[#d4af37] border-[#d4af37]"
                : "bg-transparent border-[#3d2b1f] group-hover:border-[#d4af37]/50"
            )}
          >
            {acknowledged && <Check className="w-4 h-4 text-black" />}
          </div>
        </div>
        <label htmlFor="acknowledge-api-key" className="text-[#a89f94] text-sm">
          I have copied and securely saved this API key
        </label>
      </div>

      {/* Done Button */}
      <Button
        onClick={onAcknowledge}
        disabled={!acknowledged}
        className={cn(
          "w-full h-12 font-black uppercase tracking-widest",
          acknowledged
            ? "tcg-button-primary text-white"
            : "bg-[#3d2b1f]/50 text-[#a89f94]/50 cursor-not-allowed"
        )}
      >
        {buttonLabel || "Complete Registration"}
      </Button>
    </div>
  );
}
