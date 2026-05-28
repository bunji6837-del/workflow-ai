import { NavLink, useNavigate } from "react-router-dom";
import {
  FolderKanban,
  LayoutDashboard,
  MessageSquareText,
  Plus,
  Settings,
  UsersRound,
} from "lucide-react";

function navClass({ isActive }) {
  return `flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
    isActive ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
  }`;
}

function getDisplayName(profile) {
  return profile?.display_name || profile?.nickname || profile?.email?.split("@")[0] || "내 계정";
}

export default function ProjectSidebar({ workspace, profile, projects, selectedProjectId, onSelectProject }) {
  const navigate = useNavigate();

  function handleProjectClick(projectId) {
    onSelectProject(projectId);
    navigate("/projects");
  }

  return (
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
            onClick={() => handleProjectClick("all")}
            className={`w-full truncate rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
              selectedProjectId === "all"
                ? "bg-slate-950 text-white shadow-lg shadow-slate-200"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            전체 프로젝트
          </button>

          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleProjectClick(project.id)}
              className={`w-full truncate rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                selectedProjectId === project.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {project.name}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}