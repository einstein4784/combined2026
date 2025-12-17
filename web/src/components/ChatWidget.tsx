"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Thread = {
  _id: string;
  title?: string;
  isGroup?: boolean;
  participants?: string[];
  lastMessageAt?: string;
  lastMessageText?: string;
  lastMessageSenderId?: string;
};

type Message = {
  _id: string;
  threadId: string;
  senderId: string;
  type: "text" | "file";
  body?: string;
  file?: { url?: string; name?: string; size?: number; mime?: string; data?: string };
  createdAt: string;
};

type UserOption = { value: string; label: string };

type Props = {
  currentUserId: string;
  onOpenChange?: (open: boolean) => void;
  openSignal?: number;
  targetThreadId?: string | null;
};

export function ChatWidget({ currentUserId, onOpenChange, openSignal, targetThreadId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendText, setSendText] = useState("");
  const [sendFile, setSendFile] = useState<File | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [targetUser, setTargetUser] = useState("");
  const [presence, setPresence] = useState<Set<string>>(new Set());
  const [lastSeenMs, setLastSeenMs] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const activeMessages = useMemo(
    () => messages.filter((m) => m.threadId === activeThreadId),
    [messages, activeThreadId],
  );

const ensureUsers = async (ids: string[]) => {
  const missing = ids.filter((id) => id && !userMap[id]);
  if (!missing.length) return;
  try {
    const res = await fetch(`/api/users?ids=${missing.join(",")}`);
    if (!res.ok) return;
    const data = await res.json();
    const map: Record<string, string> = { ...userMap };
    (data.users || []).forEach((u: any) => {
      map[u.id] = u.fullName || u.username;
    });
    setUserMap(map);
  } catch {
    // ignore
  }
};

const loadThreads = async (opts?: { silent?: boolean }) => {
  const silent = opts?.silent;
  if (!silent) setLoadingThreads(true);
  try {
    const res = await fetch("/api/chat/threads");
    if (!res.ok) throw new Error("Failed to load threads");
    const data = await res.json();
    const list = data.threads || [];
    setThreads(list);
    const ids: string[] = [];
    list.forEach((t: any) =>
      (t.participants || []).forEach((p: any) => ids.push(p?.toString?.() || p)),
    );
    await ensureUsers(ids);
  } catch (e: any) {
    if (!silent) setError(e.message || "Failed to load threads");
  } finally {
    if (!silent) setLoadingThreads(false);
  }
};

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/users?scope=dropdown");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      const opts: UserOption[] = (data.users || []).map((u: any) => ({
        value: u.id,
        label: u.fullName || u.username,
      }));
      setUsers(opts);
      const map: Record<string, string> = {};
      opts.forEach((u: UserOption) => (map[u.value] = u.label));
      setUserMap(map);
    } catch {
      // ignore
    }
  };

  const loadPresence = async () => {
    try {
      const res = await fetch("/api/chat/presence");
      if (!res.ok) return;
      const data = await res.json();
      const setIds = new Set<string>((data.online || []).map((o: any) => o.userId));
      setPresence(setIds);
    } catch {
      // ignore
    }
  };

  const heartbeat = async () => {
    await fetch("/api/chat/presence", { method: "POST" }).catch(() => {});
  };

const loadMessages = async (threadId: string, opts?: { markSeen?: boolean }) => {
  const markSeen = opts?.markSeen ?? true;
  setLoadingMessages(true);
  try {
    const res = await fetch(`/api/chat/threads/${threadId}/messages?limit=50`);
    if (!res.ok) throw new Error("Failed to load messages");
    const data = await res.json();
    const msgs = (data.messages || []).map((m: any) => ({
      ...m,
      body: typeof m.body === "string" ? m.body : m.body?.toString?.() ?? "",
      type: m.type === "file" ? "file" : "text",
      threadId,
      createdAt: m.createdAt || new Date().toISOString(),
    }));
    setMessages((prev) => {
      const other = prev.filter((p) => p.threadId !== threadId);
      return [...other, ...msgs];
    });
    const senderIds = msgs.map((m: any) => m.senderId);
    await ensureUsers(senderIds);
    setActiveThreadId(threadId);
    if (markSeen) {
      const now = Date.now();
      setLastSeenMs(now);
      if (typeof window !== "undefined") {
        localStorage.setItem("chatLastSeen", new Date(now).toISOString());
      }
    }
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, 50);
  } catch (e: any) {
    setError(e.message || "Failed to load messages");
  } finally {
    setLoadingMessages(false);
  }
};

  const createThread = async () => {
    if (!targetUser) {
      setError("Select a user to start chat");
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/chat/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: [targetUser], isGroup: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create thread");
      await loadThreads();
      if (data.thread?._id) {
        await loadMessages(data.thread._id);
      }
    } catch (e: any) {
      setError(e.message || "Failed to create chat");
    }
  };

  const sendMessage = async () => {
    if (!activeThreadId) return;
    if (!sendText.trim() && !sendFile) return;

    setError(null);
    const payload: any = {};
    if (sendFile) {
      const dataUrl = await fileToDataUrl(sendFile);
      payload.type = "file";
      payload.file = {
        name: sendFile.name,
        size: sendFile.size,
        mime: sendFile.type,
        data: dataUrl,
      };
    } else {
      payload.type = "text";
      payload.text = sendText.trim();
    }

    try {
      const res = await fetch(`/api/chat/threads/${activeThreadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSendText("");
      setSendFile(null);
      await loadMessages(activeThreadId);
      await loadThreads();
    } catch (e: any) {
      setError(e.message || "Failed to send");
    }
  };

  const deleteThread = async (threadId: string) => {
    try {
      const res = await fetch(`/api/chat/threads/${threadId}`, { method: "DELETE" });
      if (!res.ok) return;
      setThreads((prev) => prev.filter((t) => t._id !== threadId));
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
        setMessages((prev) => prev.filter((m) => m.threadId !== threadId));
      }
    } catch {
      // ignore
    }
  };

  const onKeyDownSend = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const presenceDot = (id: string) => (
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        presence.has(id) ? "bg-green-500" : "bg-red-400"
      }`}
    />
  );

  const emojiList = ["😀", "😁", "😂", "😊", "😍", "😘", "😎", "🤩", "🤔", "🙌", "👍", "🙏", "🔥", "🎉", "✅"];
  const addEmoji = (emoji: string) => {
    setSendText((prev) => `${prev}${emoji}`);
    textareaRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("chatLastSeen");
      if (stored) {
        const ms = new Date(stored).getTime();
        if (!Number.isNaN(ms)) setLastSeenMs(ms);
      }
    }
    loadThreads();
    loadUsers();
    loadPresence();
    heartbeat();
    const presenceInterval = setInterval(loadPresence, 20_000);
    const hb = setInterval(heartbeat, 30_000);
    const threadsInterval = setInterval(() => loadThreads({ silent: true }), 5000);
    return () => {
      clearInterval(presenceInterval);
      clearInterval(hb);
      clearInterval(threadsInterval);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !activeThreadId) return;
    const poll = setInterval(() => loadMessages(activeThreadId, { markSeen: false }), 5000);
    return () => clearInterval(poll);
  }, [open, activeThreadId]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (openSignal) {
      setOpen(true);
    }
  }, [openSignal]);

  useEffect(() => {
    if (open && targetThreadId) {
      loadMessages(targetThreadId);
    }
  }, [open, targetThreadId]);

  return (
    <>
      <button
        className="fixed bottom-4 right-4 z-[9000] rounded-full bg-[var(--ic-navy)] px-4 py-3 text-white shadow-lg hover:bg-[var(--ic-teal)] print:hidden"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Close chat" : "Chat"}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-[9000] w-[360px] max-h-[80vh] overflow-hidden rounded-2xl border border-[var(--ic-gray-200)] bg-gradient-to-b from-[var(--ic-gray-50)] to-white shadow-2xl print:hidden">
          <div className="flex items-center justify-between border-b border-[var(--ic-gray-200)] bg-[var(--ic-navy)] px-4 py-3 text-white">
            <div>
              <p className="text-[11px] uppercase tracking-wide opacity-80">Chat</p>
              <h3 className="text-lg font-semibold">Direct messages</h3>
            </div>
            <span className="text-[11px] text-white/80">
              Online: {presence.size || 0}
            </span>
          </div>

          <div className="px-4 py-3 space-y-3">
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-xl border border-[var(--ic-gray-200)] bg-white px-3 py-2 text-sm shadow-sm focus:border-[var(--ic-teal)] focus:outline-none"
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
              >
                <option value="">Select user</option>
                {users.map((u) => (
                  <option key={u.value} value={u.value}>
                    {presence.has(u.value) ? "●" : "●"} {u.label}
                  </option>
                ))}
              </select>
              <button
                className="rounded-xl bg-[var(--ic-teal)] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--ic-navy)] disabled:opacity-50"
                onClick={createThread}
                disabled={!targetUser}
              >
                Start
              </button>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-sm">
                {error}
              </div>
            )}

             <div className="space-y-3">
               <div className="space-y-2">
                 <p className="text-xs font-semibold text-[var(--ic-navy)]">Threads</p>
                <div className="max-h-36 overflow-auto rounded-xl border border-[var(--ic-gray-200)] bg-white shadow-inner">
                   {!loadingThreads && !threads.length && (
                     <p className="p-3 text-xs text-[var(--ic-gray-600)]">No threads yet.</p>
                   )}
                   {!loadingThreads &&
                     threads.map((t) => {
                       const other =
                         t.participants?.find((p) => p && p.toString() !== currentUserId) || "";
                      const title = t.title || (other ? userMap[other] || "Chat" : "Chat");
                       const lastAt = t.lastMessageAt ? new Date(t.lastMessageAt).getTime() : 0;
                       const isNew =
                         t.lastMessageSenderId &&
                         t.lastMessageSenderId !== currentUserId &&
                         lastAt > (lastSeenMs || 0) &&
                         activeThreadId !== t._id;
                       return (
                         <div
                           key={t._id}
                           role="button"
                           tabIndex={0}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                             t._id === activeThreadId
                              ? "bg-[var(--ic-teal)]/10 text-[var(--ic-navy)]"
                               : "hover:bg-[var(--ic-gray-50)]"
                           }`}
                           onClick={() => loadMessages(t._id)}
                           onKeyDown={(e) => {
                             if (e.key === "Enter" || e.key === " ") {
                               e.preventDefault();
                               loadMessages(t._id);
                             }
                           }}
                         >
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ic-gray-100)] text-[var(--ic-navy)] font-semibold">
                              {title.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                           <div className="flex items-center gap-2">
                             {other ? presenceDot(other.toString()) : presenceDot("")}
                                <span className="font-semibold">{title}</span>
                             {isNew && (
                                  <span className="rounded-full bg-[var(--ic-teal)] px-2 py-[1px] text-[10px] font-semibold text-white">
                                 New
                               </span>
                             )}
                           </div>
                              <span className="line-clamp-1 text-[11px] text-[var(--ic-gray-600)]">
                                {t.lastMessageText || "Tap to open chat"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                             <span className="text-[10px] text-[var(--ic-gray-500)]">
                              {t.lastMessageAt ? new Date(t.lastMessageAt).toLocaleTimeString() : ""}
                             </span>
                            <button
                              className="text-[10px] text-red-600 hover:underline"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 deleteThread(t._id);
                               }}
                               onKeyDown={(e) => {
                                 if (e.key === "Enter" || e.key === " ") {
                                   e.preventDefault();
                                   deleteThread(t._id);
                                 }
                               }}
                             >
                               Delete
                            </button>
                           </div>
                         </div>
                       );
                     })}
                 </div>
               </div>

               <div className="space-y-2">
                 <p className="text-xs font-semibold text-[var(--ic-navy)]">Messages</p>
                 <div
                   ref={scrollRef}
                  className="flex h-52 flex-col gap-2 overflow-auto rounded-xl border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] p-3"
                 >
                   {!activeMessages.length && !loadingMessages && (
                     <p className="text-xs text-[var(--ic-gray-600)]">No messages yet.</p>
                   )}
                   {activeMessages.map((m) => {
                     const mine = m.senderId === currentUserId;
                     const displayText =
                       m.type === "text"
                         ? (m.body && m.body.length ? m.body : "(no text)")
                         : m.file?.name || "File";
                     return (
                      <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                         <div
                          className={`relative flex max-w-[80%] flex-col gap-1 rounded-2xl px-3 py-2 text-xs shadow-sm ${
                             mine
                              ? "bg-[var(--ic-teal)] text-white rounded-br-sm"
                              : "bg-white text-[var(--ic-gray-800)] border border-[var(--ic-gray-200)] rounded-bl-sm"
                           }`}
                         >
                          <span
                            className={`flex items-center gap-2 text-[11px] font-semibold ${
                              mine ? "text-white/90" : "text-[var(--ic-navy)]"
                            }`}
                          >
                             {presenceDot(m.senderId)}
                             {mine ? "You" : userMap[m.senderId] || "User"}
                           </span>
                          {m.type === "text" && (
                            <span className={`whitespace-pre-wrap leading-relaxed ${mine ? "text-white" : ""}`}>
                              {displayText}
                            </span>
                          )}
                           {m.type === "file" && m.file && (
                             <a
                               href={m.file.data || m.file.url || "#"}
                               download={m.file.name}
                              className={`underline ${mine ? "text-white" : "text-[var(--ic-navy)]"}`}
                             >
                               {displayText}
                             </a>
                           )}
                          <span
                            className={`text-[10px] ${
                              mine ? "text-white/80 self-end" : "text-[var(--ic-gray-500)]"
                            }`}
                          >
                             {new Date(m.createdAt).toLocaleTimeString()}
                           </span>
                         </div>
                       </div>
                     );
                   })}
                 </div>
                 <div className="space-y-2">
                   <textarea
                    ref={textareaRef}
                    className="w-full rounded-xl border border-[var(--ic-gray-200)] bg-white px-3 py-2 text-sm shadow-sm focus:border-[var(--ic-teal)] focus:outline-none"
                     rows={2}
                     value={sendText}
                     onChange={(e) => setSendText(e.target.value)}
                     onKeyDown={onKeyDownSend}
                     placeholder="Type a message"
                   />
                  <div className="relative flex items-center gap-2">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--ic-gray-200)] bg-white text-lg shadow-sm hover:bg-[var(--ic-gray-50)]"
                      onClick={() => setShowEmoji((v) => !v)}
                    >
                      😊
                    </button>
                    {showEmoji && (
                      <div className="absolute bottom-11 left-0 z-20 grid grid-cols-6 gap-1 rounded-2xl border border-[var(--ic-gray-200)] bg-white p-2 shadow-lg">
                        {emojiList.map((e) => (
                          <button
                            key={e}
                            type="button"
                            className="text-lg transition hover:scale-110"
                            onClick={() => addEmoji(e)}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                    <input
                      type="file"
                      className="text-xs text-[var(--ic-navy)]"
                      onChange={(e) => setSendFile(e.target.files?.[0] ?? null)}
                    />
                    <button
                      className="ml-auto rounded-full bg-[var(--ic-teal)] px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-[var(--ic-navy)]"
                      onClick={sendMessage}
                    >
                      Send
                    </button>
                  </div>
                 </div>
               </div>
             </div>
          </div>
        </div>
      )}
    </>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}


