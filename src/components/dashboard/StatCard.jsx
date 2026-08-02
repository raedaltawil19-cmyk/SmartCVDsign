import { Loader2 } from "lucide-react";

export default function StatCard({ icon: Icon, label, value, sub, tone = "slate", loading }) {
  const tones = {
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    blue: "bg-[#1B4FD8]/8 text-[#0f3db0] border-[#1B4FD8]/15",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-slate-500">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${tones[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900 tabular-nums">
        {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-300" /> : value}
      </div>
      {sub && <div className="text-[11px] text-slate-400 leading-snug">{sub}</div>}
    </div>
  );
}