import { useEffect, useRef, useState } from "react";
import { MessageSquareText, Paperclip, Send } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { api } from "../api";

export default function ChatPanel({ project, currentUser, fullHeight = false }) {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    setMessages([]);
    setError("");

    api
      .getMessages(project.id)
      .then((payload) => {
        if (mounted) setMessages(payload.messages || []);
      })
      .catch((fetchError) => {
        if (mounted) setError(fetchError.message);
      });

    const channel = supabase
      .channel(`project-messages-${project.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `project_id=eq.${project.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((message) => message.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [project.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!body.trim()) return;

    setLoading(true);
    setError("");

    try {
      await api.sendMessage(project.id, body);
      setBody("");
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm ${fullHeight ? "min-h-[560px]" : ""}`}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black">팀 메신저</h3>
          <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-400">{project.name}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          <MessageSquareText size={20} />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
          {error}
        </div>
      )}

      <div className={`${fullHeight ? "h-[430px]" : "h-[330px]"} space-y-3 overflow-y-auto rounded-3xl bg-slate-50 p-4`}>
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-sm font-bold text-slate-400">
            아직 메시지가 없습니다.
          </div>
        ) : (
          messages.map((message) => {
            const mine = message.user_id === currentUser.id;

            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-3xl px-4 py-3 ${mine ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}>
                  <p className={`mb-1 text-xs font-black ${mine ? "text-blue-100" : "text-slate-400"}`}>
                    {message.user_email || "user"}
                  </p>
                  <p className="whitespace-pre-wrap text-sm font-semibold leading-6">{message.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
        <button type="button" className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-white">
          <Paperclip size={18} />
        </button>
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="메시지를 입력하세요"
          className="h-10 flex-1 bg-transparent text-sm font-semibold outline-none"
        />
        <button
          disabled={loading}
          className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-60"
        >
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}
