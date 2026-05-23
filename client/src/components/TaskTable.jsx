import { useState } from "react";
import { CalendarDays, CheckCircle2, Save } from "lucide-react";
import { api } from "../api";

function statusClass(status) {
  if (status === "완료") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "진행중") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (status === "지연") return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function priorityClass(priority) {
  if (priority === "높음") return "bg-rose-50 text-rose-700";
  if (priority === "낮음") return "bg-slate-100 text-slate-500";
  return "bg-amber-50 text-amber-700";
}

export default function TaskTable({ tasks, onTaskUpdated }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  function startEdit(task) {
    setEditingId(task.id);
    setDraft({
      title: task.title || "",
      assignee_name: task.assignee_name || "",
      due_date: task.due_date || "",
      status: task.status || "대기",
      priority: task.priority || "보통",
      progress: Number(task.progress || 0),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({});
  }

  async function saveEdit(taskId) {
    setSaving(true);

    try {
      await api.updateTask(taskId, {
        ...draft,
        due_date: draft.due_date || null,
        progress: Math.max(0, Math.min(100, Number(draft.progress) || 0)),
      });
      setEditingId(null);
      setDraft({});
      await onTaskUpdated();
    } finally {
      setSaving(false);
    }
  }

  async function toggleComplete(task) {
    const nextStatus = task.status === "완료" ? "진행중" : "완료";
    const nextProgress = nextStatus === "완료" ? 100 : Math.min(Number(task.progress || 0), 80);

    await api.updateTask(task.id, {
      status: nextStatus,
      progress: nextProgress,
    });

    await onTaskUpdated();
  }

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black">업무 진행 현황</h3>
          <p className="mt-1 text-sm font-semibold text-slate-400">담당자, 마감일, 상태를 한눈에 확인하고 바로 수정합니다.</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          <CalendarDays size={20} />
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-3xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
          아직 업무가 없습니다. 엑셀을 업로드하거나 AI 생성 기능을 사용하세요.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-separate border-spacing-y-3 text-left">
            <thead>
              <tr className="text-xs font-black uppercase tracking-widest text-slate-400">
                <th className="px-4">업무명</th>
                <th className="px-4">담당자</th>
                <th className="px-4">마감일</th>
                <th className="px-4">상태</th>
                <th className="px-4">우선순위</th>
                <th className="px-4">진행률</th>
                <th className="px-4">관리</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const isEditing = editingId === task.id;

                return (
                  <tr key={task.id} className="rounded-2xl bg-slate-50 text-sm font-bold">
                    <td className="rounded-l-2xl px-4 py-4">
                      {isEditing ? (
                        <input
                          value={draft.title}
                          onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
                        />
                      ) : (
                        <>
                          <p className="font-black text-slate-900">{task.title}</p>
                          <p className="mt-1 text-xs font-bold text-slate-400">{task.projects?.name || "프로젝트"}</p>
                        </>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {isEditing ? (
                        <input
                          value={draft.assignee_name}
                          onChange={(event) => setDraft((prev) => ({ ...prev, assignee_name: event.target.value }))}
                          className="h-10 w-32 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
                        />
                      ) : (
                        task.assignee_name || "미배정"
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {isEditing ? (
                        <input
                          type="date"
                          value={draft.due_date}
                          onChange={(event) => setDraft((prev) => ({ ...prev, due_date: event.target.value }))}
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
                        />
                      ) : (
                        task.due_date || "미정"
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {isEditing ? (
                        <select
                          value={draft.status}
                          onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))}
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
                        >
                          <option>대기</option>
                          <option>진행중</option>
                          <option>완료</option>
                          <option>지연</option>
                        </select>
                      ) : (
                        <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${statusClass(task.status)}`}>
                          {task.status}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {isEditing ? (
                        <select
                          value={draft.priority}
                          onChange={(event) => setDraft((prev) => ({ ...prev, priority: event.target.value }))}
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
                        >
                          <option>낮음</option>
                          <option>보통</option>
                          <option>높음</option>
                        </select>
                      ) : (
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${priorityClass(task.priority)}`}>
                          {task.priority}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={draft.progress}
                          onChange={(event) => setDraft((prev) => ({ ...prev, progress: event.target.value }))}
                          className="h-10 w-24 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-blue-600" style={{ width: `${task.progress || 0}%` }} />
                          </div>
                          <span className="w-10 text-xs font-black text-slate-500">{task.progress || 0}%</span>
                        </div>
                      )}
                    </td>

                    <td className="rounded-r-2xl px-4 py-4">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => saveEdit(task.id)}
                            disabled={saving}
                            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-blue-600 px-3 text-xs font-black text-white disabled:opacity-60"
                          >
                            <Save size={16} />
                            저장
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="h-10 rounded-2xl bg-white px-3 text-xs font-black text-slate-500 shadow-sm disabled:opacity-60"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(task)}
                            className="h-10 rounded-2xl bg-white px-3 text-xs font-black text-slate-600 shadow-sm transition hover:text-blue-600"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => toggleComplete(task)}
                            className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm transition hover:text-emerald-600"
                            title="완료 토글"
                          >
                            <CheckCircle2 size={19} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
