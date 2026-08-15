import { ExternalLink, Globe, Info } from "lucide-react";

/**
 * عرض نتائج البحث الخارجي المجهَّزة مسبقاً — **عرض فقط**.
 * لا تبحث، ولا تكتب، ولا تُنتج تأكيداً ولا CV_ACTION، ولا تُدخل شيئاً إلى السيرة.
 * محتوى المصدر يبقى بلغته الأصلية كما جُلب (بلا ترجمة)، والشرح بلغة الواجهة.
 */
const TYPE_LABEL = {
  official_authority: "جهة رسمية",
  official_document: "وثيقة رسمية",
  educational: "جهة تعليمية",
  secondary: "مصدر ثانوي",
  unknown: "مصدر غير مصنَّف"
};

const EXCERPT = 600;

export default function ResearchSourcesView({ research }) {
  if (!research) return null;

  return (
    <div className="space-y-2 mb-3">
      <div className="flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5 text-slate-400" />
        <p className="text-[11px] text-slate-400">معلومات عامة من مصادر خارجية</p>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex gap-1.5">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
        <span>
          هذه معلومات عامة عن جهة أو إجراء أو متطلب، وليست معلومة عنك ولا عن ملفك. لا تدخل سيرتك،
          ولا تُعتبر مؤكَّدة عنك، إلا إذا أكّدت أنت أدناه أنها تنطبق على حالتك.
        </span>
      </p>

      {research.status === "no_source" || research.sources.length === 0 ? (
        <p className="text-[11.5px] leading-relaxed text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          لم يُعطِ البحث الخارجي نتيجة موثوقة لهذه التوصية. يمكنك المتابعة بمعلوماتك الخاصة أدناه.
        </p>
      ) : (
        <ul className="space-y-2">
          {research.sources.map((s) => (
            <li key={s.url} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="text-[11px] font-semibold text-slate-700">بحسب {s.publisher}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${s.isPrimary ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                  {TYPE_LABEL[s.sourceType] || s.sourceType}
                  {s.isPrimary ? " · مصدر أساسي" : ""}
                </span>
              </div>

              <p className="text-[12px] font-medium text-slate-800 leading-snug" dir="auto">{s.title}</p>

              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[#000066] hover:underline break-all"
                dir="ltr"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                {s.url}
              </a>

              <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-600 whitespace-pre-wrap" dir="auto">
                {s.retrievedContent.slice(0, EXCERPT)}
                {s.retrievedContent.length > EXCERPT ? "…" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}