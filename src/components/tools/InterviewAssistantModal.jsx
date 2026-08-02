import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useServices } from "@/hooks/useServices";
import { base44 } from "@/api/base44Client";
import { X, Loader2, Mic, Link2, FileText, ChevronDown, ChevronUp, MessageSquare, Cpu, CircleHelp, HelpCircle } from "lucide-react";

const DIFFICULTIES = [
  { key: "easy", label: "Easy", sub: "مبتدئ" },
  { key: "medium", label: "Medium", sub: "متوسط" },
  { key: "advanced", label: "Advanced", sub: "متقدم" },
];

const TABS = [
  { key: "general", label: "أسئلة عامة", icon: CircleHelp },
  { key: "behavioral", label: "سلوكية", icon: MessageSquare },
  { key: "technical", label: "تقنية", icon: Cpu },
  { key: "questionsToAsk", label: "أسئلة لطرحها", icon: HelpCircle },
];

function QAItem({ item, idx }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full text-right px-3.5 py-3 flex items-start gap-2.5">
        <span className="text-[11px] font-semibold text-slate-400 mt-0.5">Q{idx + 1}</span>
        <span className="flex-1 text-[13px] font-medium text-slate-800 leading-relaxed">{item.question}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 pt-1">
          <div className="text-[11px] text-slate-400 mb-1">إجابة مقترحة:</div>
          <p className="text-[13px] text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-2.5">{item.suggestedAnswer}</p>
        </div>
      )}
    </div>
  );
}

export default function InterviewAssistantModal({ data, onClose }) {
  const { toast } = useToast();
  const { llm } = useServices();
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [fetching, setFetching] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");
  const [language, setLanguage] = useState("sv");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState("general");

  const fetchAd = async () => {
    if (!jobUrl.trim()) return;
    setFetching(true);
    try {
      const res = await base44.functions.invoke("FetchJobAd", { url: jobUrl.trim() });
      const text = res?.data?.text || res?.text || (typeof res === "string" ? res : "");
      if (text) setJobText(text);
      else toast({ title: "تعذّر جلب الإعلان", description: "الصق نص الإعلان يدوياً.", variant: "destructive" });
    } catch (e) {
      toast({ title: "تعذّر جلب الإعلان", description: "الصق نص الإعلان يدوياً.", variant: "destructive" });
    } finally {
      setFetching(false);
    }
  };

  const run = async () => {
    if (!jobText.trim() && !jobUrl.trim()) {
      toast({ title: "أضف إعلان الوظيفة أولاً", description: "الصق النص أو أدخل رابطاً.", variant: "destructive" });
      return;
    }
    setBusy(true); setResult(null);
    try {
      const res = await llm.generateInterviewPrep({
        cv: data,
        jobAd: jobText.trim() || jobUrl.trim(),
        difficulty,
        language,
      });
      if (!res || (!res.behavioral && !res.technical && !res.general && !res.questionsToAsk)) {
        toast({ title: "تعذّر توليد الأسئلة", variant: "destructive" });
      } else {
        setResult(res);
        setTab("general");
      }
    } catch (e) {
      toast({ title: "تعذّر توليد الأسئلة", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const currentList = result ? (result[tab] || []) : [];
  const counts = result ? {
    general: result.general?.length || 0,
    behavioral: result.behavioral?.length || 0,
    technical: result.technical?.length || 0,
    questionsToAsk: result.questionsToAsk?.length || 0,
  } : null;

  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
        <span className="font-medium text-slate-900 inline-flex items-center gap-2">
          <Mic className="w-4 h-4 text-[#1B4FD8]" /> مساعد المقابلات الشخصية
        </span>
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
          <X className="w-4 h-4" /><span>إغلاق</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-slate-100">
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <label className="text-sm font-medium text-slate-700 block">إعلان الوظيفة</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="رابط الإعلان..."
                  className="w-full text-[13px] border border-slate-200 rounded-xl pr-9 pl-3 py-2.5 outline-none focus:border-[#1B4FD8]"
                />
              </div>
              <button onClick={fetchAd} disabled={fetching} className="text-[13px] px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 inline-flex items-center gap-1.5">
                {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                جلب
              </button>
            </div>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                placeholder="أو الصق نص الإعلان هنا..."
                rows={4}
                className="w-full text-[13px] leading-relaxed border border-slate-200 rounded-xl pr-9 pl-3 py-2.5 outline-none focus:border-[#1B4FD8] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="text-[12px] text-slate-500 mb-1.5">مستوى الصعوبة</div>
                <div className="flex gap-1.5">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.key}
                      onClick={() => setDifficulty(d.key)}
                      className={`flex-1 text-[12px] px-2 py-1.5 rounded-lg border ${difficulty === d.key ? "bg-[#1B4FD8] text-white border-[#1B4FD8]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[12px] text-slate-500 mb-1.5">اللغة</div>
                <div className="flex gap-1.5">
                  <button onClick={() => setLanguage("sv")} className={`flex-1 text-[12px] px-2 py-1.5 rounded-lg border ${language === "sv" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>Svenska</button>
                  <button onClick={() => setLanguage("en")} className={`flex-1 text-[12px] px-2 py-1.5 rounded-lg border ${language === "en" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>English</button>
                </div>
              </div>
            </div>

            <button onClick={run} disabled={busy} className="w-full mt-1 inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-[#1B4FD8] text-white hover:bg-[#1640b0] disabled:opacity-40">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
              {busy ? "جاري التوليد..." : "ولّد أسئلة المقابلة"}
            </button>
          </div>

          {result && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex border-b border-slate-200 overflow-x-auto">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`flex-1 min-w-max text-[13px] px-3 py-3 inline-flex items-center justify-center gap-1.5 border-b-2 transition-colors ${active ? "border-[#1B4FD8] text-[#1B4FD8] font-semibold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t.label}
                      {counts && counts[t.key] > 0 && <span className="text-[10px] text-slate-400">{counts[t.key]}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="p-4 space-y-2.5 max-h-[55vh] overflow-auto">
                {tab === "questionsToAsk" ? (
                  currentList.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-8">لا توجد أسئلة.</div>
                  ) : (
                    <ul className="space-y-2">
                      {currentList.map((q, i) => (
                        <li key={i} className="text-[13px] text-slate-700 bg-slate-50 rounded-lg px-3 py-2.5 leading-relaxed flex gap-2">
                          <HelpCircle className="w-3.5 h-3.5 text-[#1B4FD8] shrink-0 mt-0.5" />
                          <span>{typeof q === "string" ? q : q.question}</span>
                        </li>
                      ))}
                    </ul>
                  )
                ) : currentList.length === 0 ? (
                  <div className="text-center text-slate-400 text-sm py-8">لا توجد أسئلة في هذا القسم.</div>
                ) : (
                  currentList.map((item, i) => <QAItem key={i} item={item} idx={i} />)
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}