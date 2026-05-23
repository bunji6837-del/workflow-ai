import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Mail, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { api } from "../api";

function roleBadge(role) {
  if (role === "owner") return "bg-slate-950 text-white";
  if (role === "admin") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

export default function TeamPage() {
  const { workspace, notice, showNotice } = useOutletContext();
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const ownerCount = useMemo(() => members.filter((member) => member.role === "owner").length, [members]);

  async function loadMembers() {
    setLoading(true);

    try {
      const payload = await api.getMembers();
      setMembers(payload.members || []);
    } catch (error) {
      showNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim()) {
      showNotice("추가할 팀원의 이메일을 입력하세요.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await api.addMember(email.trim(), role);
      setEmail("");
      showNotice(result.message || "팀원이 추가됐습니다.");
      await loadMembers();
    } catch (error) {
      showNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid flex-1 gap-6 p-5 lg:p-8 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="space-y-6">
        {notice && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm font-black text-blue-700">
            {notice}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-slate-400">워크스페이스</p>
            <p className="mt-3 truncate text-2xl font-black tracking-tight">{workspace?.name || "workspace"}</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-slate-400">전체 팀원</p>
            <p className="mt-3 text-3xl font-black tracking-tight">{members.length}</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-slate-400">Owner</p>
            <p className="mt-3 text-3xl font-black tracking-tight">{ownerCount}</p>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">팀원 목록</h2>
              <p className="mt-1 text-sm font-bold text-slate-400">현재 워크스페이스에 들어온 멤버입니다.</p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <UsersRound size={20} />
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">팀원 목록을 불러오는 중입니다...</div>
          ) : members.length === 0 ? (
            <div className="rounded-3xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">아직 팀원이 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex flex-col gap-3 rounded-3xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-700 shadow-sm">
                      <Mail size={19} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">{member.email || "이메일 확인 불가"}</p>
                      <p className="mt-1 truncate text-xs font-bold text-slate-400">user_id: {member.user_id}</p>
                    </div>
                  </div>

                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${roleBadge(member.role)}`}>
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-6">
        <form onSubmit={handleSubmit} className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black">팀원 추가</h3>
              <p className="mt-1 text-xs font-bold text-slate-400">이미 회원가입한 이메일만 추가됩니다.</p>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-600">이메일</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="member@example.com"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-blue-300 focus:bg-white"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-black text-slate-600">권한</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-blue-300 focus:bg-white"
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
          </label>

          <button
            disabled={submitting}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            <ShieldCheck size={18} />
            {submitting ? "추가 중..." : "팀원 추가"}
          </button>
        </form>

        <div className="rounded-[32px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
          <h3 className="text-lg font-black">팀원 추가 방식</h3>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
            지금 버전은 이메일 초대 메일 발송이 아니라, 이미 회원가입한 계정을 워크스페이스 멤버로 추가하는 방식입니다. 추가할 사용자가 먼저 회원가입해야 합니다.
          </p>
        </div>
      </aside>
    </div>
  );
}
