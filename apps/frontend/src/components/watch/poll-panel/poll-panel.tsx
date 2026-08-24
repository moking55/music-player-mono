"use client";

import { useMemo, useState } from "react";
import type { PollChoice, PollDuration, PollState } from "shared-types";

type PollPanelProps = {
  poll: PollState | null;
  hasVoted: boolean;
  selectedChoice: PollChoice | null;
  error: string | null;
  timeRemainingMs: number;
  onCreate: (question: string, duration: PollDuration) => void;
  onVote: (choice: PollChoice) => void;
};

function formatSeconds(timeRemainingMs: number) {
  return `${Math.ceil(Math.max(0, timeRemainingMs) / 1000)}s`;
}

export default function PollPanel({
  poll,
  hasVoted,
  selectedChoice,
  error,
  timeRemainingMs,
  onCreate,
  onVote,
}: PollPanelProps) {
  const [question, setQuestion] = useState("");
  const [duration, setDuration] = useState<PollDuration>(60);
  const total = poll ? poll.yesCount + poll.noCount : 0;
  const yesPercent = useMemo(() => (total ? Math.round((poll!.yesCount / total) * 100) : 0), [poll, total]);
  const noPercent = total ? 100 - yesPercent : 0;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < 5 || trimmed.length > 200) return;
    onCreate(trimmed, duration);
    setQuestion("");
  };

  if (!poll) {
    return (
      <div className="p-4 text-white">
        <h2 className="text-lg font-semibold mb-1">Poll</h2>
        <p className="text-sm text-gray-400 mb-4">Ask everyone a yes/no question.</p>
        <form onSubmit={submit} className="space-y-3">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            minLength={5}
            maxLength={200}
            rows={3}
            placeholder="Type your question..."
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white outline-none focus:border-blue-500"
          />
          <div className="flex items-center gap-2">
            <label htmlFor="poll-duration" className="text-sm text-gray-400">Duration</label>
            <select
              id="poll-duration"
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value) as PollDuration)}
              className="rounded border border-gray-700 bg-gray-800 px-2 py-2 text-white"
            >
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds</option>
              <option value={120}>120 seconds</option>
            </select>
            <button
              type="submit"
              disabled={question.trim().length < 5}
              className="ml-auto rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send poll
            </button>
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="p-4 text-white">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold">Poll</h2>
        <span className={poll.status === "active" ? "text-sm text-blue-300" : "text-sm text-gray-400"}>
          {poll.status === "active" ? formatSeconds(timeRemainingMs) : "Final result"}
        </span>
      </div>
      <p className="mb-4 text-base">{poll.question}</p>
      {poll.status === "active" && !hasVoted && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button type="button" onClick={() => onVote("yes")} className="rounded-lg bg-emerald-600 py-3 text-2xl hover:bg-emerald-500">✓</button>
          <button type="button" onClick={() => onVote("no")} className="rounded-lg bg-rose-600 py-3 text-2xl hover:bg-rose-500">✕</button>
        </div>
      )}
      {poll.status === "active" && hasVoted && (
        <p className="mb-4 text-center text-sm text-gray-400">
          Vote recorded {selectedChoice ? `(${selectedChoice === "yes" ? "✓" : "✕"})` : ""}
        </p>
      )}
      <div className="space-y-3">
        <ResultBar label="Yes" count={poll.yesCount} percent={yesPercent} color="bg-emerald-500" />
        <ResultBar label="No" count={poll.noCount} percent={noPercent} color="bg-rose-500" />
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function ResultBar({ label, count, percent, color }: { label: string; count: number; percent: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-gray-300"><span>{label}</span><span>{count} · {percent}%</span></div>
      <div className="h-2 overflow-hidden rounded bg-gray-700"><div className={`h-full ${color} transition-all`} style={{ width: `${percent}%` }} /></div>
    </div>
  );
}
