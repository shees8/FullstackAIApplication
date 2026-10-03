"use client";

import { useState, useEffect } from "react";
import { fetchModels } from "@/lib/api";

export function useModels() {
  const [models, setModels] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchModels();
        setModels(data.models);
        setProviders(data.providers);

        const saved = localStorage.getItem("sai-selected-model");
        if (saved && data.models.some((m: any) => m.id === saved)) {
          setSelectedModel(saved);
        } else if (data.models.length > 0) {
          setSelectedModel(data.models[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const setModel = (id: string | null) => {
    setSelectedModel(id);
    if (id) localStorage.setItem("sai-selected-model", id);
    else localStorage.removeItem("sai-selected-model");
  };

  return { models, providers, selectedModel, setModel, loading };
}
