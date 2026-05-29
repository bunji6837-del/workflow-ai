import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { BadgeCheck, Camera, IdCard, ImagePlus, Save, UploadCloud, UserRound, X } from "lucide-react";
import { api } from "../api";

function emailId(email) {
  return String(email || "user").split("@")[0] || "user";
}

function mainName(profile, session, nickname, displayName) {
  return nickname || profile?.nickname || displayName || profile?.display_name || emailId(session.user.email);
}

export default function ProfilePage() {
  const { session, profile, setProfile, loadProfile, notice, showNotice } = useOutletContext();

  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    setDisplayName(profile?.display_name || "");
    setNickname(profile?.nickname || "");
    setAvatarUrl(profile?.avatar_url || "");
    setAvatarPreview(profile?.avatar_url || "");
    setAvatarFile(null);
  }, [profile]);

  function pickFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showNotice("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleFileInput(event) {
    const file = event.target.files?.[0];
    pickFile(file);
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);

    const file = event.dataTransfer.files?.[0];
    pickFile(file);
  }

  function clearAvatarFile() {
    setAvatarFile(null);
    setAvatarPreview(avatarUrl || profile?.avatar_url || "");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!displayName.trim() && !nickname.trim()) {
      showNotice("표시 이름 또는 닉네임 중 하나는 입력하세요.");
      return;
    }

    setSaving(true);

    try {
      let nextAvatarUrl = avatarUrl.trim();

      if (avatarFile) {
        const uploaded = await api.uploadAvatar(avatarFile);
        nextAvatarUrl = uploaded.avatar_url;
      }

      const payload = await api.updateProfile({
        display_name: displayName.trim(),
        nickname: nickname.trim(),
        avatar_url: nextAvatarUrl,
      });

      setProfile(payload.profile);
      await loadProfile();
      showNotice(payload.message || "프로필이 저장됐습니다.");
      setAvatarFile(null);
    } catch (error) {
      showNotice(error.message);
    } finally {
      setSaving(false);
    }
  }

  const previewName = mainName(profile, session, nickname, displayName);
  const previewId = emailId(session.user.email);

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
                팀원 목록과 채팅에 표시되는 이름과 이미지를 설정합니다.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-600">표시 이름</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="예: hoony6837"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-blue-300 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-600">닉네임 / 실명</span>
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="예: 정훈"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-blue-300 focus:bg-white"
              />
            </label>
          </div>

          <div className="mt-6">
            <span className="mb-2 block text-sm font-black text-slate-600">프로필 이미지</span>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`rounded-[28px] border-2 border-dashed p-5 transition ${
                dragging ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center">
                <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl bg-blue-600 text-3xl font-black text-white">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar preview" className="h-full w-full object-cover" />
                  ) : (
                    previewName.slice(0, 1)
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-700">
                    이미지를 여기로 끌어다 놓거나 버튼으로 선택하세요.
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    PNG, JPG, WEBP, GIF 가능 / 최대 5MB
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-blue-700 shadow-sm"
                    >
                      <ImagePlus size={17} />
                      이미지 선택
                    </button>

                    {avatarFile && (
                      <button
                        type="button"
                        onClick={clearAvatarFile}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-500 shadow-sm"
                      >
                        <X size={17} />
                        선택 취소
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </div>
              </div>
            </div>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-black text-slate-600">이미지 URL 직접 입력</span>
            <input
              value={avatarUrl}
              onChange={(event) => {
                setAvatarUrl(event.target.value);
                if (!avatarFile) setAvatarPreview(event.target.value);
              }}
              placeholder="URL로 직접 넣고 싶을 때만 사용"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-blue-300 focus:bg-white"
            />
          </label>

          <button
            disabled={saving}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {saving ? <UploadCloud size={18} /> : <Save size={18} />}
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
              <p className="mt-1 text-xs font-bold text-slate-400">채팅과 팀원 목록에 이렇게 표시됩니다.</p>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-blue-600 text-lg font-black text-white">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar preview" className="h-full w-full object-cover" />
                ) : (
                  previewName.slice(0, 1)
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="truncate text-base font-black text-slate-900">{previewName}</p>
                  <p className="truncate text-xs font-bold text-slate-400">@{previewId}</p>
                </div>
                <p className="mt-1 truncate text-sm font-bold text-slate-400">{session.user.email}</p>
              </div>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              <BadgeCheck size={14} />
              내 계정
            </div>
          </div>

          <div className="mt-5 rounded-3xl bg-slate-950 p-5 text-white">
            <div className="mb-3 flex items-center gap-2">
              <Camera size={18} />
              <h4 className="text-sm font-black">표시 규칙</h4>
            </div>
            <p className="text-sm font-semibold leading-6 text-slate-300">
              채팅에서는 닉네임/실명이 가장 크게 표시되고, 옆에 @아이디가 작고 연하게 표시됩니다.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}