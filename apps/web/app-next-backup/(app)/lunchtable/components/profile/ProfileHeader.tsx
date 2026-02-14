/**
 * Profile Header Component
 * Displays player avatar, username, ranks, status, socials, and challenge button
 */

import { cn } from "@/lib/utils";
import { Gamepad2, Swords, Trophy } from "lucide-react";
import { DiscordIcon, TwitchIcon, TwitterIcon } from "./SocialIcons";
import { RANK_COLORS } from "./constants";
import type { PlayerProfile } from "./types";

interface ProfileHeaderProps {
  profile: PlayerProfile;
  onChallenge: () => void;
}

export function ProfileHeader({ profile, onChallenge }: ProfileHeaderProps) {
  const rankColors =
    RANK_COLORS[profile.rank.ranked.tier as keyof typeof RANK_COLORS] || RANK_COLORS.Bronze;

  return (
    <div className="relative p-6 pb-4 bg-linear-to-b from-[#1a1614] to-transparent">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative">
          <div
            className={cn(
              "w-20 h-20 rounded-xl bg-linear-to-br from-[#8b4513] to-[#3d2b1f] flex items-center justify-center border-2",
              rankColors.border
            )}
          >
            <span className="text-3xl font-black text-[#d4af37]">
              {profile.username[0]?.toUpperCase()}
            </span>
          </div>
          {/* Status indicator */}
          <div
            className={cn(
              "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-[#1a1614]",
              profile.status === "online"
                ? "bg-green-500"
                : profile.status === "in_game"
                  ? "bg-amber-500"
                  : profile.status === "idle"
                    ? "bg-gray-500"
                    : "bg-red-500"
            )}
          />
        </div>

        {/* User Info */}
        <div className="flex-1">
          <h2 className="text-2xl font-black text-[#e8e0d5] mb-1">{profile.username}</h2>

          {/* Ranks */}
          <div className="flex items-center gap-3 mb-2">
            {/* Ranked */}
            <div
              data-testid="player-rank"
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg border",
                rankColors.bg,
                rankColors.border
              )}
            >
              <Trophy className={cn("w-3.5 h-3.5", rankColors.text)} />
              <span className={cn("text-xs font-bold", rankColors.text)}>
                {profile.rank.ranked.tier} {profile.rank.ranked.division}
              </span>
              <span className="text-[10px] text-[#a89f94]">{profile.rank.ranked.lp} LP</span>
            </div>

            {/* Casual */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border bg-green-500/10 border-green-500/30">
              <Gamepad2 className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-bold text-green-400">
                {profile.rank.casual.tier} {profile.rank.casual.division}
              </span>
            </div>
          </div>

          {/* Socials */}
          {(profile.socials.twitter || profile.socials.discord || profile.socials.twitch) && (
            <div className="flex items-center gap-2">
              {profile.socials.twitter && (
                <a
                  href={`https://twitter.com/${profile.socials.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-black/30 border border-[#3d2b1f] text-[#a89f94] hover:text-white hover:border-[#1DA1F2] transition-all"
                  title={`@${profile.socials.twitter}`}
                >
                  <TwitterIcon />
                </a>
              )}
              {profile.socials.discord && (
                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-black/30 border border-[#3d2b1f] text-[#a89f94] hover:text-[#5865F2] hover:border-[#5865F2] transition-all"
                  title={profile.socials.discord}
                >
                  <DiscordIcon />
                </button>
              )}
              {profile.socials.twitch && (
                <a
                  href={`https://twitch.tv/${profile.socials.twitch}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-black/30 border border-[#3d2b1f] text-[#a89f94] hover:text-[#9146FF] hover:border-[#9146FF] transition-all"
                  title={profile.socials.twitch}
                >
                  <TwitchIcon />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Challenge Button */}
        {profile.status === "online" && (
          <button
            type="button"
            onClick={onChallenge}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#d4af37] hover:bg-[#d4af37]/30 font-bold uppercase tracking-wide text-sm transition-all"
          >
            <Swords className="w-4 h-4" />
            Challenge
          </button>
        )}
      </div>
    </div>
  );
}
