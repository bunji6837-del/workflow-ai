import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FolderKanban,
  LayoutDashboard,
  MessageSquareText,
  Plus,
  Settings,
  Trash2,
  UsersRound,
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

function navClass({ isActive }) {
  return `flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
    isActive ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
  }`;
}

function getDisplayName(profile) {
  return profile?.display_name || profile?.nickname || profile?.email?.split("@")[0] || "내 계정";
}

export default function ProjectSidebar({
  workspace,
  profile,
  projects,
  selectedProjectId,
  onSelectProject,
  onDeleteProject,
  projectDeleteLoading = false,
}) {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState(null);

  function handleProjectClick(projectId) {
    onSelectProject(projectId);
    navigate("/projects");
  }

  function handleDeleteClick(event, project) {
    event.stopPropagation();
    setDeleteTarget(project);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    const success = await onDeleteProject(deleteTarget);

    if (success) {
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white px-5 py-6 lg:block">
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="flex w-full items-center gap-3 rounded-3xl text-left transition hover:bg-slate-50"
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <FolderKanban size={24} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black tracking-tight">WorkFlow AI</p>
            <p className="truncate text-xs font-bold text-slate-400">{getDisplayName(profile)} workspace</p>
          </div>
        </button>

        <nav className="mt-8 space-y-2">
          <NavLink to="/dashboard" className={navClass}>
            <LayoutDashboard size={18} />
            대시보드
          </NavLink>

          <NavLink to="/projects" className={navClass}>
            <FolderKanban size={18} />
            프로젝트 관리
          </NavLink>

          <NavLink to="/chat" className={navClass}>
            <MessageSquareText size={18} />
            프로젝트 채팅
          </NavLink>

          <NavLink to="/team" className={navClass}>
            <UsersRound size={18} />
            팀원 관리
          </NavLink>

          <NavLink to="/profile" className={navClass}>
            <Settings size={18} />
            내 프로필
          </NavLink>
        </nav>

        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Projects</p>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="grid h-7 w-7 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
              title="프로젝트 생성은 대시보드에서 진행합니다."
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleProjectClick("all")}
              className={`w-full truncate rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                selectedProjectId === "all"
                  ? "bg-slate-950 text-white shadow-lg shadow-slate-200"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              전체 프로젝트
            </button>

            {projects.map((project) => {
              const active = selectedProjectId === project.id;

              return (
                <div
                  key={project.id}
                  className={`group flex items-center gap-2 rounded-2xl transition ${
                    active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleProjectClick(project.id)}
                    className="min-w-0 flex-1 truncate px-4 py-3 text-left text-sm font-black"
                    title={project.name}
                  >
                    {project.name}
                  </button>

                  <button
                    type="button"
                    onClick={(event) => handleDeleteClick(event, project)}
                    className={`mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-xl transition ${
                      active
                        ? "text-white/80 hover:bg-white/15 hover:text-white"
                        : "text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    }`}
                    title={`${project.name} 삭제`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        variant="danger"
        title="프로젝트를 삭제할까요?"
        description={
          <div>
            <p>
              <span className="font-black text-slate-800">{deleteTarget?.name}</span> 프로젝트를 삭제합니다.
            </p>
            <p className="mt-2 text-rose-600">
              삭제하면 이 프로젝트의 업무와 채팅 메시지도 함께 삭제됩니다.
            </p>
          </div>
        }
        confirmText="삭제하기"
        cancelText="취소"
        loading={projectDeleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}