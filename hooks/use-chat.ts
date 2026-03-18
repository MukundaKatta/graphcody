"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { chatApi } from "@/lib/api";
import type { ChatMessage, ChatSession } from "@/types";

export function useChatSessions(repoId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    repoId ? `chat-sessions-${repoId}` : null,
    () => chatApi.sessions(repoId!)
  );

  const createSession = async (title: string): Promise<ChatSession> => {
    const session = await chatApi.createSession(repoId!, title);
    mutate();
    return session;
  };

  return {
    sessions: data?.sessions || [],
    error,
    isLoading,
    createSession,
    refresh: mutate,
  };
}

export function useChat(sessionId: string | null) {
  const [isStreaming, setIsStreaming] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    sessionId ? `chat-${sessionId}` : null,
    () => chatApi.getSession(sessionId!)
  );

  const sendMessage = useCallback(
    async (content: string): Promise<ChatMessage | null> => {
      if (!sessionId) return null;

      setIsStreaming(true);
      try {
        const response = await chatApi.sendMessage(sessionId, content);
        mutate();
        return response;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return null;
        throw err;
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId, mutate]
  );

  return {
    session: data?.session,
    messages: data?.messages || [],
    isLoading,
    isStreaming,
    error,
    sendMessage,
    refresh: mutate,
  };
}
