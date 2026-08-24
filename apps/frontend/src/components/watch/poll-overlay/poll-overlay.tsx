"use client";

import type { PollState } from "shared-types";

type PollOverlayProps = {
  poll: PollState | null;
  timeRemainingMs: number;
};

export default function PollOverlay({ poll, timeRemainingMs }: PollOverlayProps) {
  if (!poll) return null;

  const total = poll.yesCount + poll.noCount;
  const yesPercent = total ? Math.round((poll.yesCount / total) * 100) : 0;
  const noPercent = total ? 100 - yesPercent : 0;

  return (
    <div className="fixed left-1/2 top-1/2 z-40 w-[min(78vw,900px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/20 bg-gray-950/90 p-8 text-white shadow-2xl backdrop-blur-md">
      <div className="mb-5 flex items-center justify-between">
        <span className="rounded-full bg-blue-500/20 px-4 py-1 text-sm font-semibold uppercase tracking-widest text-blue-300">Poll</span>
        <span className="text-2xl font-semibold tabular-nums">
          {poll.status === "active" ? `${Math.ceil(Math.max(0, timeRemainingMs) / 1000)}s` : "Final result"}
        </span>
      </div>
      <h2 className="mb-8 text-center text-4xl font-bold leading-tight">{poll.question}</h2>
      <div className="space-y-5">
        <OverlayResult label="✓ YES" count={poll.yesCount} percent={yesPercent} color="bg-emerald-500" />
        <OverlayResult label="✕ NO" count={poll.noCount} percent={noPercent} color="bg-rose-500" />
      </div>
    </div>
  );
}

function OverlayResult({ label, count, percent, color }: { label: string; count: number; percent: number; color: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xl font-semibold"><span>{label}</span><span>{count} ({percent}%)</span></div>
      <div className="h-7 overflow-hidden rounded-full bg-white/15"><div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percent}%` }} /></div>
    </div>
  );
}
