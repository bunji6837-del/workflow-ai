import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { LogOut, Search } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { api } from "../api";
import ProjectSidebar from "../components/ProjectSidebar";
import PwaInstallButton from "../components/PwaInstallButton";

function titleByPath(pathname) {
  if (pathname.startsWith("/chat")) {
    return {
      eyebrow: "Project Messenger",
      title: "프로젝트 채팅",
      description: "프로젝트별로 메시지를 나누고 실시간으로 팀원과 소통합니다.",
    };
  }

  if (pathname.startsWith("/team")) {
    return {
      eyebrow: "Team Management",
      title: "팀원 관리",
      description: "워크스페이스 멤버를 확인하고 가입된 유저를 팀원으로 추가합니다.",
    };
  }

  return {
    eyebrow: "AI Collaboration Workspace",
    title: "엑셀 기반 프로젝트 자동 생성 협업툴",
    description: "엑셀 업로드, AI 생성, 업무 진행률, 프로젝트 채팅을 한 화면에서 관리합니다.",
  };
}

export default function AppShell({ session }) {
  const location = useLocation();
  const pageTitle = titleByPath(location.pathname);

  const [workspace, setWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [shellError, setShellError] = useState("");
  const noticeTimerRef = useRef(null);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const loadWorkspaceAndProjects = useCallback(async () => {
    const [workspacePayload, projectPayload] = await Promise.all([api.getWorkspace(), api.getProjects()]);

    setWorkspace(workspacePayload.workspace);
    setProjects(projectPayload.projects || []);

    if (selectedProjectId !== "all" && !(projectPayload.projects || []).some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId("all");
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadWorkspaceAndProjects().catch((error) => setShellError(error.message));
  }, [loadWorkspaceAndProjects]);

  useEffect(() => {
    const channel = supabase
      .channel("app-shell-projects")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        loadWorkspaceAndProjects().catch(console.error);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadWorkspaceAndProjects]);

  const showNotice = useCallback((message) => {
    setNotice(message);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(""), 3500);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const contextValue = {
    session,
    workspace,
    projects,
    selectedProjectId,
    selectedProject,
    setSelectedProjectId,
    query,
    setQuery,
    notice,
    showNotice,
    loadWorkspaceAndProjects,
  };

  return (
    <div className="flex min-h-screen bg-[#f4f7fb]">
      <ProjectSidebar
        workspace={workspace}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur-xl lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-black text-blue-600">{pageTitle.eyebrow}</p>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">{pageTitle.title}</h1>
              <p className="mt-1 text-sm font-bold text-slate-400">{pageTitle.description}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="업무, 담당자, 상태 검색"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold outline-none focus:border-blue-300 focus:bg-white sm:w-80"
                />
              </div>

              <PwaInstallButton />

              <button
                onClick={handleLogout}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white"
              >
                <LogOut size={18} />
                로그아웃
              </button>
            </div>
          </div>
        </header>

        {shellError && (
          <div className="mx-5 mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-black text-rose-700 lg:mx-8">
            {shellError}
          </div>
        )}

        <Outlet context={contextValue} />
      </main>
    </div>
  );
}
