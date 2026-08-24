"use client";

import { useCallback } from "react";
import { useImmer } from "use-immer";
import useApi from "@/hooks/use-api";

import type { VideoItem } from "shared-types";

type YouTubeSearchState = {
  results: VideoItem[];
  loading: boolean;
  error: string | null;
};

export default function useYouTubeSearch() {
  const api = useApi();

  const [state, setState] = useImmer<YouTubeSearchState>({
    results: [],
    loading: false,
    error: null,
  });

  const search = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      setState((draft) => {
        draft.loading = true;
        draft.error = null;
        draft.results = [];
      });

      try {
        const response = await api
          .get(`watch/youtube-search`, {
            searchParams: { q: query.trim() },
          })
          .json<{ data?: VideoItem[]; error?: string }>();

        if (response.error) {
          setState((draft) => {
            draft.error = response.error ?? "Search failed";
            draft.loading = false;
          });
          return;
        }

        setState((draft) => {
          draft.results = response.data ?? [];
          draft.loading = false;
        });
      } catch {
        setState((draft) => {
          draft.error = "Failed to search YouTube";
          draft.loading = false;
        });
      }
    },
    [api, setState],
  );

  const clearResults = useCallback(
    () => {
      setState((draft) => {
        draft.results = [];
      });
    },
    [setState],
  );

  return {
    results: state.results,
    loading: state.loading,
    error: state.error,
    search,
    clearResults,
  };
}
