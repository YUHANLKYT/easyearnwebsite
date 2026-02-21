"use client";

import { useEffect, useRef, useState } from "react";

type ChatItem = {
  id: string;
  userId: string;
  userName: string;
  userAnonymous: boolean;
  userRole: "USER" | "ADMIN";
  userLevel: number;
  message: string;
  createdAt: string;
};

type ChatListResponse = {
  items: ChatItem[];
  currentUserId: string;
  canModerate: boolean;
};

type ChatProfile = {
  id: string;
  name: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "MUTED" | "TERMINATED";
  level: number;
  isAnonymous: boolean;
  balance: string | null;
  lifetimeEarned: string | null;
  totalWithdrawn: string | null;
  totalReferrals: number | null;
  activeReferrals: number | null;
  chatMessages: number | null;
  joinedAt: string | null;
};

type SideChatPopupProps = {
  chatUnlocked: boolean;
  canSend: boolean;
};

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function displayMetric(value: string | number | null): string {
  return value === null ? "Hidden" : String(value);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SideChatPopup({ chatUnlocked, canSend }: SideChatPopupProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canModerate, setCanModerate] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ChatProfile | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  async function loadMessages() {
    try {
      const response = await fetch("/api/chat", { cache: "no-store" });
      const payload = (await response.json()) as (ChatListResponse & { error?: string }) | { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Could not load chat.");
      }
      const typedPayload = payload as ChatListResponse;
      setMessages(typedPayload.items ?? []);
      setCurrentUserId(typedPayload.currentUserId ?? null);
      setCanModerate(Boolean(typedPayload.canModerate));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load chat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  async function openProfile(userId: string) {
    setSelectedProfile(null);
    setProfileError(null);
    setProfileLoading(true);

    try {
      const response = await fetch(`/api/chat/user-stats?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
      const payload = (await response.json()) as { error?: string; profile?: ChatProfile };
      if (!response.ok || !payload.profile) {
        throw new Error(payload.error || "Could not load user stats.");
      }
      setSelectedProfile(payload.profile);
    } catch (loadError) {
      setProfileError(loadError instanceof Error ? loadError.message : "Could not load user stats.");
    } finally {
      setProfileLoading(false);
    }
  }

  function closeProfileModal() {
    setSelectedProfile(null);
    setProfileError(null);
    setProfileLoading(false);
  }

  async function sendMessage() {
    const message = draft.trim();
    if (!message || !chatUnlocked || !canSend || sending) {
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });
      const payload = (await response.json()) as { error?: string; item?: ChatItem };
      if (!response.ok || !payload.item) {
        throw new Error(payload.error || "Failed to send message.");
      }

      setMessages((current) => [...current, payload.item as ChatItem]);
      setDraft("");
      setError(null);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(messageId: string) {
    if (!canModerate || deletingMessageId) {
      return;
    }

    const confirmed = window.confirm("Delete this message from chat?");
    if (!confirmed) {
      return;
    }

    setDeletingMessageId(messageId);
    try {
      const response = await fetch("/api/chat", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messageId }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete message.");
      }

      setMessages((current) => current.filter((item) => item.id !== messageId));
      setError(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete message.");
    } finally {
      setDeletingMessageId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`chat-toggle fixed top-1/2 right-0 z-50 ${
          open ? "chat-toggle-open" : "chat-toggle-closed"
        }`}
        style={{
          transform: `translate3d(${open ? "calc(-1 * min(92vw, 390px))" : "0px"}, -50%, 0)`,
        }}
        title={open ? "Close chat" : "Open chat"}
      >
        <span className="chat-toggle-dot" aria-hidden />
        <span className="chat-toggle-label">{open ? "Close Chat" : "Open Chat"}</span>
        <span className="chat-toggle-chevron" aria-hidden>
          {open ? ">" : "<"}
        </span>
      </button>

      <section
        className={`chat-drawer fixed top-0 right-0 z-40 h-screen w-[min(92vw,390px)] border-l border-slate-200 bg-white/95 shadow-2xl ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="chat-drawer-head flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Easy Earn Chat</p>
            <p className="text-xs text-slate-500">Click a name to view stats</p>
          </div>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">
            Live
          </span>
        </header>

        <div className="chat-drawer-body h-[calc(100vh-152px)] overflow-y-auto bg-slate-50/80 p-3">
          {loading ? <p className="text-sm text-slate-500">Loading chat...</p> : null}
          {!loading && messages.length === 0 ? <p className="text-sm text-slate-500">No messages yet.</p> : null}

          <div className="space-y-2">
            {messages.map((item) => (
              <article key={item.id} className="chat-message-card rounded-2xl border px-3 py-3">
                <div className="chat-message-shell flex items-start gap-3">
                  <div className="chat-message-avatar mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                    {item.userAnonymous ? "A" : getInitials(item.userName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="chat-message-meta-row flex items-start justify-between gap-2">
                      <div className="chat-message-name-row flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openProfile(item.userId)}
                          className="chat-message-user text-xs font-semibold underline decoration-dotted underline-offset-2"
                        >
                          {item.userName}
                        </button>
                        {item.userAnonymous ? (
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                            ANON
                          </span>
                        ) : (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                            Lv {item.userLevel}
                          </span>
                        )}
                        {item.userRole === "ADMIN" ? (
                          <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 text-[10px] font-bold text-fuchsia-700">
                            ADMIN
                          </span>
                        ) : !item.userAnonymous && item.userLevel >= 25 ? (
                          <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                            VIP+
                          </span>
                        ) : !item.userAnonymous && item.userLevel >= 10 ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            VIP
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="chat-message-time text-[11px]">{formatTime(item.createdAt)}</p>
                        {canModerate ? (
                          <button
                            type="button"
                            onClick={() => deleteMessage(item.id)}
                            disabled={deletingMessageId === item.id}
                            className="chat-message-delete rounded-md border px-2 py-0.5 text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-55"
                            title={
                              item.userId === currentUserId
                                ? "Delete your message"
                                : "Delete this message as admin"
                            }
                          >
                            {deletingMessageId === item.id ? "..." : "Delete"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="chat-message-text mt-1.5 text-sm leading-relaxed">{item.message}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div ref={endRef} />
        </div>

        <div className="chat-drawer-compose border-t border-slate-100 bg-white p-3">
          {error ? <p className="mb-2 text-xs text-rose-700">{error}</p> : null}
          {!chatUnlocked ? (
            <p className="mb-2 text-xs font-medium text-slate-600">Reach level 1 to send messages.</p>
          ) : null}
          {chatUnlocked && !canSend ? (
            <p className="mb-2 text-xs font-medium text-amber-700">Your account is muted. You can view chat only.</p>
          ) : null}

          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              maxLength={240}
              disabled={!chatUnlocked || !canSend}
              placeholder={chatUnlocked ? "Type a message (5s cooldown)" : "Unlock at level 1"}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-300 transition focus:ring-2 disabled:bg-slate-100"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={sending || !chatUnlocked || !canSend || !draft.trim()}
              className="rounded-xl bg-gradient-to-r from-orange-400 to-sky-500 px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        </div>
      </section>

      {profileLoading || selectedProfile || profileError ? (
        <div className="chat-profile-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <button type="button" onClick={closeProfileModal} className="absolute inset-0" aria-label="Close profile" />
          <div className="chat-profile-modal relative w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl">
            <div className="chat-profile-header px-5 py-4">
              <p className="chat-profile-kicker text-xs font-semibold uppercase tracking-wide">Chat Profile</p>
              {selectedProfile ? (
                <div className="mt-2 flex items-center gap-2">
                  <p className="chat-profile-name text-lg font-semibold">{selectedProfile.name}</p>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                    Lv {selectedProfile.level}
                  </span>
                  {selectedProfile.role === "ADMIN" ? (
                    <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 text-[11px] font-bold text-fuchsia-700">
                      ADMIN
                    </span>
                  ) : selectedProfile.level >= 25 ? (
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                      VIP+
                    </span>
                  ) : selectedProfile.level >= 10 ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                      VIP
                    </span>
                  ) : null}
                  {selectedProfile.isAnonymous ? (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                      ANON
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="chat-profile-kicker mt-2 text-sm">{profileLoading ? "Loading user stats..." : "User profile"}</p>
              )}
            </div>

            <button
              type="button"
              onClick={closeProfileModal}
              className="chat-profile-close absolute top-3 right-3 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600"
            >
              Close
            </button>

            <div className="space-y-3 p-5">
              {profileError ? <p className="chat-profile-error rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{profileError}</p> : null}

              {selectedProfile ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="chat-profile-stat rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Balance</p>
                      <p className="text-sm font-semibold text-slate-900">{displayMetric(selectedProfile.balance)}</p>
                    </div>
                    <div className="chat-profile-stat rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Lifetime Earned</p>
                      <p className="text-sm font-semibold text-slate-900">{displayMetric(selectedProfile.lifetimeEarned)}</p>
                    </div>
                    <div className="chat-profile-stat rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Withdrawn</p>
                      <p className="text-sm font-semibold text-slate-900">{displayMetric(selectedProfile.totalWithdrawn)}</p>
                    </div>
                    <div className="chat-profile-stat rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Status</p>
                      <p className="text-sm font-semibold text-slate-900">{selectedProfile.status}</p>
                    </div>
                    <div className="chat-profile-stat rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Referrals</p>
                      <p className="text-sm font-semibold text-slate-900">{displayMetric(selectedProfile.totalReferrals)}</p>
                    </div>
                    <div className="chat-profile-stat rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Active (14d)</p>
                      <p className="text-sm font-semibold text-slate-900">{displayMetric(selectedProfile.activeReferrals)}</p>
                    </div>
                    <div className="chat-profile-stat rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Chat Messages</p>
                      <p className="text-sm font-semibold text-slate-900">{displayMetric(selectedProfile.chatMessages)}</p>
                    </div>
                    <div className="chat-profile-stat rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Joined</p>
                      {selectedProfile.joinedAt ? (
                        <p className="text-sm font-semibold text-slate-900">
                          {new Date(selectedProfile.joinedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      ) : (
                        <p className="text-sm font-semibold text-slate-900">Hidden</p>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
