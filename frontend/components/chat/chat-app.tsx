"use client";

import React from "react";
import { APP_CONFIG } from "@/lib/config";
import { useModels } from "@/hooks/use-models";
import { useChat } from "@/hooks/use-chat";
import { ModelPicker } from "./model-picker";
import { MessageList } from "./message-list";
import { Composer } from "./composer";
import { PanelLeft, Trash2, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ChatApp() {
  const { models, providers, selectedModel, setModel, loading: modelsLoading } = useModels();
  const { messages, isStreaming, error, sendMessage, clearChat } = useChat();
  const { theme, setTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex h-screen w-full bg-background text-foreground font-sans transition-colors duration-300">
      {/* Sidebar */}
      <aside className={cn(
        "transition-all duration-300 border-r border-border bg-card",
        isSidebarOpen ? "w-72" : "w-0 overflow-hidden"
      )}>
        <div className="p-4 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold shadow-sm">
              S
            </div>
            <h1 className="font-bold text-lg tracking-tight">{APP_CONFIG.appName}</h1>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            <ModelPicker
              models={models}
              providers={providers}
              selectedModel={selectedModel}
              setModel={setModel}
              loading={modelsLoading}
            />
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between px-2 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                S
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {APP_CONFIG.placeholderUser}
              </span>
            </div>
            <button
              onClick={clearChat}
              className="flex items-center gap-2 p-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"
            >
              <Trash2 size={14} />
              Clear
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 backdrop-blur-sm bg-opacity-80 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-accent rounded-md text-muted-foreground transition-colors"
            >
              <PanelLeft size={20} />
            </button>
            <div className="text-sm font-medium text-muted-foreground">
              User: <span className="text-foreground">{APP_CONFIG.placeholderUser}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 hover:bg-accent rounded-md text-muted-foreground transition-colors"
              title="Toggle Theme"
            >
              {mounted ? (theme === "dark" ? <Sun size={20} /> : <Moon size={20} />) : <div className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-hidden relative">
          <MessageList messages={messages} isStreaming={isStreaming} error={error} />
        </div>

        {/* Composer */}
        <div className="p-4 bg-background">
          <div className="max-w-3xl mx-auto">
            <Composer
              onSend={async (text: string) => {
                await sendMessage(selectedModel, text);
              }}
              isStreaming={isStreaming}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
