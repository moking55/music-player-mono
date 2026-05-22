"use client";

import { useCallback } from "react";
import { useImmer } from "use-immer";

type OEmbedResult = {
  title: string;
  thumbnail_url: string;
  author_name: string;
};

type YouTubeOEmbedState = {
  loading: boolean;
  error: string | null;
};

export default function useYouTubeOEmbed() {
  const [state, setState] = useImmer<YouTubeOEmbedState>({
    loading: false,
    error: null,
  });

  const fetchInfo = useCallback(
    async (videoId: string): Promise<OEmbedResult | null> => {
      setState((draft) => {
        draft.loading = true;
        draft.error = null;
      });

      try {
        const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const response = await fetch(url);

        if (!response.ok) {
          setState((draft) => {
            draft.error = "Failed to fetch video info";
            draft.loading = false;
          });
          return null;
        }

        const data = (await response.json()) as OEmbedResult;

        setState((draft) => {
          draft.loading = false;
        });

        return data;
      } catch {
        setState((draft) => {
          draft.error = "Failed to fetch video info";
          draft.loading = false;
        });
        return null;
      }
    },
    [setState],
  );

  return {
    fetchInfo,
    loading: state.loading,
    error: state.error,
  };
}
