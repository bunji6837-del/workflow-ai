import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { CalendarDays, CheckCircle2, Clock3, FolderKanban } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { api } from "../api";
import ExcelUpload from "../components/ExcelUpload";
import AiGenerator from "../components/AiGenerator";

function isDone(task) {
  return task.status === "완료";
}

function dateOnly(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(dateText) {
  if (!dateText) return null;

  const today = new Date(todayText());
  const target = new Date(dateText);

  if (Number.isNaN(target.getTime())) return null;

  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function scheduleLabel(task) {
  if (!task.due_date) return "마감일 없음";

  const diff = daysBetween(task.due_date);

  if (isDone(task)) return "완료";
  if (diff < 0) return `${Math.abs(diff)}일 지연`;
  if (diff === 0) return "오늘 마감";
  if (diff === 1) return "내일 마감";
  return `${diff}일 남음`;
}

function scheduleColor(task) {
  const diff = daysBetween(task.due_date);

  if (isDone(task)) return "bg-emerald-50 text-emerald-700";
  if (diff !== null && diff < 0) return "bg-rose-50 text-rose-700";
  if (diff !== null && diff <= 2) return "bg-amber-50 text-amber-700";
  return "bg-blue-50 text-blue-700";
}

function ScheduleBoard({ tasks }) {
  const scheduleTasks = useMemo(() => {
    return [...tasks]
      .filter((task) => task.due_date)
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
      .slice(0, 10);
  }, [tasks]);

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">일정표</h2>
          <p className="mt-1 text-sm font-bold text-slate-400">업무 마감일과 완료 상태를 한눈에 확인합니다.</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          <CalendarDays size={20} />
        </div>
      </div>

      {scheduleTasks.length === 0 ? (
        <div className="rounded-3xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
          아직 마감일이 있는 업무가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {scheduleTasks.map((task) => (
            <div key={task.id} className="flex flex-col gap-3 rounded-3xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-black text-slate-900">{task.title}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${scheduleColor(task)}`}>
                    {scheduleLabel(task)}
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  {task.projects?.name || "프로젝트"} · 담당자 {task.assignee_name || "미배정"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2 text-sm font-black text-slate-500">
                {isDone(task) ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Clock3 size={18} />}
                {dateOnly(task.due_date)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const {
    projects,
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
      const taskPayload = await api.getTasks("all");
      setTasks(taskPayload.tasks || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks().catch((error) => showNotice(error.message));
  }, [loadTasks, showNotice]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-all-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        loadTasks().catch(console.error);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTasks]);

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
    const overdue = visibleTasks.filter((task) => {
      const diff = daysBetween(task.due_date);
      return diff !== null && diff < 0 && !isDone(task);
    }).length;
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

        <ScheduleBoard tasks={visibleTasks} />

        <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">프로젝트 요약</h2>
              <p className="mt-1 text-sm font-bold text-slate-400">생성된 프로젝트를 빠르게 확인합니다.</p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <FolderKanban size={20} />
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-3xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
              아직 프로젝트가 없습니다. 엑셀 업로드 또는 AI 생성을 먼저 진행하세요.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {projects.slice(0, 6).map((project) => {
                const count = visibleTasks.filter((task) => task.project_id === project.id).length;

                return (
                  <div key={project.id} className="rounded-3xl bg-slate-50 p-4">
                    <p className="truncate text-sm font-black text-slate-900">{project.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs font-bold text-slate-400">
                      {project.description || "프로젝트 설명 없음"}
                    </p>
                    <p className="mt-3 text-xs font-black text-blue-700">업무 {count}개</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {loading && (
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center text-sm font-black text-slate-400">
            대시보드 데이터를 불러오는 중입니다...
          </div>
        )}
      </section>

      <aside className="space-y-6">
        <AiGenerator onDone={refreshWithNotice} />

        <div className="rounded-[32px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
          <h3 className="text-lg font-black">대시보드 사용 방식</h3>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
            대시보드는 전체 현황과 일정표를 보는 화면입니다. 프로젝트별 상세 업무와 채팅은 왼쪽 프로젝트를 클릭해서 프로젝트 관리 화면에서 확인하세요.
          </p>
        </div>
      </aside>
    </div>
  );
}