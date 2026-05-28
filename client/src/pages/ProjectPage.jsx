import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { CalendarDays, FolderKanban } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { api } from "../api";
import TaskTable from "../components/TaskTable";
import ChatPanel from "../components/ChatPanel";

function daysBetween(dateText) {
  if (!dateText) return null;

  const today = new Date(new Date().toISOString().slice(0, 10));
  const target = new Date(dateText);

  if (Number.isNaN(target.getTime())) return null;

  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function isDone(task) {
  return task.status === "완료";
}

export default function ProjectPage() {
  const {
    session,
    profile,
    selectedProjectId,
    selectedProject,
    query,
    notice,
    showNotice,
  } = useOutletContext();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);

    try {
      const taskPayload = await api.getTasks(selectedProjectId);
      setTasks(taskPayload.tasks || []);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadTasks().catch((error) => showNotice(error.message));
  }, [loadTasks, showNotice]);

  useEffect(() => {
    const channel = supabase
      .channel(`project-page-tasks-${selectedProjectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        loadTasks().catch(console.error);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTasks, selectedProjectId]);

  const visibleTasks = useMemo(() => {
    const lower = query.toLowerCase();

    return tasks.filter((task) => {
      const projectName = task.projects?.name || "";
      return `${task.title} ${task.assignee_name} ${task.status} ${task.priority} ${projectName}`
        .toLowerCase()
        .includes(lower);
    });
  }, [tasks, query]);

  const stats = useMemo(() => {
    const total = visibleTasks.length;
    const done = visibleTasks.filter(isDone).length;
    const waiting = visibleTasks.filter((task) => task.status === "대기").length;
    const urgent = visibleTasks.filter((task) => task.priority === "높음").length;
    const dueSoon = visibleTasks.filter((task) => {
      const diff = daysBetween(task.due_date);
      return diff !== null && diff >= 0 && diff <= 3 && !isDone(task);
    }).length;

    return { total, done, waiting, urgent, dueSoon };
  }, [visibleTasks]);

  const projectTitle = selectedProjectId === "all" ? "전체 프로젝트" : selectedProject?.name || "프로젝트";

  return (
    <div className="grid flex-1 gap-6 p-5 lg:p-8 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="space-y-6">
        {notice && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm font-black text-blue-700">
            {notice}
          </div>
        )}

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-blue-50 text-blue-700">
                <FolderKanban size={26} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-black">{projectTitle}</h2>
                <p className="mt-1 text-sm font-bold text-slate-400">
                  {selectedProject?.description || "프로젝트별 업무와 채팅을 관리합니다."}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-500">
              <CalendarDays size={18} />
              업무 {stats.total}개
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["전체 업무", stats.total],
            ["완료", stats.done],
            ["대기", stats.waiting],
            ["높은 우선순위", stats.urgent],
            ["3일 내 마감", stats.dueSoon],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-black text-slate-400">{label}</p>
              <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center text-sm font-black text-slate-400">
            업무 목록을 불러오는 중입니다...
          </div>
        ) : (
          <TaskTable tasks={visibleTasks} onTaskUpdated={loadTasks} />
        )}
      </section>

      <aside className="space-y-6">
        {selectedProject ? (
          <ChatPanel project={selectedProject} currentUser={session.user} profile={profile} />
        ) : (
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500">
            특정 프로젝트 채팅을 사용하려면 왼쪽에서 프로젝트를 하나 선택하세요.
          </div>
        )}
      </aside>
    </div>
  );
}