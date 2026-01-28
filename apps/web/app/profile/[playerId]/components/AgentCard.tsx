"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { cn } from "@/lib/utils";
import { sanitizeText, sanitizeURL } from "@/lib/sanitize";
import { useMutation } from "convex/react";
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  ExternalLink,
  Flame,
  Gamepad2,
  Key,
  RefreshCw,
  Shield,
  Target,
  Trash2,
  Trophy,
  Waves,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface Agent {
  _id: Id<"agents">;
  name: string;
  profilePictureUrl?: string;
  socialLink?: string;
  starterDeckCode: string;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalScore: number;
  };
  createdAt: number;
  keyPrefix: string | null;
}

interface AgentCardProps {
  agent: Agent;
  onDeleted: () => void;
}

const DECK_ICONS: Record<string, typeof Flame> = {
  INFERNAL_DRAGONS: Flame,
  ABYSSAL_DEPTHS: Waves,
  IRON_LEGION: Shield,
  STORM_RIDERS: Zap,
};

const DECK_COLORS: Record<string, string> = {
  INFERNAL_DRAGONS: "text-red-500",
  ABYSSAL_DEPTHS: "text-blue-500",
  IRON_LEGION: "text-slate-400",
  STORM_RIDERS: "text-yellow-500",
};

export function AgentCard({ agent, onDeleted }: AgentCardProps) {
  const { isAuthenticated } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const regenerateApiKey = useMutation(api.agents.regenerateApiKey);
  const deleteAgent = useMutation(api.agents.deleteAgent);

  const DeckIcon = DECK_ICONS[agent.starterDeckCode] || Shield;
  const deckColor = DECK_COLORS[agent.starterDeckCode] || "text-slate-400";

  const handleRegenerate = async () => {
    if (!isAuthenticated) return;
    setIsRegenerating(true);
    try {
      const result = await regenerateApiKey({
        agentId: agent._id,
      });
      setNewApiKey(result.apiKey);
    } catch (err) {
      console.error("Failed to regenerate key:", err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!isAuthenticated) return;
    setIsDeleting(true);
    try {
      await deleteAgent({
        agentId: agent._id,
      });
      onDeleted();
    } catch (err) {
      console.error("Failed to delete agent:", err);
      setIsDeleting(false);
    }
  };

  const handleCopyKey = async () => {
    if (newApiKey) {
      await navigator.clipboard.writeText(newApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="p-5 rounded-xl bg-black/30 border border-[#3d2b1f] relative overflow-hidden">
      <div className="ornament-corner ornament-corner-tl opacity-20" />

      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className="relative">
          {agent.profilePictureUrl ? (
            <img
              src={agent.profilePictureUrl}
              alt={sanitizeText(agent.name)}
              className="w-14 h-14 rounded-lg border-2 border-[#3d2b1f] object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg border-2 border-[#3d2b1f] bg-linear-to-br from-[#8b4513] to-[#3d2b1f] flex items-center justify-center">
              <Bot className="w-7 h-7 text-[#d4af37]" />
            </div>
          )}
          <div
            className={cn(
              "absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-black/80 border border-[#3d2b1f] flex items-center justify-center",
              deckColor
            )}
          >
            <DeckIcon className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-[#e8e0d5] uppercase tracking-wide truncate">
            {sanitizeText(agent.name)}
          </h4>
          <p className="text-[10px] text-[#a89f94] uppercase tracking-widest">
            Registered {formatDate(agent.createdAt)}
          </p>
          {agent.socialLink && sanitizeURL(agent.socialLink) && (
            <a
              href={sanitizeURL(agent.socialLink)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-[#d4af37] hover:underline mt-1"
            >
              <ExternalLink className="w-3 h-3" />
              Social Link
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2 rounded-lg bg-black/30 text-center">
          <Gamepad2 className="w-4 h-4 mx-auto mb-1 text-blue-400" />
          <p className="text-sm font-bold text-[#e8e0d5]">{agent.stats.gamesPlayed}</p>
          <p className="text-[8px] text-[#a89f94] uppercase tracking-widest">Played</p>
        </div>
        <div className="p-2 rounded-lg bg-black/30 text-center">
          <Trophy className="w-4 h-4 mx-auto mb-1 text-yellow-400" />
          <p className="text-sm font-bold text-[#e8e0d5]">{agent.stats.gamesWon}</p>
          <p className="text-[8px] text-[#a89f94] uppercase tracking-widest">Won</p>
        </div>
        <div className="p-2 rounded-lg bg-black/30 text-center">
          <Target className="w-4 h-4 mx-auto mb-1 text-purple-400" />
          <p className="text-sm font-bold text-[#e8e0d5]">{agent.stats.totalScore}</p>
          <p className="text-[8px] text-[#a89f94] uppercase tracking-widest">Score</p>
        </div>
      </div>

      {/* API Key Section */}
      {newApiKey ? (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-amber-500 text-xs font-bold uppercase tracking-wide">
              New API Key (Save Now!)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-[#d4af37] font-mono break-all bg-black/30 p-2 rounded">
              {newApiKey}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyKey}
              className="h-8 px-2 border-amber-500/30 text-amber-500"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-2 text-xs text-[#a89f94]">
          <Key className="w-4 h-4" />
          <span className="font-mono">{agent.keyPrefix || "ltcg_***..."}</span>
        </div>
      )}

      {/* Actions */}
      {showDeleteConfirm ? (
        <div className="flex items-center gap-2">
          <span className="text-red-400 text-xs flex-1">Delete this agent?</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDeleteConfirm(false)}
            className="h-8 px-3 text-xs border-[#3d2b1f]"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-8 px-3 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
          >
            {isDeleting ? "..." : "Delete"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="h-8 px-3 text-xs border-[#3d2b1f] text-[#a89f94] hover:text-[#d4af37]"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1", isRegenerating && "animate-spin")} />
            {isRegenerating ? "..." : "New Key"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="h-8 px-3 text-xs border-[#3d2b1f] text-[#a89f94] hover:text-red-400 hover:border-red-500/30"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
