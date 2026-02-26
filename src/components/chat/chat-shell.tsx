"use client";

import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import { useSocket } from "@/hooks/use-socket";
import { ChatTabBar } from "./chat-tab-bar";
import { ChatPanel } from "./chat-panel";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Wifi, WifiOff } from "lucide-react";

interface Tab {
  id: string;
  label: string;
}

function createTab(index: number): Tab {
  return { id: nanoid(), label: `Chat ${index}` };
}

export function ChatShell() {
  const { socket, connected } = useSocket();
  const { theme, setTheme } = useTheme();
  const [tabs, setTabs] = useState<Tab[]>(() => [createTab(1)]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [tabCounter, setTabCounter] = useState(1);

  const handleNewTab = useCallback(() => {
    const newCount = tabCounter + 1;
    const tab = createTab(newCount);
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    setTabCounter(newCount);
  }, [tabCounter]);

  const handleCloseTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (next.length === 0) return prev;
        if (activeTabId === id) {
          setActiveTabId(next[next.length - 1].id);
        }
        return next;
      });
    },
    [activeTabId]
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">AI Phone Call</h1>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {connected ? (
              <>
                <Wifi className="h-3 w-3 text-green-500" /> Connected
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-destructive" /> Disconnected
              </>
            )}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>

      {/* Tab bar */}
      <ChatTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onNewTab={handleNewTab}
        onCloseTab={handleCloseTab}
      />

      {/* Chat panels — all stay mounted */}
      <div className="flex-1 relative overflow-hidden">
        {tabs.map((tab) => (
          <div key={tab.id} className={`absolute inset-0 ${tab.id === activeTabId ? "" : "invisible"}`}>
            <ChatPanel
              socket={socket}
              chatId={tab.id}
              isActive={tab.id === activeTabId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
