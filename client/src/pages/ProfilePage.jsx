import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { BadgeCheck, IdCard, Save, UserRound } from "lucide-react";
import { api } from "../api";

export default function ProfilePage() {
  const { session, profile, setProfile, loadProfile, notice, showNotice } = useOutletContext();
  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name || "");
    setNickname(profile?.nickname || "");
    setAvatarUrl(profile?.avatar_url || "");
  }, [profile]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!displayName.trim()) {
      showNotice("표시 이름을 입력하세요.");
      return;
    }

    setSaving(true);

    try {
      const payload = await api.updateProfile({
        display_name: displayName.trim(),
        nickname: nickname.trim(),
        avatar_url: avatarUrl.trim(),
      });

      setProfile(payload.profile);
      await loadProfile();
      showNotice(payload.message || "프로필이 저장됐습니다.");
    } catch (error) {
      showNotice(error.message);
    } finally {
      setSaving(false);
    }
  }

  const previewName = displayName || nickname || session.user.email?.split("@")[0] || "사용자";

  return (
    <div className="grid flex-1 gap-6 p-5 lg:p-8 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="space-y-6">
        {notice && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm font-black text-blue-700">
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <UserRound size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black">프로필 정보</h2>
              <p className="mt-1 text-sm font-bold text-slate-400">
                팀원 목록과 채팅에 표시되는 정보를 설정합니다.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-600">표시 이름</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="예: 임정훈"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-blue-300 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-600">닉네임</span>
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="예: 후니"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-blue-300 focus:bg-white"
              />
            </label>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-black text-slate-600">프로필 이미지 URL</span>
            <input
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="나중에 이미지 업로드 기능으로 교체 가능"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-blue-300 focus:bg-white"
            />
          </label>

          <button
            disabled={saving}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? "저장 중..." : "프로필 저장"}
          </button>
        </form>
      </section>

      <aside className="space-y-6">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <IdCard size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black">미리보기</h3>
              <p className="mt-1 text-xs font-bold text-slate-400">팀원 목록에 이렇게 표시됩니다.</p>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-lg font-black text-white">
                {previewName.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-black text-slate-900">{previewName}</p>
                <p className="mt-1 truncate text-sm font-bold text-slate-400">{session.user.email}</p>
              </div>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              <BadgeCheck size={14} />
              내 계정
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}