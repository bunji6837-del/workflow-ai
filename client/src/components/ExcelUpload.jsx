import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, FileSpreadsheet, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { api } from "../api";

const uploadSteps = ["프로젝트명 분석", "담당자/마감일 추출", "업무 테이블 저장"];

export default function ExcelUpload({ onDone }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("프로젝트 업무표.xlsx");
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [lastResult, setLastResult] = useState(null);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setStepIndex(0);
    setLastResult(null);

    let timer = null;

    try {
      timer = window.setInterval(() => {
        setStepIndex((prev) => {
          if (prev >= uploadSteps.length - 1) return prev;
          return prev + 1;
        });
      }, 700);

      const result = await api.importExcel(file);

      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }

      setStepIndex(uploadSteps.length);
      setLastResult(result);

      await onDone(`${result.projectCount}개 프로젝트, ${result.taskCount}개 업무가 생성됐습니다.`);
    } catch (error) {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }

      setStepIndex(-1);
      setLastResult(null);
      await onDone(error.message);
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  function getStepState(index) {
    if (stepIndex === -1) return "idle";
    if (stepIndex > index) return "done";
    if (stepIndex === index) return "loading";
    return "idle";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-[32px] bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-6 text-white shadow-2xl shadow-blue-200"
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_330px] xl:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black backdrop-blur">
            <Sparkles size={17} />
            Excel to Project Automation
          </div>

          <h2 className="text-3xl font-black leading-tight md:text-4xl">
            엑셀을 올리면 프로젝트와 업무가 DB에 자동 저장됩니다.
          </h2>

          <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-blue-50">
            프로젝트명, 업무명, 담당자, 마감일, 상태, 우선순위, 진행률 컬럼을 읽어서 업무 보드와 채팅 가능한 프로젝트를 생성합니다.
          </p>

          <div className="mt-6">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
              {loading ? "업로드 처리 중..." : "엑셀 업로드"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={handleUpload}
            />
          </div>

          {lastResult && (
            <div className="mt-4 inline-flex rounded-2xl bg-white/15 px-4 py-3 text-sm font-black text-white backdrop-blur">
              생성 완료: 프로젝트 {lastResult.projectCount}개 / 업무 {lastResult.taskCount}개
            </div>
          )}
        </div>

        <div className="rounded-[28px] bg-white/95 p-4 text-slate-900 shadow-2xl shadow-blue-800/20">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <FileSpreadsheet size={23} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{fileName}</p>
              <p className="text-xs font-bold text-slate-400">xlsx / csv 지원</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {uploadSteps.map((label, index) => {
              const state = getStepState(index);

              return (
                <div key={label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-600">
                  <span>{label}</span>

                  {state === "loading" && <Loader2 size={16} className="animate-spin text-blue-600" />}
                  {state === "done" && <CheckCircle2 size={16} className="text-emerald-500" />}
                  {state === "idle" && <span className="h-2 w-2 rounded-full bg-slate-300" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}