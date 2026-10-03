"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ModelPickerProps {
  models: any[];
  providers: any[];
  selectedModel: string | null;
  setModel: (id: string | null) => void;
  loading: boolean;
}

export function ModelPicker({ models, providers, selectedModel, setModel, loading }: ModelPickerProps) {
  if (loading) return <div className="text-xs text-muted-foreground animate-pulse">Loading models...</div>;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 block">
          Auto Selection
        </label>
        <button
          onClick={() => setModel(null)}
          className={cn(
            "w-full text-left p-2.5 rounded-lg text-sm transition-all border flex items-center justify-between group",
            selectedModel === null
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-card text-foreground border-border hover:border-zinc-400 dark:hover:border-zinc-600"
          )}
        >
          <span>Auto (Local → Cloud)</span>
          {selectedModel === null && (
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {providers.filter(p => p.available).map(provider => (
        <div key={provider.id} className="space-y-2">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 block">
            {provider.label}
          </label>
          <div className="space-y-1">
            {models.filter(m => m.provider === provider.id).map(model => (
              <button
                key={model.id}
                onClick={() => setModel(model.id)}
                className={cn(
                  "w-full text-left p-2.5 rounded-lg text-sm transition-all border flex items-center justify-between group",
                  selectedModel === model.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-foreground border-border hover:border-zinc-400 dark:hover:border-zinc-600"
                )}
              >
                <span className="truncate">{model.label}</span>
                {selectedModel === model.id && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
