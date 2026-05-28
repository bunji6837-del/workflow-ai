import { useOutletContext } from "react-router-dom";
import { MessageSquareText } from "lucide-react";
import ChatPanel from "../components/ChatPanel";

export default function ProjectChatPage() {
  const { session, profile, projects, selectedProjectId, selectedProject, setSelectedProjectId } = useOutletContext();

  const activeProject = selectedProjectId === "all" ? null : selectedProject;

  return (
    <div className="grid flex-1 gap-6 p-5 lg:p-8 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
            <MessageSquareText size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black">채팅 프로젝트 선택</h2>
            <p className="mt-1 text-sm font-bold text-slate-400">프로젝트별 대화방으로 이동합니다.</p>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-3xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-400">
            아직 프로젝트가 없습니다. 대시보드에서 엑셀 업로드 또는 AI 생성을 먼저 진행하세요.
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className={`w-full rounded-2xl px-4 py-4 text-left transition ${
                  selectedProjectId === project.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <p className="truncate text-sm font-black">{project.name}</p>
                <p className={`mt-1 line-clamp-2 text-xs font-bold ${selectedProjectId === project.id ? "text-blue-100" : "text-slate-400"}`}>
                  {project.description || "프로젝트 설명 없음"}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        {activeProject ? (
          <ChatPanel project={activeProject} currentUser={session.user} profile={profile} fullHeight />
        ) : (
          <div className="grid min-h-[560px] place-items-center rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div>
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-3xl bg-blue-50 text-blue-700">
                <MessageSquareText size={26} />
              </div>
              <h3 className="text-xl font-black">프로젝트를 선택하세요</h3>
              <p className="mt-2 text-sm font-bold text-slate-400">왼쪽 목록에서 프로젝트를 선택하면 채팅방이 열립니다.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}