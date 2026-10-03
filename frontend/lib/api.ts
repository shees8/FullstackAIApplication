export class ApiError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

const API_BASE = "/api";

export async function fetchModels() {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) throw new ApiError("Failed to fetch models", res.status);
  return res.json();
}

export async function* streamChat(request: {
  model: string | null;
  messages: { role: string; content: string }[];
  temperature: number;
}) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ content: "Unknown error" }));
    throw new ApiError(err.content || "Chat stream failed", res.status);
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) throw new ApiError("Response body is empty");

  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      try {
        yield JSON.parse(data);
      } catch (e) {
        console.error("SSE parse error", e);
      }
    }
  }
}
