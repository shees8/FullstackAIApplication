"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { VoiceLoading, VoiceTimer } from "@/components/voice/voice-chrome";
import { useVoiceConfig } from "@/hooks/use-voice-config";
import type { VoiceTranscript } from "@/lib/voice";
import "./nova.css";

// LiveKit is only downloaded when voice mode is actually used
const VoiceSession = dynamic(() => import("@/components/voice/voice-session"), {
  ssr: false,
  loading: () => <VoiceLoading />,
});

const API = "http://127.0.0.1:8000";

type Msg = { role: "user" | "assistant"; content: string; id?: string; voice?: boolean };
type Chat = { id: string; title: string; messages: Msg[]; updated: number };
type Model = { id: string; label: string; provider: string; local: boolean };
type Profile = { name: string; avatar: string };

const uid = () => Math.random().toString(36).slice(2, 10);
const newChat = (): Chat => ({ id: uid(), title: "New chat", messages: [], updated: Date.now() });
const DEFAULT_PROFILE: Profile = { name: "SHEES", avatar: "" };
const SUGGESTIONS = ["Explain how APIs work", "Write a Python function to sort a list", "Give me 5 project ideas", "Summarize the plot of Inception"];

// Crop to a square and shrink to 128px so it fits in localStorage
function fileToAvatar(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = 128;
      const c = document.createElement("canvas");
      c.width = c.height = s;
      const m = Math.min(img.width, img.height);
      c.getContext("2d")!.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.src = url;
  });
}

function Avatar({ p, size = 32 }: { p: Profile; size?: number }) {
  if (p.avatar)
    return <img className="nv-av" src={p.avatar} alt="" style={{ width: size, height: size }} />;
  return (
    <span className="nv-av" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {(p.name[0] || "?").toUpperCase()}
    </span>
  );
}

export default function Page() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState("auto");
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState("");
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [draft, setDraft] = useState<Profile>(DEFAULT_PROFILE);

  // Voice mode
  const { config: voiceConfig, prefs: voicePrefs, setPrefs: setVoicePrefs } = useVoiceConfig();
  const [voice, setVoice] = useState<{
    key: number;
    startedAt: number;
    history: Msg[];
    chatId: string;
  } | null>(null);
  const voiceChatRef = useRef("");
  const voiceBuf = useRef<Map<string, VoiceTranscript>>(new Map());

  const abortRef = useRef<AbortController | null>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load saved state
  useEffect(() => {
    try {
      const saved: Chat[] = JSON.parse(localStorage.getItem("nova_chats") || "[]");
      const list = saved.length ? saved : [newChat()];
      setChats(list);
      setActiveId(localStorage.getItem("nova_active") || list[0].id);
      setTheme((localStorage.getItem("nova_theme") as "dark" | "light") || "dark");
      setModel(localStorage.getItem("nova_model") || "auto");
      const p = localStorage.getItem("nova_profile");
      if (p) setProfile(JSON.parse(p));
    } catch {
      const c = newChat();
      setChats([c]);
      setActiveId(c.id);
    }
    setReady(true);
    fetch(`${API}/api/models`)
      .then((r) => r.json())
      .then((d) => setModels(d.models || []))
      .catch(() => setNotice(`Can't reach backend at ${API}`));
  }, []);

  // Persist
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("nova_chats", JSON.stringify(chats));
    localStorage.setItem("nova_active", activeId);
    localStorage.setItem("nova_theme", theme);
    localStorage.setItem("nova_model", model);
    localStorage.setItem("nova_profile", JSON.stringify(profile));
  }, [chats, activeId, theme, model, profile, ready]);

  const active = chats.find((c) => c.id === activeId) || chats[0];

  // Scroll only the message list, not the whole page
  useEffect(() => {
    const el = msgsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages]);

  // Switching chats ends voice mode
  useEffect(() => {
    if (voice && voice.chatId !== activeId) setVoice(null);
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (id: string, fn: (c: Chat) => Chat) =>
    setChats((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));

  function addChat() {
    const c = newChat();
    setChats((cs) => [c, ...cs]);
    setActiveId(c.id);
    setNotice("");
  }

  function removeChat(id: string) {
    const rest = chats.filter((c) => c.id !== id);
    const list = rest.length ? rest : [newChat()];
    setChats(list);
    if (id === activeId) setActiveId(list[0].id);
  }

  function openEdit() {
    setDraft(profile);
    setMenuOpen(false);
    setShowEdit(true);
  }

  // ---------- voice ----------
  function startVoice() {
    if (!active || voice) return;
    abortRef.current?.abort();
    voiceBuf.current = new Map();
    voiceChatRef.current = active.id;
    setNotice("");
    setVoice({
      key: 0,
      startedAt: Date.now(),
      history: active.messages.filter((m) => m.content),
      chatId: active.id,
    });
  }

  // Called by VoiceSession with finished transcripts, in spoken order.
  // The same id can arrive again with longer text, so we upsert by id.
  function saveTranscripts(ts: VoiceTranscript[]) {
    for (const t of ts) voiceBuf.current.set(t.id, t);
    const all = [...voiceBuf.current.values()];
    // Don't create clutter from an unanswered greeting: wait for the first user turn
    if (!all.some((t) => t.role === "user" && t.content.trim())) return;
    const chatId = voiceChatRef.current;
    if (!chatId) return;
    patch(chatId, (c) => {
      const msgs = [...c.messages];
      for (const t of all) {
        if (!t.content.trim()) continue;
        const m: Msg = { id: t.id, role: t.role, content: t.content, voice: true };
        const i = msgs.findIndex((x) => x.id === t.id);
        if (i >= 0) msgs[i] = m;
        else msgs.push(m);
      }
      const firstUser = all.find((t) => t.role === "user" && t.content.trim());
      return {
        ...c,
        messages: msgs,
        title: c.title === "New chat" && firstUser ? firstUser.content.slice(0, 34) : c.title,
        updated: Date.now(),
      };
    });
  }

  const voiceSelection =
    model === "auto"
      ? null
      : { provider: models.find((m) => m.id === model)?.provider ?? "ollama", model };

  // ---------- typed chat ----------
  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming || voice || !active) return;
    const id = active.id;
    const history: Msg[] = [...active.messages.filter((m) => m.content), { role: "user", content }];
    setInput("");
    setNotice("");
    patch(id, (c) => ({
      ...c,
      title: c.messages.length === 0 ? content.slice(0, 34) : c.title,
      messages: [...history, { role: "assistant", content: "" }],
      updated: Date.now(),
    }));

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStreaming(true);
    try {
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error(`Server error ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          if (!p.startsWith("data:")) continue;
          let ev: any;
          try {
            ev = JSON.parse(p.slice(5).trim());
          } catch {
            continue;
          }
          if (ev.type === "text") {
            acc += ev.content;
            const text = acc;
            patch(id, (c) => {
              const m = [...c.messages];
              m[m.length - 1] = { role: "assistant", content: text };
              return { ...c, messages: m };
            });
          } else if (ev.type === "error") setNotice(ev.content);
          else if (ev.type === "meta" && ev.fallback) setNotice(ev.notice);
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError")
        setNotice(e.message === "Failed to fetch" ? `Can't reach backend at ${API}` : e.message);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  const shown = chats
    .filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.updated - a.updated);

  if (!ready || !active) return null;

  return (
    <div className="nv" data-theme={theme}>
      <aside className={`nv-side ${open ? "" : "closed"}`}>
        <div className="nv-brand">
          <span className="nv-logo">N</span>
          <b>NOVA AI</b>
        </div>
        <button className="nv-new" onClick={addChat}>＋ New chat</button>
        <input className="nv-search" placeholder="Search chats…" value={search} onChange={(e) => setSearch(e.target.value)} />

        <div className="nv-list">
          {shown.map((c) => (
            <div key={c.id} className={`nv-item ${c.id === activeId ? "on" : ""}`} onClick={() => setActiveId(c.id)}>
              {editing === c.id ? (
                <input
                  autoFocus
                  defaultValue={c.title}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    patch(c.id, (x) => ({ ...x, title: e.target.value.trim() || x.title }));
                    setEditing("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                />
              ) : (
                <span className="t">
                  {c.messages.some((m) => m.voice) && "🎙 "}
                  {c.title}
                </span>
              )}
              <span className="acts">
                <button title="Rename" onClick={(e) => { e.stopPropagation(); setEditing(c.id); }}>✎</button>
                <button title="Delete" onClick={(e) => { e.stopPropagation(); removeChat(c.id); }}>🗑</button>
              </span>
            </div>
          ))}
          {!shown.length && <p className="nv-muted">No chats found</p>}
        </div>

        <div className="nv-models">
          <small>MODEL</small>
          <button className={model === "auto" ? "on" : ""} onClick={() => setModel("auto")}>
            Auto (Local → Cloud)
          </button>
          {models.map((m) => (
            <button key={m.id} className={model === m.id ? "on" : ""} onClick={() => setModel(m.id)}>
              {m.label} {m.local && <em>local</em>}
            </button>
          ))}
        </div>

        <div className="nv-user" onClick={() => setMenuOpen(!menuOpen)}>
          <Avatar p={profile} size={36} />
          <span className="who">
            <b>{profile.name}</b>
            <small>Local account</small>
          </span>
          <span className="chev">⋯</span>
        </div>

        {menuOpen && (
          <>
            <div className="nv-scrim" onClick={() => setMenuOpen(false)} />
            <div className="nv-menu">
              <button onClick={openEdit}>👤 Edit profile</button>
              <button onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); setMenuOpen(false); }}>
                {theme === "dark" ? "☀ Light mode" : "☾ Dark mode"}
              </button>
              <button onClick={() => { patch(active.id, (c) => ({ ...c, messages: [] })); setMenuOpen(false); }}>
                🧹 Clear this chat
              </button>
            </div>
          </>
        )}
      </aside>

      <main className="nv-main">
        <header>
          <button onClick={() => setOpen(!open)} title="Toggle sidebar">☰</button>
          <span className="nv-title">{active.title}</span>
          {voice && <VoiceTimer startedAt={voice.startedAt} />}
          <span className="nv-pill">{model === "auto" ? "Auto" : model}</span>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Theme">
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </header>

        {notice && (
          <div className="nv-notice" onClick={() => setNotice("")}>⚠ {notice}</div>
        )}

        {voice ? (
          <div className="nv-voice">
            <VoiceSession
              key={voice.key}
              selection={voiceSelection}
              participantName={profile.name}
              history={voice.history}
              voices={voiceConfig?.voices ?? []}
              voice={voicePrefs.voice}
              captions={voicePrefs.captions}
              onPrefsChange={setVoicePrefs}
              onTranscripts={saveTranscripts}
              onEnd={() => setVoice(null)}
              onRetry={() => setVoice((v) => (v ? { ...v, key: v.key + 1 } : v))}
            />
          </div>
        ) : (
          <div className="nv-msgs" ref={msgsRef}>
            {active.messages.length === 0 ? (
              <div className="nv-empty">
                <h1>Hello, {profile.name}</h1>
                <p>What would you like to explore today?</p>
                <div className="nv-chips">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)}>{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              active.messages.map((m, i) => (
                <div key={m.id ?? i} className={`nv-msg ${m.role}`}>
                  {m.role === "user" ? (
                    <Avatar p={profile} size={34} />
                  ) : (
                    <span className="nv-logo sm">N</span>
                  )}
                  <div className="col">
                    <div className="bubble">
                      {m.content || <span className="dots"><i /><i /><i /></span>}
                    </div>
                    {m.voice && <span className="spoken">🎙 Spoken</span>}
                    {m.role === "assistant" && m.content && (
                      <button className="copy" onClick={() => navigator.clipboard.writeText(m.content)}>Copy</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!voice && (
          <div className="nv-input">
            <textarea
              rows={1}
              value={input}
              placeholder="Ask NOVA AI anything… (Shift + Enter for new line)"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
           {voiceConfig?.enabled && !streaming && (
  <button className="go mic" onClick={startVoice} title="Start voice mode">🎙</button>
)}
{streaming ? (
  <button className="go stop" onClick={() => abortRef.current?.abort()}>■</button>
) : (
  <button className="go" onClick={() => send()} disabled={!input.trim()}>➤</button>
)}
          </div>
        )}
      </main>

      {showEdit && (
        <div className="nv-modal-bg" onClick={() => setShowEdit(false)}>
          <div className="nv-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit profile</h3>
            <div className="pic" onClick={() => fileRef.current?.click()} title="Change photo">
              <Avatar p={draft} size={96} />
              <span className="cam">📷</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setDraft({ ...draft, avatar: await fileToAvatar(f) });
              }}
            />
            {draft.avatar && (
              <button className="link" onClick={() => setDraft({ ...draft, avatar: "" })}>Remove photo</button>
            )}
            <input
              type="text"
              value={draft.name}
              maxLength={24}
              placeholder="Your name"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <div className="row">
              <button onClick={() => setShowEdit(false)}>Cancel</button>
              <button
                className="pri"
                onClick={() => {
                  setProfile({ name: draft.name.trim() || "User", avatar: draft.avatar });
                  setShowEdit(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
