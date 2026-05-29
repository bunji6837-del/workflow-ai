import { useEffect, useRef, useState } from "react";
import { Check, MessageSquareText, Paperclip, Pencil, Send, Trash2, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { api } from "../api";
import ConfirmDialog from "./ConfirmDialog";

function emailId(email) {
  return String(email || "user").split("@")[0] || "user";
}

function getDisplayName(message, currentUser, profile) {
  if (message.user_id === currentUser.id) {
    return profile?.nickname || profile?.display_name || emailId(currentUser.email);
  }

  return message.user_display_name || emailId(message.user_email);
}

function getSmallId(message, currentUser) {
  const targetEmail = message.user_email || currentUser?.email || "";
  return `@${emailId(targetEmail)}`;
}

export default function ChatPanel({ project, currentUser, profile, fullHeight = false }) {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editingBody, setEditingBody] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    setMessages([]);
    setError("");
    setEditingId(null);
    setEditingBody("");
    setDeleteTarget(null);

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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `project_id=eq.${project.id}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((message) => {
              if (message.id === payload.new.id) return payload.new;
              return message;
            })
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `project_id=eq.${project.id}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((message) => message.id !== payload.old.id));
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
    const myDisplayName = profile?.nickname || profile?.display_name || emailId(currentUser.email);

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

  function startEdit(message) {
    setEditingId(message.id);
    setEditingBody(message.body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingBody("");
  }

  async function saveEdit(messageId) {
    const nextBody = editingBody.trim();

    if (!nextBody) {
      setError("수정할 메시지 내용을 입력하세요.");
      return;
    }

    setError("");

    const previousMessages = messages;

    setMessages((prev) =>
      prev.map((message) => {
        if (message.id === messageId) {
          return {
            ...message,
            body: nextBody,
          };
        }

        return message;
      })
    );

    setEditingId(null);
    setEditingBody("");

    try {
      const result = await api.updateMessage(messageId, nextBody);

      if (result.message) {
        setMessages((prev) =>
          prev.map((message) => {
            if (message.id === messageId) return result.message;
            return message;
          })
        );
      }
    } catch (editError) {
      setMessages(previousMessages);
      setError(editError.message);
    }
  }

  function openDeleteDialog(message) {
    setDeleteTarget(message);
  }

  function closeDeleteDialog() {
    if (deleteLoading) return;
    setDeleteTarget(null);
  }

  async function confirmDeleteMessage() {
    if (!deleteTarget) return;

    const messageId = deleteTarget.id;
    const previousMessages = messages;

    setDeleteLoading(true);
    setError("");
    setMessages((prev) => prev.filter((message) => message.id !== messageId));

    try {
      await api.deleteMessage(messageId);
      setDeleteTarget(null);
    } catch (deleteError) {
      setMessages(previousMessages);
      setError(deleteError.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
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
              const isEditing = editingId === message.id;

              return (
                <div key={message.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className="relative max-w-[85%]">
                    <div className={`rounded-3xl px-4 py-3 ${mine ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}>
                      <div className="mb-1 flex items-baseline gap-2">
                        <span className={`text-xs font-black ${mine ? "text-white" : "text-slate-800"}`}>
                          {getDisplayName(message, currentUser, profile)}
                        </span>
                        <span className={`text-[11px] font-bold ${mine ? "text-blue-100" : "text-slate-400"}`}>
                          {getSmallId(message, currentUser)}
                        </span>
                        {message.pending && (
                          <span className={`text-[11px] font-bold ${mine ? "text-blue-100" : "text-slate-400"}`}>
                            전송 중
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingBody}
                            onChange={(event) => setEditingBody(event.target.value)}
                            className="min-h-[78px] w-full resize-none rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none"
                          />

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => saveEdit(message.id)}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white"
                            >
                              <Check size={14} />
                              저장
                            </button>

                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600"
                            >
                              <X size={14} />
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm font-semibold leading-6">{message.body}</p>
                      )}
                    </div>

                    {mine && !message.pending && !isEditing && (
                      <div className="absolute -left-20 top-2 hidden gap-1 group-hover:flex">
                        <button
                          type="button"
                          onClick={() => startEdit(message)}
                          className="grid h-8 w-8 place-items-center rounded-xl bg-white text-slate-500 shadow-sm hover:text-blue-700"
                          title="수정"
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openDeleteDialog(message)}
                          className="grid h-8 w-8 place-items-center rounded-xl bg-white text-slate-500 shadow-sm hover:text-rose-600"
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
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

      <ConfirmDialog
        open={!!deleteTarget}
        variant="danger"
        title="메시지를 삭제할까요?"
        message={deleteTarget ? `"${deleteTarget.body}"\n\n이 메시지는 삭제 후 복구할 수 없습니다.` : ""}
        description="내가 작성한 메시지만 삭제할 수 있습니다."
        confirmText="삭제하기"
        cancelText="취소"
        loading={deleteLoading}
        onClose={closeDeleteDialog}
        onConfirm={confirmDeleteMessage}
      />
    </>
  );
}