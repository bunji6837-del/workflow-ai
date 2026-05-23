import { useState } from "react";
import { motion } from "framer-motion";
import { FolderKanban, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("12345678");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const authCall =
        mode === "login"
          ? supabase.auth.signInWithPassword({ email, password })
          : supabase.auth.signUp({ email, password });

      const { error } = await authCall;

      if (error) throw error;

      setMessage(mode === "login" ? "로그인 성공" : "회원가입 완료. 이메일 확인 설정이 켜져 있으면 메일 인증 후 로그인하세요.");
    } catch (error) {
      setMessage(error.message || "처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f4f7fb] p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid w-full max-w-5xl overflow-hidden rounded-[36px] bg-white shadow-2xl shadow-slate-200 lg:grid-cols-[1fr_440px]"
      >
        <section className="hidden bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-10 text-white lg:block">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <FolderKanban size={24} />
            </div>
            <div>
              <p className="text-xl font-black">WorkFlow AI</p>
              <p className="text-sm font-bold text-blue-100">AI 협업 프로젝트 관리</p>
            </div>
          </div>

          <div className="mt-20">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black">
              <Sparkles size={17} />
              Excel to Project
            </div>
            <h1 className="text-5xl font-black leading-tight tracking-tight">
              엑셀을 올리면 프로젝트와 업무가 자동 생성됩니다.
            </h1>
            <p className="mt-6 text-base font-semibold leading-7 text-blue-50">
              담당자, 마감일, 상태, 진행률을 한 화면으로 정리하고 팀 채팅으로 바로 협업할 수 있습니다.
            </p>
          </div>
        </section>

        <section className="p-8 sm:p-10">
          <div className="mb-8">
            <p className="text-sm font-black text-blue-600">{mode === "login" ? "LOGIN" : "SIGN UP"}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">
              {mode === "login" ? "로그인" : "회원가입"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-600">이메일</span>
              <div className="flex h-13 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                <Mail size={18} className="text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="test@example.com"
                  className="h-12 flex-1 bg-transparent text-sm font-bold outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-600">비밀번호</span>
              <div className="flex h-13 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                <LockKeyhole size={18} className="text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  className="h-12 flex-1 bg-transparent text-sm font-bold outline-none"
                />
              </div>
            </label>

            {message && (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
                {message}
              </div>
            )}

            <button
              disabled={loading}
              className="h-13 w-full rounded-2xl bg-slate-950 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {loading ? "처리 중..." : mode === "login" ? "로그인하기" : "회원가입하기"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-5 w-full rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700"
          >
            {mode === "login" ? "계정이 없으면 회원가입" : "이미 계정이 있으면 로그인"}
          </button>
        </section>
      </motion.div>
    </div>
  );
}
