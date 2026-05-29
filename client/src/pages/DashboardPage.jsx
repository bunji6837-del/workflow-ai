import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FolderKanban,
  Maximize2,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { api } from "../api";
import ExcelUpload from "../components/ExcelUpload";
import AiGenerator from "../components/AiGenerator";

const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];

function isDone(task) {
  return task.status === "완료";
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateOnly(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function todayKey() {
  return dateKey(new Date());
}

function daysBetween(dateText) {
  if (!dateText) return null;

  const today = new Date(todayKey());
  const target = new Date(dateText);

  if (Number.isNaN(target.getTime())) return null;

  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function scheduleLabel(task) {
  if (!task.due_date) return "마감일 없음";

  const diff = daysBetween(task.due_date);

  if (isDone(task)) return "완료";
  if (diff < 0) return `${Math.abs(diff)}일 지연`;
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";

  return `${diff}일 남음`;
}

function scheduleColor(task) {
  const diff = daysBetween(task.due_date);

  if (isDone(task)) return "bg-emerald-50 text-emerald-700";
  if (diff !== null && diff < 0) return "bg-rose-50 text-rose-700";
  if (diff !== null && diff <= 2) return "bg-amber-50 text-amber-700";

  return "bg-blue-50 text-blue-700";
}

function buildCalendarDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const startDate = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      date,
      key: dateKey(date),
      isCurrentMonth: date.getMonth() === month,
      isToday: dateKey(date) === todayKey(),
    };
  });
}

function clampTooltipPosition(clientX, clientY) {
  const tooltipWidth = 320;
  const tooltipHeight = 260;
  const margin = 18;

  let x = clientX + 16;
  let y = clientY + 16;

  if (typeof window !== "undefined") {
    if (x + tooltipWidth > window.innerWidth - margin) {
      x = clientX - tooltipWidth - 16;
    }

    if (y + tooltipHeight > window.innerHeight - margin) {
      y = clientY - tooltipHeight - 16;
    }

    if (x < margin) x = margin;
    if (y < margin) y = margin;
  }

  return { x, y };
}

function CalendarTooltip({ hoverInfo }) {
  if (!hoverInfo?.visible || !hoverInfo.tasks?.length) return null;

  return (
    <div
      className="pointer-events-none fixed z-[80] w-[320px] rounded-[24px] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-300/40"
      style={{
        left: hoverInfo.x,
        top: hoverInfo.y,
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-slate-900">{hoverInfo.date}</p>
          <p className="mt-1 text-xs font-bold text-slate-400">
            이 날짜의 일정 {hoverInfo.tasks.length}개
          </p>
        </div>

        <div className="grid h-9 w-9 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          <CalendarDays size={17} />
        </div>
      </div>

      <div className="max-h-[210px] space-y-2 overflow-hidden">
        {hoverInfo.tasks.slice(0, 5).map((task) => (
          <div key={task.id} className="rounded-2xl bg-slate-50 px-3 py-2">
            <div className="mb-1 flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">
                {task.title}
              </p>

              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${scheduleColor(task)}`}
              >
                {scheduleLabel(task)}
              </span>
            </div>

            <p className="truncate text-xs font-bold text-slate-400">
              {task.projects?.name || "프로젝트"} · 담당자 {task.assignee_name || "미배정"}
            </p>
          </div>
        ))}

        {hoverInfo.tasks.length > 5 && (
          <p className="px-2 text-xs font-black text-slate-400">
            +{hoverInfo.tasks.length - 5}개 일정 더 있음
          </p>
        )}
      </div>
    </div>
  );
}

function CalendarGrid({ tasks, compact = false, onCalendarClick }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [hoverInfo, setHoverInfo] = useState({
    visible: false,
    x: 0,
    y: 0,
    date: "",
    tasks: [],
  });

  const calendarDays = useMemo(() => buildCalendarDays(viewDate), [viewDate]);

  const tasksByDate = useMemo(() => {
    const map = new Map();

    for (const task of tasks) {
      const key = dateOnly(task.due_date);
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key).push(task);
    }

    return map;
  }, [tasks]);

  function moveMonth(delta) {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    setHoverInfo((prev) => ({ ...prev, visible: false }));
  }

  function showTooltip(event, day, dayTasks) {
    if (!dayTasks.length) return;

    const position = clampTooltipPosition(event.clientX, event.clientY);

    setHoverInfo({
      visible: true,
      x: position.x,
      y: position.y,
      date: day.key,
      tasks: dayTasks,
    });
  }

  function moveTooltip(event, day, dayTasks) {
    if (!dayTasks.length) return;

    const position = clampTooltipPosition(event.clientX, event.clientY);

    setHoverInfo((prev) => ({
      ...prev,
      visible: true,
      x: position.x,
      y: position.y,
      date: day.key,
      tasks: dayTasks,
    }));
  }

  function hideTooltip() {
    setHoverInfo((prev) => ({ ...prev, visible: false }));
  }

  const title = `${viewDate.getFullYear()}년 ${viewDate.getMonth() + 1}월`;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            moveMonth(-1);
          }}
          className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-500 transition hover:bg-slate-100"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="rounded-2xl bg-blue-50 px-5 py-3 text-center text-sm font-black text-blue-700">
          {title}
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            moveMonth(1);
          }}
          className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-500 transition hover:bg-slate-100"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div
        onClick={compact ? onCalendarClick : undefined}
        onMouseLeave={hideTooltip}
        className={`grid grid-cols-7 gap-2 ${
          compact ? "cursor-pointer rounded-[28px] transition hover:scale-[1.01]" : ""
        }`}
        title={compact ? "달력을 클릭하면 크게 볼 수 있습니다." : undefined}
      >
        {weekLabels.map((label) => (
          <div
            key={label}
            className={`rounded-2xl bg-slate-50 text-center text-xs font-black text-slate-400 ${
              compact ? "py-2.5" : "py-3"
            }`}
          >
            {label}
          </div>
        ))}

        {calendarDays.map((day) => {
          const dayTasks = tasksByDate.get(day.key) || [];
          const hasTasks = dayTasks.length > 0;

          return (
            <div
              key={day.key}
              onMouseEnter={(event) => showTooltip(event, day, dayTasks)}
              onMouseMove={(event) => moveTooltip(event, day, dayTasks)}
              onMouseLeave={hideTooltip}
              className={`rounded-2xl border p-2 transition ${
                compact ? "min-h-[76px]" : "min-h-[135px] p-3"
              } ${
                day.isCurrentMonth
                  ? "border-slate-200 bg-white"
                  : "border-slate-100 bg-slate-50/60"
              } ${
                hasTasks ? "hover:border-blue-300 hover:bg-blue-50/30" : ""
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className={`grid place-items-center rounded-xl text-xs font-black ${
                    compact ? "h-7 w-7" : "h-8 w-8"
                  } ${
                    day.isToday
                      ? "bg-blue-600 text-white"
                      : day.isCurrentMonth
                        ? "text-slate-700"
                        : "text-slate-300"
                  }`}
                >
                  {day.date.getDate()}
                </span>

                {hasTasks && (
                  <span className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black text-white">
                    {dayTasks.length}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {dayTasks.slice(0, compact ? 1 : 3).map((task) => (
                  <div
                    key={task.id}
                    className={`rounded-xl px-2 py-1 text-[10px] font-black ${scheduleColor(task)}`}
                  >
                    <p className="truncate">{task.title}</p>

                    {!compact && (
                      <p className="mt-0.5 truncate opacity-70">{scheduleLabel(task)}</p>
                    )}
                  </div>
                ))}

                {!compact && dayTasks.length > 3 && (
                  <p className="px-2 text-[11px] font-black text-slate-400">
                    +{dayTasks.length - 3}개 더 있음
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CalendarTooltip hoverInfo={hoverInfo} />
    </div>
  );
}

function ScheduleModal({ open, onClose, tasks }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[36px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-2xl font-black">일정표 전체 보기</h2>
            <p className="mt-1 text-sm font-bold text-slate-400">
              업무 마감일과 진행 상태를 달력에서 크게 확인합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <CalendarGrid tasks={tasks} />
        </div>
      </div>
    </div>
  );
}

function CompactScheduleBoard({ tasks }) {
  const [modalOpen, setModalOpen] = useState(false);

  const upcomingTasks = useMemo(() => {
    return [...tasks]
      .filter((task) => task.due_date)
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
      .slice(0, 5);
  }, [tasks]);

  return (
    <>
      <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex w-full items-center justify-between text-left">
          <div>
            <h2 className="text-xl font-black">일정표</h2>
            <p className="mt-1 text-sm font-bold text-slate-400">
              왼쪽 달력을 클릭하면 크게 볼 수 있습니다. 일정이 있는 날짜에 마우스를 올리면 내용을 볼 수 있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700 transition hover:bg-blue-100"
            title="일정표 크게 보기"
          >
            <Maximize2 size={19} />
          </button>
        </div>

        <div className="grid gap-5 2xl:grid-cols-[480px_minmax(0,1fr)] xl:grid-cols-[430px_minmax(0,1fr)]">
          <div className="rounded-[28px] bg-slate-50 p-4">
            <CalendarGrid
              tasks={tasks}
              compact
              onCalendarClick={() => setModalOpen(true)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock3 size={18} className="text-slate-400" />
              <h3 className="text-sm font-black text-slate-700">가까운 마감 업무</h3>
            </div>

            {upcomingTasks.length === 0 ? (
              <div className="rounded-3xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-400">
                아직 마감일이 있는 업무가 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex w-full items-center justify-between rounded-3xl bg-slate-50 px-4 py-3 text-left"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-black text-slate-900">
                          {task.title}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-black ${scheduleColor(task)}`}
                        >
                          {scheduleLabel(task)}
                        </span>
                      </div>

                      <p className="mt-1 truncate text-xs font-bold text-slate-400">
                        {task.projects?.name || "프로젝트"} · 담당자{" "}
                        {task.assignee_name || "미배정"}
                      </p>
                    </div>

                    <p className="ml-3 shrink-0 text-xs font-black text-slate-400">
                      {dateOnly(task.due_date)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ScheduleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        tasks={tasks}
      />
    </>
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
    const avg = total
      ? Math.round(
          visibleTasks.reduce((sum, task) => sum + Number(task.progress || 0), 0) /
            total
        )
      : 0;

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
            <div
              key={label}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-black text-slate-400">{label}</p>
              <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
            </div>
          ))}
        </div>

        <CompactScheduleBoard tasks={visibleTasks} />

        <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">프로젝트 요약</h2>
              <p className="mt-1 text-sm font-bold text-slate-400">
                생성된 프로젝트를 빠르게 확인합니다.
              </p>
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
                const count = visibleTasks.filter(
                  (task) => task.project_id === project.id
                ).length;

                return (
                  <div key={project.id} className="rounded-3xl bg-slate-50 p-4">
                    <p className="truncate text-sm font-black text-slate-900">
                      {project.name}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs font-bold text-slate-400">
                      {project.description || "프로젝트 설명 없음"}
                    </p>
                    <p className="mt-3 text-xs font-black text-blue-700">
                      업무 {count}개
                    </p>
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
            대시보드에서는 전체 현황과 작은 일정표를 확인합니다. 왼쪽 달력을 클릭하면 큰 달력 모달로 자세히 볼 수 있고, 일정이 있는 날짜에 마우스를 올리면 작은 미리보기 창이 표시됩니다.
          </p>
        </div>
      </aside>
    </div>
  );
}