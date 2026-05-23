import { useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "../api";

export default function AiGenerator({ onDone }) {
  const [text, setText] = useState(`프로젝트: 신규 쇼핑몰 런칭
상품 등록, 정훈, 2026-06-03, 진행중, 높음, 40
메인 배너 제작, 민지, 2026-06-05, 대기, 보통, 0
결제 테스트, 현우, 2026-06-08, 대기, 높음, 0`);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);

    try {
      const result = await api.generateAi(text);
      await onDone(`${result.mode} 방식으로 ${result.projectCount}개 프로젝트, ${result.taskCount}개 업무가 생성됐습니다.`);
    } catch (error) {
      await onDone(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[32px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-blue-200">
          <Sparkles size={21} />
        </div>
        <div>
          <h3 className="text-lg font-black">AI 자동 생성</h3>
          <p className="text-xs font-bold text-slate-400">OpenAI 키 없으면 규칙 기반으로 생성</p>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={7}
        className="w-full resize-none rounded-3xl border border-white/10 bg-white/10 p-4 text-sm font-semibold leading-6 text-white outline-none placeholder:text-slate-500"
        placeholder="프로젝트 설명 또는 업무 목록을 입력하세요."
      />

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 disabled:opacity-60"
      >
        {loading ? "생성 중..." : "AI로 프로젝트 생성"}
      </button>
    </div>
  );
}
