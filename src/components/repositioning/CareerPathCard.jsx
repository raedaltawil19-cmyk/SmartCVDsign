import { Compass, BadgeCheck, AlertTriangle } from "lucide-react";

/** مسار مهني واحد: سبب الملاءمة، المسميات المتحقق منها، الفجوات */
export default function CareerPathCard({ path }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Compass className="w-4 h-4 text-[#000066]" />
        <h3 className="text-sm font-semibold text-slate-900">{path.label}</h3>
      </div>
      {path.why && <p className="text-[13px] leading-relaxed text-slate-600 text-justify">{path.why}</p>}

      {Array.isArray(path.verifiedTitles) && path.verifiedTitles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {path.verifiedTitles.map((t, i) => (
            <a
              key={i}
              href={t.source}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 hover:border-[#000066]"
            >
              <BadgeCheck className="w-3 h-3 text-emerald-600" />
              {t.title}
            </a>
          ))}
        </div>
      )}

      {Array.isArray(path.gaps) && path.gaps.length > 0 && (
        <div className="text-[12px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-2.5">
          <div className="flex items-center gap-1.5 font-medium mb-1"><AlertTriangle className="w-3.5 h-3.5" /> فجوات يجب معرفتها</div>
          <ul className="list-disc ps-4 space-y-0.5">
            {path.gaps.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}