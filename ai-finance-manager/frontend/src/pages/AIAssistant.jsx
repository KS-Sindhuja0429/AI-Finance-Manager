import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiSend, FiTrash2, FiMessageCircle } from "react-icons/fi";
import Layout from "../components/Layout";
import Loader from "../components/Loader";
import api from "../api/axios";

const SUGGESTIONS = [
  "How am I doing financially this month?",
  "Where can I cut back on spending?",
  "Give me savings tips based on my habits",
  "Summarize my finances this month",
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get("/ai/chat/history");
      setMessages(res.data.history);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;

    setMessages((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, role: "user", message, created_at: new Date().toISOString() },
    ]);
    setInput("");
    setSending(true);
    try {
      const res = await api.post("/ai/chat", { message });
      setMessages((prev) => [...prev, res.data.reply]);
    } catch (err) {
      toast.error(err.response?.data?.message || "The assistant couldn't respond");
    } finally {
      setSending(false);
    }
  };

  const clearHistory = async () => {
    if (!window.confirm("Clear the entire chat history?")) return;
    await api.delete("/ai/chat/history");
    setMessages([]);
    toast.success("Chat history cleared");
  };

  return (
    <Layout title="AI Assistant">
      <div className="glass-panel flex flex-col h-[calc(100vh-160px)] min-h-[400px]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <FiMessageCircle className="text-pulse" size={18} />
            <h3 className="font-display font-semibold text-mist-100">Financial Assistant</h3>
          </div>
          <button
            className="text-mist-400 hover:text-coral transition-colors text-sm flex items-center gap-1.5"
            onClick={clearHistory}
          >
            <FiTrash2 size={14} /> Clear
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <Loader />
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-8">
              <p className="text-mist-400 text-sm max-w-sm">
                Ask about your spending, budgets, or savings — the assistant uses your real
                transaction data to answer.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="btn-secondary text-xs py-2" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-pulse text-ink-950 font-medium rounded-br-sm"
                      : "bg-white/5 text-mist-100 border border-white/10 rounded-bl-sm"
                  }`}
                >
                  {m.message}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-mist-400">
                Thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-3 px-5 py-4 border-t border-white/5"
        >
          <input
            className="glass-input flex-1"
            placeholder="Ask about your finances…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button type="submit" className="btn-primary px-4" disabled={sending || !input.trim()}>
            <FiSend size={16} />
          </button>
        </form>
      </div>
    </Layout>
  );
}
