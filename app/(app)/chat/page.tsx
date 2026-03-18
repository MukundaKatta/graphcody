"use client";

import { useState } from "react";
import { useRepos } from "@/hooks/use-repos";
import { useChatSessions } from "@/hooks/use-chat";
import { useAppStore } from "@/lib/store";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { timeAgo } from "@/lib/utils";

export default function ChatPage() {
  const { repos } = useRepos();
  const { activeRepo, setActiveRepo, activeChatSession, setActiveChatSession } = useAppStore();
  const [repoId, setRepoId] = useState(activeRepo?.id || "");

  const { sessions, isLoading, createSession } = useChatSessions(repoId || null);

  const handleNewChat = async () => {
    if (!repoId) return;
    const session = await createSession("New Chat");
    setActiveChatSession(session);
  };

  const handleSelectRepo = (id: string) => {
    setRepoId(id);
    setActiveChatSession(null);
    const repo = repos.find((r) => r.id === id);
    if (repo) setActiveRepo(repo);
  };

  return (
    <div className="h-[calc(100vh-130px)] flex">
      {/* Sessions Sidebar */}
      <div className="w-72 border-r border-surface-200 bg-white flex flex-col">
        <div className="p-4 border-b border-surface-200 space-y-3">
          <Select
            options={[
              { value: "", label: "Select Repository" },
              ...repos.filter((r) => r.status === "indexed").map((r) => ({
                value: r.id,
                label: `${r.owner}/${r.name}`,
              })),
            ]}
            value={repoId}
            onChange={(e) => handleSelectRepo(e.target.value)}
          />
          <Button onClick={handleNewChat} disabled={!repoId} className="w-full" size="sm">
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-center text-xs text-surface-700/50 py-8">
              {repoId ? "No chat sessions yet" : "Select a repository"}
            </p>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setActiveChatSession(session)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                    activeChatSession?.id === session.id
                      ? "bg-brand-50 text-brand-700"
                      : "text-surface-700 hover:bg-surface-50"
                  }`}
                >
                  <p className="text-sm font-medium truncate">{session.title}</p>
                  <p className="text-[10px] text-surface-700/50">{timeAgo(session.updated_at)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1">
        {activeChatSession ? (
          <ChatPanel
            sessionId={activeChatSession.id}
            repoName={activeRepo ? `${activeRepo.owner}/${activeRepo.name}` : undefined}
          />
        ) : (
          <EmptyState
            title="Start a conversation"
            description="Select a repository and create a new chat to ask questions about the codebase."
            icon={
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
          />
        )}
      </div>
    </div>
  );
}
