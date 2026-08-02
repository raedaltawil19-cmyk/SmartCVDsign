import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useServices } from "@/hooks/useServices";
import { X, Loader2, Award, RotateCw, Check, Wand2, Pencil, Lock, Info } from "lucide-react";

export default function AchievementOptimizerModal({ data, onApply, onClose }) {
  const { toast } = useToast();
  const { llm } = useServices();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  // choices[expIndex][bulletIndex] = "keep" | "improve" | "rewrite"
  const [choices, setChoices] = useState({});

  const analyze = useCallback(async () => {
    setBusy(true); setResult(null);
    try {
      const res = await llm.optimizeAchievements(data);
      setResult(res);
      // default all choices to "keep"
      const init = {};
      (res.experiences || []).forEach((e) => {
        init[e.index] = (e.bullets || []).map(() => "keep");
      });
      setChoices(init);
    } catch (e) {
      toast({ title: "تعذّر تحليل الإنجازات", variant: "destructive" });
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, llm, toast]);

  useEffect(() => { analyze(); /* eslint-disable-next-line */ }, []);

  const setChoice = (eIdx, bIdx, v) =>
    setChoices((s) => {
      const arr = [...(s[eIdx] || [])];
      arr[bIdx] = v;
      return { ...s, [eIdx]: arr };
    });

  const applyAll = () => {
    if (!result?.experiences) return;
    const next = { ...data };
    const updatedExp = [...(data.erfarenhet || [])];
    let changed = 0;
    (result.experiences || []).forEach((e) => {
      const exp = { ...updatedExp[e.index] };
      let beskrivning = exp.beskrivning || "";
      (e.bullets || []).forEach((b, bi) => {
        const choice = choices[e.index]?.[bi] || "keep";
        const replacement = choice === "improve" ? b.improved : choice === "rewrite" ? b.rewritten : b.text;
        if (replacement && replacement !== b.text && beskrivning.includes(b.text)) {
          beskrivning = beskrivning.replace(b.text, replacement);
          changed++;
        }
      });
      exp.beskrivning = beskrivning;
      updatedExp[e.index] = exp;
    });
    next.erfarenhet = updatedExp;
    if (changed === 0) {
      toast({ title: "لم تختر أي تحسين", description: "اختر «تحسين» أو «إعادة صياغة» للنقاط الضعيفة." });
      return;
    }
    onApply(next);
    toast({ title: "تم تحديث الإنجازات", description: `طُبّقت ${changed} تعديل على خبراتك.` });
    onClose();
  };

  const experiences = result?.experiences || [];
  const draftExp = data.erfarenhet || [];
  const hasAny = experiences.some((e) => (e.bullets || []).some((b) => b.weak));

  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
        <span className="font-medium text-slate-900 inline-flex items-center gap-2">
          <Award className="w-4 h-4 text-[#1B4FD8]" /> مُحسّن الإنجازات
        </span>
        <div className="flex items-center gap-2">
          <button onClick={analyze} disabled={busy} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
            <span className="hidden sm:inline">إعادة التحليل</span>
          </button>
          <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
            <X className="w-4 h-4" /><span>إغلاق</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-slate-100">
        <div className="max-w-2xl mx-auto space-y-5">
          {busy ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#1B4FD8]" />
              <span className="text-sm">نحلّل كل خبرة ونكتشف العبارات الضعيفة...</span>
            </div>
          ) : !result ? null : (
            <>
              <div className="text-[12px] text-slate-500 bg-[#1B4FD8]/5 border border-[#1B4FD8]/15 rounded-xl p-3 leading-relaxed">
                حلّلّا كل خبرة عمل. لكل عبارة ضعيفة يمكنك اختيار: «تحسين» (نسخة أقوى بمقياس) أو «إعادة صياغة» (صياغة أوضح) أو «إبقاء الأصل». لا نختلق أرقاماً — المكانات البيانية بين أقواس [X] لتعبئتها بنفسك.
              </div>

              {!hasAny && (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
                  <Check className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  لا توجد عبارات ضعيفة في خبراتك. ممتاز!
                </div>
              )}

              {experiences.map((e) => {
                const exp = draftExp[e.index];
                if (!exp) return null;
                const weakBullets = (e.bullets || []).map((b, bi) => ({ b, bi })).filter(({ b }) => b.weak);
                if (weakBullets.length === 0) return null;
                return (
                  <div key={e.index} className="bg-white rounded-2xl border border-slate-200 p-5">
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">{exp.roll || e.roll}</h3>
                    <div className="text-[12px] text-slate-500 mb-4">{exp.foretag} {exp.period ? `• ${exp.period}` : ""}</div>

                    <div className="space-y-3">
                      {weakBullets.map(({ b, bi }) => {
                        const choice = choices[e.index]?.[bi] || "keep";
                        return (
                          <div key={bi} className="rounded-xl border border-slate-200 p-3.5">
                            <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mb-2 inline-flex items-start gap-1.5">
                              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>{b.issue}</span>
                            </div>
                            <div className="mb-2">
                              <span className="text-[11px] text-slate-400">الأصل:</span>
                              <p className="text-[13px] text-slate-700 leading-relaxed">{b.text}</p>
                            </div>

                            {b.placeholder && (
                              <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1.5 mb-2 flex items-start gap-1.5">
                                <Pencil className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
                                <span>اقتراح مقياس: {b.placeholder}</span>
                              </div>
                            )}

                            <div className="grid grid-cols-3 gap-1.5 mb-3">
                              <button
                                onClick={() => setChoice(e.index, bi, "keep")}
                                className={`text-[12px] px-2 py-1.5 rounded-lg border inline-flex items-center justify-center gap-1.5 transition-colors ${choice === "keep" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                              >
                                <Lock className="w-3 h-3" /> الإبقاء
                              </button>
                              <button
                                onClick={() => setChoice(e.index, bi, "improve")}
                                className={`text-[12px] px-2 py-1.5 rounded-lg border inline-flex items-center justify-center gap-1.5 transition-colors ${choice === "improve" ? "bg-[#1B4FD8] text-white border-[#1B4FD8]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                              >
                                <Check className="w-3 h-3" /> تحسين
                              </button>
                              <button
                                onClick={() => setChoice(e.index, bi, "rewrite")}
                                className={`text-[12px] px-2 py-1.5 rounded-lg border inline-flex items-center justify-center gap-1.5 transition-colors ${choice === "rewrite" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                              >
                                <Wand2 className="w-3 h-3" /> إعادة صياغة
                              </button>
                            </div>

                            {choice !== "keep" && (
                              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                                <span className="text-[11px] text-slate-400">{choice === "improve" ? "بعد التحسين:" : "بعد الإعادة:"}</span>
                                <p className="text-[13px] text-slate-800 leading-relaxed">{choice === "improve" ? b.improved : b.rewritten}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {hasAny && (
                <button onClick={applyAll} className="w-full inline-flex items-center justify-center gap-1.5 text-sm px-4 py-3 rounded-xl bg-[#1B4FD8] text-white hover:bg-[#1640b0] transition-colors">
                  <Check className="w-4 h-4" /> تطبيق التحسينات المختارة
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}