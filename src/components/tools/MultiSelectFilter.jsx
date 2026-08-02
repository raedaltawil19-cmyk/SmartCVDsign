import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";

/**
 * Searchable multi-select dropdown.
 * options: [{ id, label, groupLabel? }]
 * selected: string[] of ids
 */
export default function MultiSelectFilter({ label, options, selected, onChange, placeholder = "اختر...", emptyText = "لا خيارات" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((o) => (o.label || "").toLowerCase().includes(q)) : options;
    return list.sort((a, b) => (a.groupLabel || "").localeCompare(b.groupLabel || "", "sv") || a.label.localeCompare(b.label, "sv"));
  }, [options, query]);

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const count = selected.length;

  return (
    <div className="relative" ref={ref}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-between text-[13px] border border-slate-200 rounded-xl px-3 py-2.5 bg-white hover:bg-slate-50 transition-colors"
      >
        <span className={count ? "text-slate-900" : "text-slate-400"}>
          {count ? `${count} محدّد` : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {count > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.slice(0, 4).map((id) => {
            const o = options.find((x) => x.id === id);
            if (!o) return null;
            return (
              <span key={id} className="inline-flex items-center gap-1 text-[11px] bg-[#1B4FD8]/8 text-[#0f3db0] px-1.5 py-0.5 rounded-md">
                {o.label}
                <button onClick={() => toggle(id)} className="hover:text-[#1B4FD8]"><X className="w-3 h-3" /></button>
              </span>
            );
          })}
          {count > 4 && <span className="text-[11px] text-slate-400">+{count - 4}</span>}
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg p-2" dir="rtl">
          <div className="relative mb-2">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث..."
              className="w-full text-[12px] border border-slate-200 rounded-lg pr-8 pl-2 py-1.5 outline-none focus:border-[#1B4FD8]"
            />
          </div>
          <div className="max-h-56 overflow-auto">
            {filtered.length === 0 && <div className="text-[12px] text-slate-400 text-center py-3">{emptyText}</div>}
            {filtered.map((o) => {
              const sel = selected.includes(o.id);
              return (
                <button
                  key={o.id}
                  onClick={() => toggle(o.id)}
                  className="w-full flex items-center gap-2 text-right px-2 py-1.5 rounded-lg hover:bg-slate-50 text-[12px]"
                >
                  <span className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${sel ? "bg-[#1B4FD8] border-[#1B4FD8]" : "border-slate-300"}`}>
                    {sel && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-slate-700 truncate">{o.label}</span>
                    {o.groupLabel && <span className="block text-[10px] text-slate-400 truncate">{o.groupLabel}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          {count > 0 && (
            <button onClick={() => onChange([])} className="w-full text-[11px] text-slate-500 hover:text-slate-700 pt-1.5">مسح الكل</button>
          )}
        </div>
      )}
    </div>
  );
}