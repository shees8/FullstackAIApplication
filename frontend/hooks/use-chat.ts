"use client";

import { useState, useCallback, useRef } from "react";
import { streamChat } from "@/lib/api";

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (model: string | null, text: string) => {
    const userMsg: Message = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setIsStreaming(true);
    setError(null);

    try {
      const gen = streamChat({
        model,
        messages: history,
        temperature: 0.7,
      });

      let assistantContent = "";

      for await (const event of gen) {
        if (event.type === "meta") {
          if (event.fallback) {
            console.info(`Fallback triggered: ${event.notice}`);
          }
        } else if (event.type === "text") {
          assistantContent += event.content;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant") {
              return [...prev.slice(0, -1), { role: "assistant", content: assistantContent }];
            }
            return [...prev, { role: "assistant", content: assistantContent }];
          });
        } else if (event.type === "error") {
          throw new Error(event.content);
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsStreaming(false);
    }
  }, [messages]);

  const clearChat = () => setMessages([]);

  return { messages, isStreaming, error, sendMessage, clearChat };
}
