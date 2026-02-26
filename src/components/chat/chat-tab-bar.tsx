"use client";

import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
}

interface ChatTabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onNewTab: () => void;
  onCloseTab: (id: string) => void;
}

export function ChatTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onNewTab,
  onCloseTab,
}: ChatTabBarProps) {
  return (
    <div className="flex items-center gap-1 border-b bg-muted/30 px-2 py-1.5 overflow-x-auto">
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          className={cn(
            "group flex items-center gap-1 rounded-md px-3 py-1.5 text-sm cursor-pointer transition-colors",
            tab.id === activeTabId
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
          )}
          onClick={() => onSelectTab(tab.id)}
        >
          <span className="truncate max-w-[120px]">{tab.label}</span>
          {tabs.length > 1 && (
            <button
              className="ml-1 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-muted p-0.5 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onNewTab}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
