"use client";

import { ChannelHealthPanel } from "@/components/streaming/ChannelHealthPanel";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { useAllActiveStreams } from "@/hooks/useStreaming";
import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import { Bot, Radio, Sparkles } from "lucide-react";
import Link from "next/link";

type AgentWithStreaming = {
  _id: string;
  name: string;
  streamingEnabled?: boolean;
  streamingAutoStart?: boolean;
  streamingPlatform?: string;
};

export default function LiveStreamingPage() {
  const { isAuthenticated } = useAuth();
  const currentUser = useConvexQuery(
    typedApi.core.users.currentUser,
    isAuthenticated ? {} : "skip"
  );
  const agentsRaw = useConvexQuery(
    typedApi.agents.agents.getUserAgents,
    isAuthenticated ? {} : "skip"
  );
  const { streams } = useAllActiveStreams();

  if (!currentUser) {
    return null;
  }

  const agents = (agentsRaw || []) as AgentWithStreaming[];
  const agentIdSet = new Set(agents.map((agent) => agent._id));

  const activeAgentStreams = (streams || []).filter((session) => {
    const sessionAgentId = (session as { agentId?: string }).agentId;
    return (
      session.streamType === "agent" &&
      typeof sessionAgentId === "string" &&
      agentIdSet.has(sessionAgentId)
    );
  });

  const activeSessionId = activeAgentStreams[0]?._id;

  return (
    <div className="min-h-screen bg-[#0a0706] text-[#e8e0d5]">
      <div className="container mx-auto px-4 pt-28 pb-14">
        <div className="mb-8 rounded-2xl border border-[#3d2b1f] bg-gradient-to-b from-black/55 to-black/35 p-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#4a3425] bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#d4af37]">
            <Sparkles className="h-3.5 w-3.5" />
            Agent Streaming
          </div>
          <h1 className="text-3xl font-black tracking-wide">Agent Stream Monitor</h1>
          <p className="mt-2 text-[#a89f94]">
            Human streaming controls and pre-live setup were removed. This page is now read-only for
            agent stream status.
          </p>
          <p className="mt-1 text-xs text-[#8f8171]">
            Agent streams run from autonomous game lifecycle events. No manual go-live setup is
            required here.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-[#3d2b1f] bg-black/35 p-6">
            <h2 className="mb-4 text-lg font-bold text-[#f5deb3]">Your Agents</h2>

            {agents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#4a3425] bg-black/25 p-5 text-sm text-[#a89f94]">
                No agents found. Register an agent to enable autonomous match streaming.
                <div className="mt-3">
                  <Link href="/profile" className="text-[#d4af37] hover:underline">
                    Open profile to manage agents
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {agents.map((agent) => {
                  const isLive = activeAgentStreams.some((session) => {
                    const sessionAgentId = (session as { agentId?: string }).agentId;
                    return sessionAgentId === agent._id;
                  });

                  return (
                    <div
                      key={agent._id}
                      className="rounded-xl border border-[#4a3425] bg-black/25 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-2">
                          <Bot className="h-4 w-4 text-[#d4af37]" />
                          <span className="font-semibold text-[#f5deb3]">{agent.name}</span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                            isLive
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : "bg-[#3d2b1f]/60 text-[#c7b8a4] border border-[#4a3425]"
                          }`}
                        >
                          <Radio className="h-3 w-3" />
                          {isLive ? "Live" : "Idle"}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-[#a89f94]">
                        <p>
                          Streaming: {agent.streamingEnabled ? "enabled" : "disabled"} · Auto-start: {" "}
                          {agent.streamingAutoStart ? "on" : "off"}
                        </p>
                        <p>
                          Platform: {agent.streamingPlatform ? agent.streamingPlatform : "not configured"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <ChannelHealthPanel sessionId={activeSessionId} />
            <div className="rounded-2xl border border-[#3d2b1f] bg-black/30 p-4 text-xs text-[#a89f94]">
              Active stream sessions: <span className="text-[#f5deb3]">{activeAgentStreams.length}</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
