/**
 * Agents Tab Component
 * Displays player's AI agents with their stats
 */

import { Bot } from "lucide-react";
import type { PlayerProfile } from "./types";

interface AgentsTabProps {
  profile: PlayerProfile;
}

export function AgentsTab({ profile }: AgentsTabProps) {
  if (profile.agents.length === 0) {
    return (
      <div className="text-center py-8">
        <Bot className="w-12 h-12 text-[#a89f94]/30 mx-auto mb-3" />
        <p className="text-[#a89f94]">No agents created yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {profile.agents.map((agent) => {
        const agentWinRate = ((agent.wins / (agent.wins + agent.losses)) * 100).toFixed(1);
        return (
          <div
            key={agent.id}
            className="flex items-center gap-4 p-4 rounded-xl bg-black/30 border border-purple-500/30 hover:border-purple-500/50 transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30 text-2xl">
              {agent.avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-[#e8e0d5]">{agent.name}</p>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-[10px] font-bold text-purple-400 uppercase">
                  {agent.personality}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-green-400">{agent.wins}W</span>
                <span className="text-red-400">{agent.losses}L</span>
                <span className="text-[#a89f94]">{agentWinRate}% WR</span>
              </div>
            </div>
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
        );
      })}
    </div>
  );
}
