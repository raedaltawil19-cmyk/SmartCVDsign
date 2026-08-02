import { useState, useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useServices } from "@/hooks/useServices";
import { detectGaps, formatMonths, formatGapDate } from "@/lib/gapDetection";
import { X, Loader2, CalendarRange, GraduationCap, HeartHandshake, Briefcase, RefreshCw, UserCog, Sparkles, Plus, Check } from "lucide-react";

const CATEGORIES = [
  { key: "studier", label: "دراسات", rollLabel: "Studier", icon: GraduationCap },
  { key: "familj", label: "إجازة عائلية", rollLabel: "Föräldraledighet", icon: HeartHandshake },
  { key: "frilans", label: "عمل حر", rollLabel: "Frilans", icon: Briefcase },
  { key: "karriarbyte", label: "تحوّل مهني", rollLabel: "Karriärbyte", icon: RefreshCw },
  { key: "utveckling", label: "تطوّر ذاتي", rollLabel: "Personlig utveckling", icon: UserCog },
];

export default function GapDetectorModal({ data, onApply, onClose }) {
  const { toast } = useToast();
  const { llm } = useServices();
  const gaps = useMemo(() => detectGaps(data.erfarenhet), [data.erfarenhet]);

  // per-gap UI state
  const [selected, setSelected] = useState({}); // gapId -> category key
  const [custom, setCustom] = useState({});      // gapId -> custom note text
  const [generated, setGenerated] = useState({}); // gapId -> generated explanation text
  const [editing, setEditing] = useState({});     // gapId -> textarea value
  const [busy, setBusy] = useState({});          // gapId -> bool

  const erf = data.erfarenhet || [];

  const genId = (g) => `${g.afterIndex}-${g.beforeIndex}-${g.start?.getTime()}`;

  const chooseCategory = (g, key) => {
    const id = genId(g);
    setSelected((s) => ({ ...s, [id]: key }));
  };

  const runGenerate = async (g) => {
    const id = genId(g);
    const cat = selected[id];
    if (!cat) { toast({ title: "اختر نوع الفجوة أولاً", variant: "destructive" }); return; }
    const meta = cat === "custom" ? null : CATEGORIES.find((c) => c.key === cat);
    setBusy((s) => ({ ...s, [id]: true }));
    try {
      const text = await llm.generateGapExplanation({
        category: meta ? meta.rollLabel : "Annat",
        durationText: formatMonths(g.months),
        custom: cat === "custom" ? custom[id] || "" : "",
      });
      setGenerated((s) => ({ ...s, [id]: text }));
      setEditing((s) => ({ ...s, [id]: text }));
    } catch (e) {
      toast({ title: "تعذّر إنشاء الشرح", variant: "destructive" });
    } finally {
      setBusy((s) => ({ ...s, [id]: false }));
    }
  };

  const addToCV = (g) => {
    const id = genId(g);
    const cat = selected[id];
    const text = (editing[id] || "").trim();
    if (!text) { toast({ title: "أنشئ الشرح أو اكتبه أولاً", variant: "destructive" }); return; }
    let rollLabel = "Annat";
    if (cat !== "custom") {
      const meta = CATEGORIES.find((c) => c.key === cat);
      rollLabel = meta?.rollLabel || "Annat";
    } else {
      rollLabel = "Annat";
    }
    const newEntry = {
      roll: rollLabel,
      foretag: "",
      period: `${formatGapDate(g.start)} – ${formatGapDate(g.end)}`,
      beskrivning: text,
    };
    const updated = { ...data, erfarenhet: [...erf, newEntry] };
    onApply(updated);
    setGenerated((s) => ({ ...s, [id]: null }));
    setEditing((s) => ({ ...s, [id]: null }));
    setSelected((s) => ({ ...s, [id]: null }));
    setCustom((s) => ({ ...s, [id]: "" }));
    toast({ title: "أُضيفت الفجوة للسيرة", description: `${rollLabel} • ${formatMonths(g.months)}` });
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
        <span className="font-medium text-slate-900 inline-flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-[#1B4FD8]" /> كشف فجوات التوظيف
        </span>
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
          <X className="w-4 h-4" /><span>إغلاق</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-slate-100">
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="text-[12px] text-slate-500 bg-[#1B4FD8]/5 border border-[#1B4FD8]/15 rounded-xl p-3 leading-relaxed">
            حلّلنا الخط الزمني لخبراتك بالاعتماد على التواريخ. لكل فجوة تظهر مدّتها، ويمكنك إنشاء شرح احترافي لأنظمة التوظيف دون اختلاق أي وقائع.
          </div>

          {gaps.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
              <CalendarRange className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              لا توجد فجوات واضحة في خطك الزمني.
            </div>
          ) : (
            gaps.map((g) => {
              const id = genId(g);
              return (
                <div key={id} className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="text-[12px] text-slate-400">بين</div>
                      <div className="text-[13px] font-medium text-slate-800 truncate">
                        {g.after?.roll || "خبرة"} {g.after?.foretag ? `• ${g.after.foretag}` : ""}
                      </div>
                      <div className="text-[12px] text-slate-500 mt-0.5">و</div>
                      <div className="text-[13px] font-medium text-slate-800 truncate">
                        {g.before?.roll || "خبرة"} {g.before?.foretag ? `• ${g.before.foretag}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-center">
                      <div className="inline-flex items-center gap-1.5 text-[13px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-full">
                        <CalendarRange className="w-3.5 h-3.5" /> {formatMonths(g.months)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">{formatGapDate(g.start)} – {formatGapDate(g.end)}</div>
                    </div>
                  </div>

                  <div className="text-[12px] text-slate-600 mb-2">هل تودّ شرح هذه الفجوة؟ اختر نوعها:</div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {CATEGORIES.map((c) => {
                      const Icon = c.icon;
                      const active = selected[id] === c.key;
                      return (
                        <button
                          key={c.key}
                          onClick={() => chooseCategory(g, c.key)}
                          className={`text-[12px] px-2.5 py-1.5 rounded-lg border inline-flex items-center gap-1.5 transition-colors ${active ? "bg-[#1B4FD8] text-white border-[#1B4FD8]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                        >
                          <Icon className="w-3.5 h-3.5" /> {c.label}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => chooseCategory(g, "custom")}
                      className={`text-[12px] px-2.5 py-1.5 rounded-lg border inline-flex items-center gap-1.5 transition-colors ${selected[id] === "custom" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> مخصّص
                    </button>
                  </div>

                  {selected[id] === "custom" && (
                    <input
                      value={custom[id] || ""}
                      onChange={(e) => setCustom((s) => ({ ...s, [id]: e.target.value }))}
                      placeholder="اكتب ملاحظة قصيرة وسنصوغها باحترافية..."
                      className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2 mb-2 outline-none focus:border-[#1B4FD8]"
                    />
                  )}

                  {selected[id] && (
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => runGenerate(g)}
                        disabled={busy[id]}
                        className="inline-flex items-center gap-1.5 text-[13px] px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
                      >
                        {busy[id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {generated[id] ? "أعد الإنشاء" : "أنشئ شرحاً احترافياً"}
                      </button>
                    </div>
                  )}

                  {(generated[id] || editing[id]) && !busy[id] && (
                    <textarea
                      value={editing[id] || ""}
                      onChange={(e) => setEditing((s) => ({ ...s, [id]: e.target.value }))}
                      rows={3}
                      className="w-full text-[13px] leading-relaxed border border-slate-200 rounded-xl p-3 outline-none focus:border-[#1B4FD8] resize-none"
                      placeholder="الشرح المُنشأ يظهر هنا — عدّله كما تشاء"
                    />
                  )}

                  {(generated[id] || editing[id]) && (
                    <button
                      onClick={() => addToCV(g)}
                      className="mt-2 w-full inline-flex items-center justify-center gap-1.5 text-[13px] px-4 py-2.5 rounded-xl bg-[#1B4FD8] text-white hover:bg-[#1640b0] transition-colors"
                    >
                      <Plus className="w-4 h-4" /> أضف هذا الشرح إلى سيرتي
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}