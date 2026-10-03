"use client";

import React from "react";
import { Message } from "@/hooks/use-chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Copy, RotateCcw } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
}

export function MessageList({ messages, isStreaming, error }: MessageListProps) {
  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-8 max-w-3xl mx-auto scroll-smooth">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20 animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {messages.length === 0 && !error && (
        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 py-20">
          <div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center text-muted-foreground">
            <div className="w-8 h-8 bg-foreground/10 rounded-full animate-ping" />
          </div>
          <div>
            <p className="text-foreground font-semibold text-lg">How can I help you today?</p>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Select a model from the sidebar and start chatting.
            </p>
          </div>
        </div>
      )}

      {messages.map((msg, idx) => (
        <div key={idx} className={cn(
          "flex w-full animate-in fade-in slide-in-from-bottom-2",
          msg.role === "user" ? "justify-end" : "justify-start"
        )}>
          <div className={cn(
            "group relative max-w-[85%] p-4 rounded-2xl text-sm shadow-sm transition-all",
            msg.role === "user"
              ? "bg-primary text-primary-foreground rounded-tr-none"
              : "bg-muted text-foreground border border-border rounded-tl-none"
          )}>
            <div className="prose prose-sm max-w-none prose-zinc dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.content}
              </ReactMarkdown>
            </div>

            {/* Action Buttons */}
            <div className={cn(
              "absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
              msg.role === "user" ? "text-primary-foreground/50" : "text-muted-foreground"
            )}>
              <button
                onClick={() => copyToClipboard(msg.content)}
                className="p-1 hover:bg-foreground/10 rounded-md transition-colors"
                title="Copy"
              >
                <Copy size={14} />
              </button>
              {msg.role === "assistant" && (
                <button
                  className="p-1 hover:bg-foreground/10 rounded-md transition-colors"
                  title="Retry"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {isStreaming && (
        <div className="flex justify-start">
          <div className="bg-card border border-border p-4 rounded-2xl rounded-tl-none shadow-sm">
            <div className="flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
