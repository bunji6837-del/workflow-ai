import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

const VARIANT_STYLE = {
  danger: {
    icon: AlertTriangle,
    iconBox: "bg-rose-50 text-rose-600",
    badge: "bg-rose-50 text-rose-600",
    confirm: "bg-rose-600 text-white hover:bg-rose-700",
    title: "text-slate-950",
  },
  info: {
    icon: Info,
    iconBox: "bg-blue-50 text-blue-600",
    badge: "bg-blue-50 text-blue-600",
    confirm: "bg-blue-600 text-white hover:bg-blue-700",
    title: "text-slate-950",
  },
  success: {
    icon: CheckCircle2,
    iconBox: "bg-emerald-50 text-emerald-600",
    badge: "bg-emerald-50 text-emerald-600",
    confirm: "bg-emerald-600 text-white hover:bg-emerald-700",
    title: "text-slate-950",
  },
};

export default function ConfirmDialog({
  open,
  variant = "danger",
  title = "확인",
  description = "이 작업을 진행할까요?",
  confirmText = "확인",
  cancelText = "취소",
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const style = VARIANT_STYLE[variant] || VARIANT_STYLE.danger;
  const Icon = style.icon;

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-slate-950/35 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[32px] border border-white/70 bg-white p-6 shadow-2xl shadow-slate-900/20">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-3xl ${style.iconBox}`}>
              <Icon size={26} />
            </div>

            <div>
              <p className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${style.badge}`}>
                WorkFlow AI
              </p>
              <h3 className={`mt-2 text-xl font-black tracking-tight ${style.title}`}>
                {title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="닫기"
          >
            <X size={19} />
          </button>
        </div>

        <div className="rounded-3xl bg-slate-50 px-5 py-4 text-sm font-bold leading-6 text-slate-500">
          {description}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`h-12 rounded-2xl px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${style.confirm}`}
          >
            {loading ? "처리 중..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}