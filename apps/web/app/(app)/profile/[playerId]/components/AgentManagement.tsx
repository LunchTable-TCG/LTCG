"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import { Bot, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { type Agent, AgentCard } from "./AgentCard";
import { RegisterAgentModal } from "./RegisterAgentModal";

const MAX_AGENTS = Number(process.env.NEXT_PUBLIC_MAX_AGENTS_PER_USER || 3);

export function AgentManagement() {
  const { isAuthenticated } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const agents = useConvexQuery(
    typedApi.agents.agents.getUserAgents,
    isAuthenticated ? {} : "skip"
  );

  const isLoading = agents === undefined;
  const agentCount = agents?.length || 0;
  const canRegisterMore = agentCount < MAX_AGENTS;

  const handleAgentDeleted = () => {
    // The query will automatically refetch
  };

  const handleAgentRegistered = () => {
    // The query will automatically refetch
    setIsModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative z-10">
      {/* Agent Count Badge */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-[#a89f94] uppercase tracking-widest">
            Registered Agents
          </span>
          <span className="text-[10px] font-bold text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded">
            {agentCount}/{MAX_AGENTS}
          </span>
        </div>

        {canRegisterMore && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="h-9 px-4 text-xs font-bold uppercase tracking-wide tcg-button-primary text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Register Agent
          </Button>
        )}
      </div>

      {/* Agent List */}
      {agents && agents.length > 0 ? (
        <div className="space-y-4">
          {agents.map((agent: Agent) => (
            <AgentCard key={agent._id} agent={agent} onDeleted={handleAgentDeleted} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-[#3d2b1f] rounded-xl bg-black/20">
          <Bot className="w-12 h-12 text-[#3d2b1f] mb-4" />
          <p className="text-[#a89f94] text-sm font-medium mb-1">No agents registered yet</p>
          <p className="text-[#a89f94]/60 text-xs mb-4">
            Register an elizaOS agent to compete on your behalf
          </p>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="h-10 px-5 text-sm font-bold uppercase tracking-wide tcg-button-primary text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Register Your First Agent
          </Button>
        </div>
      )}

      {/* Max Agents Warning */}
      {!canRegisterMore && (
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500/80 text-xs">
          You have reached the maximum of {MAX_AGENTS} agents per account. Delete an existing agent
          to register a new one.
        </div>
      )}

      {/* Registration Modal */}
      <RegisterAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAgentRegistered}
      />
    </div>
  );
}
