import type { Id } from "@convex/_generated/dataModel";

export interface GuildMember {
  userId: string;
  username: string;
  image?: string;
  role: "owner" | "member";
  joinedAt: number;
  isOnline?: boolean;
}

export interface Guild {
  _id: Id<"guilds">;
  _creationTime: number;
  name: string;
  description: string;
  ownerId: Id<"users">;
  memberCount: number;
  icon?: string;
  banner?: string;
  isPrivate: boolean;
  minLevelToJoin: number;
}
