import React, { useState, useEffect, useRef } from "react";
import useTitle from "../hooks/useTitle";
import { API_BASE_URL } from "../config";
import {
  FaPlus,
  FaSpinner,
  FaPaperPlane,
  FaEllipsisV,
  FaTrash,
} from "react-icons/fa";
import DeleteConfirmModal from "../components/Widgets/DeleteConfirmModal";

const Chats = () => {
  useTitle("Chats");

  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest("[data-menu]")) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE_URL}/ai/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setSessions(list);
        if (list.length > 0 && !selectedSession) {
          setSelectedSession(list[0].id);
          fetchMessages(list[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchMessages = async (sessionId) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${API_BASE_URL}/ai/sessions/${sessionId}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    setLoading(true);

    // Optimistically add user message
    const userMsg = { role: "user", content: userText };
    setMessages((prev) => [...prev, userMsg]);

    // Placeholder for streaming assistant response
    const assistantPlaceholder = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantPlaceholder]);

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userText,
          session_id: selectedSession || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: "Failed to get response.",
          };
          return next;
        });
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamedSessionId = selectedSession;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "session") {
              streamedSessionId = parsed.session_id;
              setSelectedSession(parsed.session_id);
            } else if (parsed.type === "chunk" && parsed.content) {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                next[next.length - 1] = {
                  ...last,
                  content: last.content + parsed.content,
                };
                return next;
              });
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      // Refresh sessions list after stream ends
      await fetchSessions();
      if (streamedSessionId) setSelectedSession(streamedSessionId);
    } catch (err) {
      console.error(err);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: "Connection error.",
        };
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (sessionId) => {
    setSessionToDelete(sessionId);
    setOpenMenuId(null);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${API_BASE_URL}/ai/sessions/${sessionToDelete}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        if (selectedSession === sessionToDelete) {
          setSelectedSession(null);
          setMessages([]);
        }
        await fetchSessions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleteModalOpen(false);
      setSessionToDelete(null);
    }
  };

  const startNewChat = () => {
    setSelectedSession(null);
    setMessages([]);
    setInput("");
  };

  return (
    // -mx-4 -mt-4 removes the padding from Main.jsx content wrapper (same as Mission Planner)
    // h-[calc(100vh-3.5rem)] fills the exact content height
    <div className="flex -mx-4 -mt-4 h-[calc(100vh-3.5rem-2.25rem)] overflow-hidden">
      {/* LEFT PANEL - Sessions list, same concept as MissionSidebar */}
      <div className="w-72 h-full py-3 shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-black overflow-x-visible overflow-y-hidden">
        {/* New Chat */}
        <div className="px-4 pt-4 pb-3 shrink-0">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition"
          >
            <FaPlus size={12} /> New chat
          </button>
        </div>

        {/* Sessions - scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-3 space-y-0.5">
          {sessionsLoading ? (
            <div className="flex justify-center py-8">
              <FaSpinner className="animate-spin text-gray-400" size={18} />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-center text-gray-500 py-8">
              No chats yet
            </p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={`group relative flex items-center rounded-lg cursor-pointer px-3 py-1.5 transition border ${
                  selectedSession === s.id
                    ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                    : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() => {
                  setSelectedSession(s.id);
                  fetchMessages(s.id);
                }}
              >
                <p className="flex-1 text-sm truncate text-gray-900 dark:text-gray-100">
                  {s.title}
                </p>

                <div data-menu className="relative shrink-0">
                  <button
                    data-menu
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === s.id ? null : s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    <FaEllipsisV size={11} className="text-gray-500" />
                  </button>

                  {openMenuId === s.id && (
                    <div
                      data-menu
                      className="absolute right-0 top-full mt-1 w-36 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-9999 bg-white dark:bg-black py-1 px-4"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(s.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      >
                        <FaTrash size={11} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT - Chat area */}
      <div className="flex-1 h-full flex flex-col overflow-hidden bg-white dark:bg-black">
        {/* EMPTY STATE - centered like Claude.ai */}
        {messages.length === 0 && !selectedSession ? (
          <div className="flex-1 flex flex-col items-center justify-center px-32">
            <div className="w-full max-w-2xl flex flex-col items-center">
              <h2 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">
                How can I help?
              </h2>
              {/* Input centered in the middle */}
              <div className="w-full flex gap-3 items-center bg-gray-100 dark:bg-black rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="How can I help you today?"
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shrink-0"
                >
                  {loading ? (
                    <FaSpinner className="animate-spin" size={13} />
                  ) : (
                    <FaPaperPlane size={13} />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Messages - scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-32 py-6 space-y-4">
              {messages.map((msg, idx) => {
                const isLastMsg = idx === messages.length - 1;
                const isStreamingPlaceholder =
                  loading &&
                  isLastMsg &&
                  msg.role === "assistant" &&
                  msg.content === "";
                return (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {isStreamingPlaceholder ? (
                      <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3.5 rounded-2xl rounded-bl-sm flex items-center gap-1">
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    ) : (
                      <div
                        className={`max-w-2xl px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - fixed at bottom */}
            <div className="shrink-0 px-32 py-3">
              <div className="flex gap-3 items-center bg-gray-100 dark:bg-black rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Write a message..."
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shrink-0"
                >
                  {loading ? (
                    <FaSpinner className="animate-spin" size={13} />
                  ) : (
                    <FaPaperPlane size={13} />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSessionToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Conversation"
        message="Are you sure you want to delete this conversation? This action cannot be undone."
      />
    </div>
  );
};

export default Chats;
