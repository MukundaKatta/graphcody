"use client";

import useSWR from "swr";
import { repoApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Repository } from "@/types";

export function useRepos() {
  const { setRepositories } = useAppStore();

  const { data, error, isLoading, mutate } = useSWR("repos", async () => {
    const res = await repoApi.list();
    setRepositories(res.repositories);
    return res.repositories;
  });

  const connectRepo = async (githubUrl: string): Promise<Repository> => {
    const repo = await repoApi.connect(githubUrl);
    mutate();
    return repo;
  };

  const indexRepo = async (id: string) => {
    await repoApi.index(id);
    mutate();
  };

  const deleteRepo = async (id: string) => {
    await repoApi.delete(id);
    mutate();
  };

  return {
    repos: data || [],
    error,
    isLoading,
    connectRepo,
    indexRepo,
    deleteRepo,
    refresh: mutate,
  };
}

export function useRepo(id: string | null) {
  const { data, error, isLoading } = useSWR(
    id ? `repo-${id}` : null,
    () => repoApi.get(id!)
  );

  return { repo: data, error, isLoading };
}

export function useRepoStatus(id: string | null) {
  const { updateRepo } = useAppStore();

  const { data } = useSWR(
    id ? `repo-status-${id}` : null,
    () => repoApi.status(id!),
    { refreshInterval: 3000 }
  );

  if (data && id) {
    updateRepo(id, { status: data.status as Repository["status"] });
  }

  return data;
}
