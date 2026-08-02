import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useServices } from "@/hooks/useServices";
import JobMatchModal from "./JobMatchModal";
import CoverLetterModal from "./CoverLetterModal";
import QualityModal from "./QualityModal";
import JobSuggestionsModal from "./JobSuggestionsModal";
import ATSAnalyzerModal from "./ATSAnalyzerModal";
import AchievementOptimizerModal from "./AchievementOptimizerModal";
import GapDetectorModal from "./GapDetectorModal";
import InterviewAssistantModal from "./InterviewAssistantModal";
import SalaryAdvisorModal from "./SalaryAdvisorModal";
import LinkedInImportModal from "./LinkedInImportModal";
import { Wrench, Loader2, Target, Mail, ShieldCheck, Image as ImageIcon, Languages, Briefcase, Gauge, Award, CalendarRange, Mic, Wallet, Linkedin } from "lucide-react";

export default function CVTools({ data, onApply }) {
  const { toast } = useToast();
  const { llm, export: exportSvc } = useServices();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState("");

  const run = async (label, instruction, successMsg) => {
    setBusy(label);
    setOpen(false);
    try {
      const updated = await llm.transformCV(data, instruction);
      onApply(updated);
      toast({ title: successMsg });
    } catch (e) {
      toast({ title: "Kunde inte slutföra åtgärden", variant: "destructive" });
    } finally {
      setBusy("");
    }
  };

  const setLang = (lang) =>
    lang === "en"
      ? run("Översätter", "Översätt hela CV:t till engelska — alla fältens värden ska bli engelska. Bevara struktur och all information.", "Översatt till engelska")
      : run("Översätter", "Översätt hela CV:t till svenska. Bevara struktur och all information.", "Översatt till svenska");

  const setTone = (tone) => {
    const map = {
      formell: "Skriv om hela CV:t med en formell, traditionellt professionell ton. Bevara all information.",
      direkt: "Skriv om hela CV:t med en direkt, avslappnad men professionell ton (svensk stil). Bevara all information.",
      kort: "Gör texterna i hela CV:t mer koncisa — strama formuleringar, inga utfyllnader — UTAN att ta bort fakta eller information."
    };
    if (map[tone]) run("Bearbetar", map[tone], "Ton uppdaterad");
  };

  const png = async () => {
    setOpen(false);
    setBusy("PNG");
    try {
      await exportSvc.exportPNG("cv.png");
      toast({ title: "PNG nedladdad" });
    } catch (e) {
      toast({ title: "Kunde inte exportera PNG", variant: "destructive" });
    } finally {
      setBusy("");
    }
  };

  const Item = ({ icon: Icon, label, onClick }) => (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 text-[13px] text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-right">
      <Icon className="w-4 h-4 text-slate-400" />
      <span>{label}</span>
    </button>
  );

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={!!busy}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
          <span>أدوات</span>
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-right" dir="rtl">
              <div className="px-3 pt-1.5 pb-1.5 text-[11px] text-slate-400 uppercase tracking-wide flex items-center gap-1.5"><Languages className="w-3 h-3" /> لغة السيرة</div>
              <div className="flex gap-1.5 px-2 pb-2">
                <button onClick={() => setLang("sv")} className="flex-1 text-[12px] px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">Svenska</button>
                <button onClick={() => setLang("en")} className="flex-1 text-[12px] px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">English</button>
              </div>
              <div className="px-3 pt-1 pb-1.5 text-[11px] text-slate-400 uppercase tracking-wide">نبرة الكتابة</div>
              <div className="flex gap-1.5 px-2 pb-2">
                <button onClick={() => setTone("formell")} className="flex-1 text-[12px] px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">Formell</button>
                <button onClick={() => setTone("direkt")} className="flex-1 text-[12px] px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">Direkt</button>
                <button onClick={() => setTone("kort")} className="flex-1 text-[12px] px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">Kort</button>
              </div>
              <div className="h-px bg-slate-100 my-1" />
              <Item icon={Briefcase} label="وظائف مقترحة (سويدية)" onClick={() => { setModal("jobsugg"); setOpen(false); }} />
              <Item icon={Target} label="مطابقة إعلان وظيفي" onClick={() => { setModal("job"); setOpen(false); }} />
              <Item icon={Mail} label="رسالة مقدمة (Personligt brev)" onClick={() => { setModal("cover"); setOpen(false); }} />
              <Item icon={CalendarRange} label="كشف فجوات التوظيف" onClick={() => { setModal("gap"); setOpen(false); }} />
              <Item icon={Award} label="مُحسّن الإنجازات" onClick={() => { setModal("achieve"); setOpen(false); }} />
              <Item icon={Mic} label="مساعد المقابلات" onClick={() => { setModal("interview"); setOpen(false); }} />
              <Item icon={Wallet} label="مستشار الرواتب (السويد)" onClick={() => { setModal("salary"); setOpen(false); }} />
              <Item icon={Linkedin} label="استيراد من LinkedIn" onClick={() => { setModal("linkedin"); setOpen(false); }} />
              <Item icon={Gauge} label="محلّل توافق ATS" onClick={() => { setModal("ats"); setOpen(false); }} />
              <Item icon={ShieldCheck} label="فحص جودة النص" onClick={() => { setModal("quality"); setOpen(false); }} />
              <Item icon={ImageIcon} label="تنزيل كصورة PNG" onClick={png} />
            </div>
          </>
        )}
      </div>

      {busy && (
        <div className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-[12px] px-4 py-2 rounded-full shadow-lg inline-flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {busy}...
        </div>
      )}

      {modal === "job" && <JobMatchModal data={data} onApply={onApply} onClose={() => setModal(null)} />}
      {modal === "cover" && <CoverLetterModal data={data} onClose={() => setModal(null)} />}
      {modal === "quality" && <QualityModal data={data} onApply={onApply} onClose={() => setModal(null)} />}
      {modal === "jobsugg" && <JobSuggestionsModal data={data} onClose={() => setModal(null)} />}
      {modal === "ats" && <ATSAnalyzerModal data={data} onApply={onApply} onClose={() => setModal(null)} />}
      {modal === "achieve" && <AchievementOptimizerModal data={data} onApply={onApply} onClose={() => setModal(null)} />}
      {modal === "gap" && <GapDetectorModal data={data} onApply={onApply} onClose={() => setModal(null)} />}
      {modal === "interview" && <InterviewAssistantModal data={data} onClose={() => setModal(null)} />}
      {modal === "salary" && <SalaryAdvisorModal data={data} onClose={() => setModal(null)} />}
      {modal === "linkedin" && <LinkedInImportModal data={data} onApply={onApply} onClose={() => setModal(null)} />}
    </>
  );
}