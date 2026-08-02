import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { TEMPLATES } from "@/lib/cvModel";
import { FileText, Pencil, Copy, Trash2, Loader2, LogIn, FolderOpen } from "lucide-react";

export default function MyCVs() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cvs, setCvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const auth = await base44.auth.isAuthenticated();
      setAuthed(auth);
      if (!auth) { setLoading(false); return; }
      const list = await base44.entities.SavedCV.list("-updated_date", 50);
      setCvs(list || []);
    } catch (e) {
      setCvs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const duplicate = async (cv) => {
    try {
      await base44.entities.SavedCV.create({
        titel: `${cv.titel || "CV"} (kopia)`,
        data: cv.data,
        templateId: cv.templateId,
        layout: cv.layout
      });
      toast({ title: "تم نسخ السيرة" });
      load();
    } catch (e) {
      toast({ title: "تعذّر النسخ", variant: "destructive" });
    }
  };

  const remove = async (cv) => {
    if (!window.confirm(`حذف "${cv.titel || "CV"}"؟ لا يمكن التراجع.`)) return;
    try {
      await base44.entities.SavedCV.delete(cv.id);
      toast({ title: "تم الحذف" });
      load();
    } catch (e) {
      toast({ title: "تعذّر الحذف", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <section className="mb-10 flex items-center gap-2 text-slate-400 text-sm justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin" /> نحمل سيرك المحفوظة...
      </section>
    );
  }

  if (!authed) {
    return (
      <section className="mb-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-3 justify-center text-center">
          <FolderOpen className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-600">سجّل الدخول لعرض سيرك المحفوظة ومتابعة تحريرها.</span>
          <button onClick={() => base44.auth.redirectToLogin("/")} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-[#1B4FD8] text-white hover:bg-[#1640b0]">
            <LogIn className="w-4 h-4" /> تسجيل الدخول
          </button>
        </div>
      </section>
    );
  }

  if (cvs.length === 0) return null;

  const tplName = (id) => (TEMPLATES.find((t) => t.id === id) || {}).namn || id;

  return (
    <section className="mb-10">
      <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-400 mb-4 text-center">سيري المحفوظة</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cvs.map((cv) => (
          <div key={cv.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1B4FD8]/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#1B4FD8]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 truncate">{cv.titel || "CV utan titel"}</div>
              <div className="text-[12px] text-slate-500 mt-0.5">
                {tplName(cv.templateId)} · {cv.updated_date ? new Date(cv.updated_date).toLocaleDateString("sv-SE") : ""}
              </div>
              <div className="flex items-center gap-1 mt-2">
                <button onClick={() => navigate(`/builder/${cv.id}`)} className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg bg-[#1B4FD8] text-white hover:bg-[#1640b0]">
                  <Pencil className="w-3.5 h-3.5" /> تحرير
                </button>
                <button onClick={() => duplicate(cv)} className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50">
                  <Copy className="w-3.5 h-3.5" /> نسخ
                </button>
                <button onClick={() => remove(cv)} className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200">
                  <Trash2 className="w-3.5 h-3.5" /> حذف
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}