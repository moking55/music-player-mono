"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useImmer } from "use-immer";
import useSocket from "@/hooks/use-socket";

import type { PollChoice, PollDuration, PollState } from "shared-types";

type UsePollOptions = {
  mode: "send" | "receive";
};

type PollHookState = {
  poll: PollState | null;
  hasVoted: boolean;
  selectedChoice: PollChoice | null;
  error: string | null;
};

function getBrowserVoterId(): string | null {
  if (typeof window === "undefined") return null;
  const storageKey = "watch-poll-voter-id";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const voterId = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  window.localStorage.setItem(storageKey, voterId);
  return voterId;
}

export default function usePoll(
  roomId: string | null,
  options: UsePollOptions,
) {
  const { on, off, emit } = useSocket();
  const voterIdRef = useRef<string | null>(null);
  const [state, setState] = useImmer<PollHookState>({
    poll: null,
    hasVoted: false,
    selectedChoice: null,
    error: null,
  });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    voterIdRef.current = getBrowserVoterId();
  }, []);

  useEffect(() => {
    setState((draft) => {
      draft.poll = null;
      draft.hasVoted = false;
      draft.selectedChoice = null;
      draft.error = null;
    });
  }, [roomId, setState]);

  useEffect(() => {
    const handlePollUpdated = (...args: unknown[]) => {
      const poll = (args[0] as PollState | null | undefined) ?? null;
      setState((draft) => {
        const pollChanged = draft.poll?.pollId !== poll?.pollId;
        draft.poll = poll;
        draft.error = null;
        if (pollChanged) {
          draft.hasVoted = false;
          draft.selectedChoice = null;
        }
      });
    };

    const handleVoteStatus = (...args: unknown[]) => {
      const data = args[0] as { pollId?: string; hasVoted?: boolean };
      setState((draft) => {
        if (draft.poll?.pollId !== data.pollId) return;
        draft.hasVoted = Boolean(data.hasVoted);
      });
    };

    const handlePollError = (...args: unknown[]) => {
      const data = args[0] as { message?: string };
      setState((draft) => {
        draft.error = data.message ?? "Poll request failed";
      });
    };

    on("poll-updated", handlePollUpdated);
    on("poll-vote-status", handleVoteStatus);
    on("poll-error", handlePollError);

    return () => {
      off("poll-updated", handlePollUpdated);
      off("poll-vote-status", handleVoteStatus);
      off("poll-error", handlePollError);
    };
  }, [emit, off, on, options.mode, roomId, setState]);

  useEffect(() => {
    if (options.mode !== "send" || !roomId || !state.poll) return;
    const voterId = voterIdRef.current ?? getBrowserVoterId();
    voterIdRef.current = voterId;
    if (!voterId) return;
    emit("get-poll-status", {
      roomId,
      pollId: state.poll.pollId,
      voterId,
    });
  }, [emit, options.mode, roomId, state.poll?.pollId]);

  useEffect(() => {
    if (!state.poll) return;

    const tick = window.setInterval(() => setNow(Date.now()), 250);
    const pollId = state.poll.pollId;
    const endDelay = Math.max(0, state.poll.expiresAt - Date.now());
    const clearDelay = Math.max(0, state.poll.expiresAt + 5_000 - Date.now());
    const endTimer = window.setTimeout(() => {
      setState((draft) => {
        if (draft.poll?.pollId === pollId) {
          draft.poll.status = "ended";
        }
      });
    }, endDelay);
    const clearTimer = window.setTimeout(() => {
      setState((draft) => {
        if (draft.poll?.pollId === pollId) {
          draft.poll = null;
          draft.hasVoted = false;
          draft.selectedChoice = null;
        }
      });
    }, clearDelay);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(endTimer);
      window.clearTimeout(clearTimer);
    };
  }, [setState, state.poll?.expiresAt, state.poll?.pollId]);

  const createPoll = useCallback(
    (question: string, duration: PollDuration) => {
      if (!roomId) return;
      emit("create-poll", { roomId, question, duration });
    },
    [emit, roomId],
  );

  const vote = useCallback(
    (choice: PollChoice) => {
      if (!roomId || !state.poll || state.poll.status !== "active" || state.hasVoted) {
        return;
      }
      const voterId = voterIdRef.current ?? getBrowserVoterId();
      voterIdRef.current = voterId;
      if (!voterId) return;
      setState((draft) => {
        if (draft.poll?.pollId === state.poll?.pollId) {
          draft.hasVoted = true;
          draft.selectedChoice = choice;
        }
      });
      emit("vote-poll", {
        roomId,
        pollId: state.poll.pollId,
        voterId,
        choice,
      });
    },
    [emit, roomId, setState, state.hasVoted, state.poll],
  );

  const timeRemainingMs = useMemo(
    () => (state.poll ? Math.max(0, state.poll.expiresAt - now) : 0),
    [now, state.poll],
  );

  return {
    poll: state.poll,
    hasVoted: state.hasVoted,
    selectedChoice: state.selectedChoice,
    error: state.error,
    timeRemainingMs,
    createPoll: options.mode === "send" ? createPoll : undefined,
    vote: options.mode === "send" ? vote : undefined,
  };
}
