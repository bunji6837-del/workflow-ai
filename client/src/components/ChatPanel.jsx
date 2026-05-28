import { useEffect, useRef, useState } from "react";
import { MessageSquareText, Paperclip, Send } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { api } from "../api";

function getSenderName(message, currentUser) {
  return (
    message.user_display_name ||
    message.display_name ||
    message.user_email ||
    currentUser?.email ||
    "user"
  );
}

export default function ChatPanel({ project, currentUser, profile, fullHeight = false }) {
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

            const withoutTemp = prev.filter((message) => {
              if (!String(message.id).startsWith("temp-")) return true;
              return !(message.body === payload.new.body && message.user_id === payload.new.user_id);
            });

            return [...withoutTemp, payload.new];
          });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setError("실시간 채팅 연결에 실패했습니다. 메시지는 저장되지만 새로고침 후 보일 수 있습니다.");
        }
      });

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

    const nextBody = body.trim();
    if (!nextBody) return;

    const tempId = `temp-${Date.now()}`;
    const myDisplayName = profile?.display_name || profile?.nickname || currentUser?.email || "나";

    const optimisticMessage = {
      id: tempId,
      project_id: project.id,
      user_id: currentUser.id,
      user_email: currentUser.email,
      user_display_name: myDisplayName,
      body: nextBody,
      created_at: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setBody("");
    setLoading(true);
    setError("");

    try {
      const result = await api.sendMessage(project.id, nextBody);

      if (result.message) {
        setMessages((prev) => {
          const exists = prev.some((message) => message.id === result.message.id);

          if (exists) {
            return prev.filter((message) => message.id !== tempId);
          }

          return prev.map((message) => {
            if (message.id === tempId) return result.message;
            return message;
          });
        });
      }
    } catch (sendError) {
      setMessages((prev) => prev.filter((message) => message.id !== tempId));
      setBody(nextBody);
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
                    {getSenderName(message, currentUser)}
                    {message.pending ? " · 전송 중" : ""}
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
          type="submit"
          disabled={loading && !body.trim()}
          className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white disabled:opacity-60"
        >
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}