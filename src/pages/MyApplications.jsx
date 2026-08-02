import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useServices } from "@/hooks/useServices";
import { useToast } from "@/components/ui/use-toast";
import {
  Briefcase,
  MapPin,
  ExternalLink,
  Plus,
  Loader2,
  Trash2,
  ArrowRight,
} from "lucide-react";

const STATUSES = [
  { key: "saved", label: "محفوظة", color: "slate" },
  { key: "applied", label: "تم التقديم", color: "blue" },
  { key: "interview", label: "مقابلة", color: "amber" },
  { key: "offer", label: "عرض عمل", color: "emerald" },
  { key: "rejected", label: "مرفوضة", color: "rose" },
];

const CHIP = {
  slate: "bg-slate-100 text-slate-600",
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  rose: "bg-rose-50 text-rose-700",
};

function statusMeta(key) {
  return STATUSES.find((s) => s.key === key) || STATUSES[0];
}

export default function MyApplications() {
  const { applications } = useServices();
  const { toast } = useToast();
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await applications.list();
      setItems(list);
    } catch (e) {
      toast({ title: "تعذّر تحميل الطلبات", variant: "destructive" });
      setItems([]);
    }
  }, [applications, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (item, status) => {
    setBusy(true);
    try {
      await applications.update(item.id, { status });
      setItems((arr) =>
        (arr || []).map((x) => (x.id === item.id ? { ...x, status } : x))
      );
      toast({ title: "تم تحديث الحالة" });
    } catch (e) {
      toast({ title: "تعذّر التحديث", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item) => {
    setBusy(true);
    try {
      await applications.remove(item.id);
      setItems((arr) => (arr || []).filter((x) => x.id !== item.id));
      toast({ title: "تم الحذف" });
    } catch (e) {
      toast({ title: "تعذّر الحذف", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const visible = (items || []).filter(
    (x) => filter === "all" || x.status === filter
  );

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#F5F5F5] text-slate-900"
      style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
    >
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <ArrowRight className="w-4 h-4" />
            <span>الرئيسية</span>
          </Link>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#000066]" />
            <span className="font-semibold">متتبّع الطلبات</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">طلبات التقديم</h1>
            <p className="text-slate-500 text-sm mt-1">تتبّع رحلة بحثك عن عمل في السويد</p>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-[#000066] text-white hover:bg-[#00003d] transition-colors"
          >
            <Plus className="w-4 h-4" /> إضافة يدوية
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <TabBtn active={filter === "all"} onClick={() => setFilter("all")}>
            الكل
          </TabBtn>
          {STATUSES.map((s) => (
            <TabBtn
              key={s.key}
              active={filter === s.key}
              onClick={() => setFilter(s.key)}
            >
              {s.label}
            </TabBtn>
          ))}
        </div>

        {items === null ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">لا توجد طلبات هنا بعد</p>
            <p className="text-xs mt-1">أضف وظيفة من «الوظائف المقترحة» أو يدوياً.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((item) => {
              const meta = statusMeta(item.status);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold leading-snug">{item.rubrik}</h3>
                      {item.arbetsgivare && (
                        <div className="text-[13px] text-slate-500 mt-0.5">
                          {item.arbetsgivare}
                        </div>
                      )}
                      {item.plats && (
                        <div className="text-[12px] text-slate-500 mt-1 inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {item.plats}
                        </div>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-[12px] font-medium px-2.5 py-1 rounded-full ${CHIP[meta.color]}`}
                    >
                      {meta.label}
                    </span>
                  </div>

                  {item.anteckning && (
                    <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">
                      {item.anteckning}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={item.status}
                        onChange={(e) => setStatus(item, e.target.value)}
                        disabled={busy}
                        className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-[#000066] disabled:opacity-40"
                      >
                        {STATUSES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[12px] text-[#000066] hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> الإعلان
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => remove(item)}
                      disabled={busy}
                      className="text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-40"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {adding && (
        <AddDialog
          onSave={async (payload) => {
            setBusy(true);
            try {
              await applications.create(payload);
              await load();
              toast({ title: "تمت الإضافة" });
              setAdding(false);
            } catch (e) {
              toast({ title: "تعذّر الحفظ", variant: "destructive" });
            } finally {
              setBusy(false);
            }
          }}
          onClose={() => setAdding(false)}
          busy={busy}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-[13px] px-3.5 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function AddDialog({ onSave, onClose, busy }) {
  const [form, setForm] = useState({
    rubrik: "",
    arbetsgivare: "",
    plats: "",
    url: "",
    deadline: "",
    anteckning: "",
    status: "saved",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5" dir="rtl">
        <h3 className="font-semibold mb-4">إضافة وظيفة للمتابعة</h3>
        <div className="space-y-3">
          <Field label="العنوان الوظيفي *">
            <input
              value={form.rubrik}
              onChange={(e) => set("rubrik", e.target.value)}
              className="inp"
              placeholder="t.ex. Frontend utvecklare"
            />
          </Field>
          <Field label="الشركة">
            <input
              value={form.arbetsgivare}
              onChange={(e) => set("arbetsgivare", e.target.value)}
              className="inp"
            />
          </Field>
          <Field label="الموقع">
            <input
              value={form.plats}
              onChange={(e) => set("plats", e.target.value)}
              className="inp"
              placeholder="Stockholm"
            />
          </Field>
          <Field label="رابط الإعلان">
            <input
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              className="inp"
              dir="ltr"
            />
          </Field>
          <Field label="الحالة">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="inp"
            >
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ملاحظات">
            <textarea
              value={form.anteckning}
              onChange={(e) => set("anteckning", e.target.value)}
              rows={2}
              className="inp resize-none"
            />
          </Field>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => onSave(form)}
            disabled={!form.rubrik.trim() || busy}
            className="flex-1 text-sm px-4 py-2.5 rounded-xl bg-[#000066] text-white hover:bg-[#00003d] transition-colors disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "حفظ"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm hover:bg-slate-50"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[13px] text-slate-600 mb-1 block">{label}</span>
      {children}
    </label>
  );
}