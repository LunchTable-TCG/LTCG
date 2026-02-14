"use client";

import { Button } from "@/components/ui/button";
import { useConvexQuery } from "@/lib/convexHelpers";
import { useMutationWithToast } from "@/lib/useMutationWithToast";
import { api } from "@convex/_generated/api";
import { usePrivy } from "@privy-io/react-auth";
import { useConvexAuth } from "convex/react";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  Loader2,
  LogIn,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Module-scope references to avoid TS2589
const getGuildByInviteCodeQuery = api.social.guilds.inviteLinks.getGuildByInviteCode;
const joinViaInviteLinkMutation = api.social.guilds.inviteLinks.joinViaInviteLink;
const hasGuildQuery = api.social.guilds.core.hasGuild;

export default function GuildInvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const { ready: privyReady, authenticated: privyAuthenticated } = usePrivy();
  const { isAuthenticated: convexAuthenticated, isLoading: convexLoading } = useConvexAuth();

  const isAuthenticated = privyAuthenticated && convexAuthenticated;
  const isAuthLoading = !privyReady || convexLoading;

  // Guild preview (no auth required)
  const guildPreview = useConvexQuery(getGuildByInviteCodeQuery, code ? { code } : "skip");

  // Check if user already has a guild (only when authenticated)
  const hasGuild = useConvexQuery(hasGuildQuery, isAuthenticated ? {} : "skip");

  // Join mutation
  const joinViaLink = useMutationWithToast(joinViaInviteLinkMutation, {
    success: "Welcome to the guild!",
    error: "Failed to join guild",
  });

  const [isJoining, setIsJoining] = useState(false);

  // Store referral info in sessionStorage for the auth flow
  useEffect(() => {
    if (guildPreview?.guildId) {
      sessionStorage.setItem(
        "referral",
        JSON.stringify({
          source: "guild_invite",
          code,
          guildId: guildPreview.guildId,
        })
      );
    }
  }, [guildPreview, code]);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      await joinViaLink({ code });
      router.push("/guilds");
    } catch {
      // Error handled by useMutationWithToast
    } finally {
      setIsJoining(false);
    }
  };

  const returnTo = `/invite/guild/${code}`;
  const signupUrl = `/signup?returnTo=${encodeURIComponent(returnTo)}`;
  const loginUrl = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  // Loading states
  if (guildPreview === undefined) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
          <p className="text-[#a89f94] text-sm uppercase tracking-widest font-bold">
            Loading invite...
          </p>
        </div>
      </div>
    );
  }

  // Invalid or not found
  if (guildPreview === null) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#e8e0d5] mb-2">Invalid Invite Link</h1>
            <p className="text-[#a89f94]">This invite link is no longer active or doesn't exist.</p>
          </div>
          <Link href="/">
            <Button className="tcg-button-primary rounded-xl px-8">Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Expired
  if (guildPreview.isExpired) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Clock className="w-10 h-10 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#e8e0d5] mb-2">Invite Expired</h1>
            <p className="text-[#a89f94]">
              This invite link to{" "}
              <span className="text-[#e8e0d5] font-bold">{guildPreview.guildName}</span> has
              expired. Ask a guild member for a new link.
            </p>
          </div>
          <Link href="/">
            <Button className="tcg-button-primary rounded-xl px-8">Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Guild Preview Card */}
        <div className="rounded-2xl border border-[#3d2b1f] overflow-hidden bg-black/40">
          {/* Banner gradient */}
          <div className="h-24 bg-gradient-to-br from-[#8b4513] via-[#5c3d2e] to-[#3d2b1f]" />

          <div className="px-6 pb-6 -mt-10">
            {/* Guild avatar */}
            <div className="relative inline-block mb-4">
              {guildPreview.guildProfileImageUrl ? (
                <img
                  src={guildPreview.guildProfileImageUrl}
                  alt={guildPreview.guildName}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-[#0d0a09] shadow-2xl"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#8b4513] to-[#3d2b1f] border-4 border-[#0d0a09] shadow-2xl flex items-center justify-center">
                  <Shield className="w-8 h-8 text-[#d4af37]" />
                </div>
              )}
            </div>

            {/* Guild info */}
            <h1 className="text-2xl font-black text-[#e8e0d5] mb-1">{guildPreview.guildName}</h1>

            {guildPreview.guildDescription && (
              <p className="text-[#a89f94] text-sm mb-4 line-clamp-2">
                {guildPreview.guildDescription}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#d4af37]" />
                <span className="text-[#e8e0d5] font-medium">{guildPreview.guildMemberCount}</span>
                <span className="text-[#a89f94]">/{guildPreview.guildMaxMembers} members</span>
              </div>

              {guildPreview.inviterUsername && (
                <span className="text-[#a89f94] text-xs">
                  Invited by{" "}
                  <span className="text-[#e8e0d5] font-medium">{guildPreview.inviterUsername}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="space-y-4">
          {guildPreview.isFull ? (
            /* Guild is full */
            <div className="text-center p-6 rounded-xl bg-black/40 border border-[#3d2b1f]">
              <AlertCircle className="w-8 h-8 mx-auto mb-3 text-amber-400" />
              <p className="text-[#e8e0d5] font-medium">This guild is full</p>
              <p className="text-sm text-[#a89f94] mt-1">
                The guild has reached its maximum of {guildPreview.guildMaxMembers} members.
              </p>
            </div>
          ) : isAuthLoading ? (
            /* Auth still loading */
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-[#d4af37]" />
            </div>
          ) : !isAuthenticated ? (
            /* Not authenticated - show signup/login */
            <div className="space-y-3">
              <Link href={signupUrl} className="block">
                <Button className="w-full tcg-button-primary rounded-xl py-6 text-lg font-black uppercase tracking-widest">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Sign Up to Join
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>

              <Link href={loginUrl} className="block">
                <Button
                  variant="outline"
                  className="w-full border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 rounded-xl py-5"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Already have an account? Sign In
                </Button>
              </Link>
            </div>
          ) : hasGuild === undefined ? (
            /* Checking guild membership */
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-[#d4af37]" />
            </div>
          ) : hasGuild ? (
            /* Already in a guild */
            <div className="text-center p-6 rounded-xl bg-black/40 border border-[#3d2b1f]">
              <Shield className="w-8 h-8 mx-auto mb-3 text-[#a89f94]" />
              <p className="text-[#e8e0d5] font-medium">You're already in a guild</p>
              <p className="text-sm text-[#a89f94] mt-1">
                Leave your current guild first to join a new one.
              </p>
              <Link href="/guilds">
                <Button
                  variant="outline"
                  className="mt-4 border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] rounded-xl"
                >
                  Go to My Guild
                </Button>
              </Link>
            </div>
          ) : (
            /* Authenticated, not in a guild - can join! */
            <Button
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full tcg-button-primary rounded-xl py-6 text-lg font-black uppercase tracking-widest"
            >
              {isJoining ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Shield className="w-5 h-5 mr-2" />
              )}
              Join {guildPreview.guildName}
            </Button>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#a89f94]/40">
          <Link href="/" className="hover:text-[#d4af37] transition-colors">
            Lunchtable TCG
          </Link>
        </p>
      </div>
    </div>
  );
}
