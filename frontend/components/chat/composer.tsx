"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComposerProps {
  onSend: (text: string) => Promise<void>;
  isStreaming: boolean;
}

export function Composer({ onSend, isStreaming }: ComposerProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleSend = async () => {
    if (!text.trim() || isStreaming) return;
    const content = text;
    setText("");
    await onSend(content);
  };

  return (
    <div className="relative max-w-3xl mx-auto">
      <div className={cn(
        "flex items-end gap-2 p-2 bg-background text-foreground border border-input rounded-2xl shadow-sm focus-within:ring-1 focus-within:ring-ring transition-all",
        "dark:bg-zinc-900 dark:border-zinc-800"
      )}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask NOVA AI or SHEES a question... (Shift + Enter for new line)"
          className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 px-3 text-sm max-h-48"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || isStreaming}
          className={cn(
            "p-2 rounded-xl transition-all shadow-sm",
            isStreaming
              ? "bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground hover:opacity-90"
          )}
        >
          {isStreaming ? <Square size={18} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
