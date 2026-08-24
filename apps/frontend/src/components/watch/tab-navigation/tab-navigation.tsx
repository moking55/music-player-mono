"use client";

import clsx from "clsx";
import { List, MessageSquare, Image, BarChart3 } from "lucide-react";

import type { TabNavigationProps } from "./types";

export default function TabNavigation({ activeTab, onTabChange, hasActivePoll }: TabNavigationProps) {
  const tabs = [
    { id: "queue" as const, label: "Queue", icon: List },
    { id: "danmu" as const, label: "Danmu", icon: MessageSquare },
    { id: "meme" as const, label: "Meme", icon: Image },
    { id: "poll" as const, label: "Poll", icon: BarChart3 },
  ];

  return (
    <nav className="flex border-b border-gray-700 bg-gray-800">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "text-white border-b-2 border-blue-500 bg-gray-700"
                : "text-gray-400 hover:text-white hover:bg-gray-700",
            )}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
            {tab.id === "poll" && hasActivePoll && <span className="h-2 w-2 rounded-full bg-emerald-400" aria-label="Active poll" />}
          </button>
        );
      })}
    </nav>
  );
}
