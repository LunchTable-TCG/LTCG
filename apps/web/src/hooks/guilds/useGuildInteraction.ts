"use client";

import { useState } from "react";
import { useAuth } from "../auth/useConvexAuthHook";
import { useGuildDiscovery } from "./useGuildDiscovery";
import { useMyGuild } from "./useMyGuild";
import { useGuild } from "./useGuild";

export type GuildDashboardTab = "members" | "chat" | "settings" | "invites";

export function useGuildInteraction() {
  const { isAuthenticated } = useAuth();
  const myGuild = useMyGuild();
  const discovery = useGuildDiscovery();

  // Fetch detailed guild data if user has a guild
  const guildDetails = useGuild(myGuild.guild?._id ?? null);

  const [activeTab, setActiveTab] = useState<GuildDashboardTab>("members");

  return {
    isAuthenticated,
    // Combine loading states
    isLoading: myGuild.isLoading || (myGuild.hasGuild && guildDetails.isLoading),

    // Guild Membership State
    hasGuild: myGuild.hasGuild,
    guild: myGuild.guild,

    // Dashboard State (for when user has a guild)
    dashboard: {
      activeTab,
      setActiveTab,
      guild: myGuild.guild,
      details: guildDetails.guild,
      members: guildDetails.members,
      onlineMemberCount: guildDetails.onlineMemberCount,
      joinRequests: guildDetails.joinRequests,
      leaveGuild: myGuild.leaveGuild,
      kickMember: guildDetails.kickMember,
      transferOwnership: guildDetails.transferOwnership,
      approveRequest: guildDetails.approveRequest,
      rejectRequest: guildDetails.rejectRequest,
      updateGuild: guildDetails.updateGuild,
      setProfileImage: guildDetails.setProfileImage,
      setBannerImage: guildDetails.setBannerImage,
      isOwner: myGuild.isOwner,
      isMember: myGuild.isMember,
      myRole: myGuild.myRole,
    },

    // Discovery State (for when user has no guild)
    discovery: {
      ...discovery,
    },
  };
}
