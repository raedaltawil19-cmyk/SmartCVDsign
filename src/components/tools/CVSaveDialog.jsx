import { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";

export default function CVSaveDialog({ defaultTitel, saving, onSave, onClose }) {
  const [name, setName] = useState(defaultTitel || "");

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    onSave(name.trim() || "Min CV", "save");
  };

  const saveAsNewVersion = () => {
    onSave(name.trim() || "Min CV", "new_version");
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-slate-900">حفظ السيرة</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-[12px] text-slate-500 mb-3">أعطِ هذه النسخة اسماً لتجدها لاحقاً في "سيري المحفوظة".</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          placeholder="مثال: Frontend — IKEA"
          className="w-full text-[14px] border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#1B4FD8] focus:ring-2 focus:ring-[#1B4FD8]/10"
        />
        <div className="flex gap-2 justify-end mt-4">
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">إلغاء</button>
          <button type="button" onClick={saveAsNewVersion} disabled={saving} className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40">
            حفظ كنسخة جديدة
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-[#1B4FD8] text-white hover:bg-[#1640b0] disabled:opacity-40">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "نحفظ..." : "حفظ"}
          </button>
        </div>
      </form>
    </div>
  );
}