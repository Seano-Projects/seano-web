import { useState, useRef, useEffect } from "react";
import { FiSend, FiX, FiMenu, FiPlus, FiTrash2 } from "react-icons/fi";
import useAIChat from "../../../hooks/useAIChat";

const FloatingChat = ({ isOpen, onClose }) => {
  const {
    messages,
    sessions,
    activeSessionId,
    loading,
    sendMessage,
    loadSession,
    newChat,
    deleteSession,
  } = useAIChat();
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
    setInput("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-10 right-14 z-10051 w-80 sm:w-96 h-120 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header - solid blue */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-blue-600">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="p-1 rounded hover:bg-blue-700 text-white/80 hover:text-white transition-colors"
            title="Chat history"
          >
            <FiMenu className="text-sm" />
          </button>
          <span className="text-sm font-semibold text-white">SEANO AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={newChat}
            className="p-1.5 rounded hover:bg-blue-700 text-white/80 hover:text-white transition-colors"
            title="New chat"
          >
            <FiPlus className="text-sm" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-blue-700 text-white/80 hover:text-white transition-colors"
          >
            <FiX className="text-sm" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* History Sidebar */}
        {showHistory && (
          <div className="absolute inset-0 z-10 flex">
            <div className="w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  History
                </span>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                >
                  <FiX className="text-xs" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto chat-scrollbar">
                {sessions.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center mt-4">
                    No chat history
                  </p>
                ) : (
                  sessions.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group ${
                        s.id === activeSessionId
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : ""
                      }`}
                      onClick={() => {
                        loadSession(s.id);
                        setShowHistory(false);
                      }}
                    >
                      <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">
                        {s.title}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(s.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 transition-all"
                      >
                        <FiTrash2 className="text-xs" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div
              className="flex-1 bg-black/20"
              onClick={() => setShowHistory(false)}
            />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 chat-scrollbar">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 dark:text-gray-500 text-sm mt-8">
              <p className="font-medium">Halo! Saya SEANO AI</p>
              <p className="mt-1 text-xs">Tanya apa saja tentang SeaPortal</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg rounded-bl-sm">
                <div className="flex gap-1">
                  <span
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 dark:border-gray-700 p-2 flex gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          placeholder="Ketik pesan..."
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors"
        >
          <FiSend className="text-sm" />
        </button>
      </form>

      {/* Custom scrollbar styles */}
      <style>{`
        .chat-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .chat-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .dark .chat-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
        }
        .chat-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .dark .chat-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
      `}</style>
    </div>
  );
};

export default FloatingChat;
