import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { api } from "../api";
import ExcelUpload from "../components/ExcelUpload";
import TaskTable from "../components/TaskTable";
import AiGenerator from "../components/AiGenerator";
import ChatPanel from "../components/ChatPanel";

export default function DashboardPage() {
  const {
    session,
    selectedProjectId,
    selectedProject,
    query,
    notice,
    showNotice,
    loadWorkspaceAndProjects,
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
      .channel(`dashboard-tasks-${selectedProjectId}`)
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
    const done = visibleTasks.filter((task) => task.status === "완료").length;
    const inProgress = visibleTasks.filter((task) => task.status === "진행중").length;
    const overdue = visibleTasks.filter((task) => task.status === "지연").length;
    const avg = total ? Math.round(visibleTasks.reduce((sum, task) => sum + Number(task.progress || 0), 0) / total) : 0;

    return { total, done, inProgress, overdue, avg };
  }, [visibleTasks]);

  async function refreshWithNotice(message) {
    showNotice(message);
    await loadWorkspaceAndProjects();
    await loadTasks();
  }

  return (
    <div className="grid flex-1 gap-6 p-5 lg:p-8 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="space-y-6">
        {notice && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm font-black text-blue-700">
            {notice}
          </div>
        )}

        <ExcelUpload onDone={refreshWithNotice} />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["전체 업무", stats.total],
            ["진행중", stats.inProgress],
            ["완료", stats.done],
            ["지연", stats.overdue],
            ["평균 진행률", `${stats.avg}%`],
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
        <AiGenerator onDone={refreshWithNotice} />
        {selectedProject ? (
          <ChatPanel project={selectedProject} currentUser={session.user} />
        ) : (
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500">
            채팅을 사용하려면 왼쪽에서 프로젝트를 하나 선택하세요.
          </div>
        )}
      </aside>
    </div>
  );
}
