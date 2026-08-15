/**
 * عرض حزمة الأدلّة الجاهزة (evidencePack) كما جهّزها المراجع أثناء المراجعة.
 * لا اكتشاف ولا تحليل هنا — عرض فقط.
 */
const CONFIDENCE_AR = { high: "ثقة عالية", medium: "ثقة متوسطة", low: "ثقة منخفضة" };

const List = ({ title, items, tone = "slate" }) =>
  items.length === 0 ? null : (
    <div>
      <p className="text-[11px] text-slate-400 mb-1">{title}</p>
      <ul className="space-y-1">
        {items.map((v) => (
          <li key={v} className={`text-[12px] leading-relaxed px-2.5 py-1.5 rounded-lg border ${tone === "amber" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
            {v}
          </li>
        ))}
      </ul>
    </div>
  );

export default function EvidencePackView({ request }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] text-slate-400 mb-1">المشكلة</p>
        <p className="text-[12px] leading-relaxed text-slate-800">{request.problem}</p>
        {request.reason && (
          <p className="text-[11px] leading-relaxed text-slate-500 mt-1">
            لماذا اعتُبرت مشكلة: {request.reason}
            {request.confidence && ` · ${CONFIDENCE_AR[request.confidence] || request.confidence}`}
          </p>
        )}
      </div>

      <div>
        <p className="text-[11px] text-slate-400 mb-1">
          {request.sectionLabel}{request.itemLabel ? ` — ${request.itemLabel}` : ""} · النصّ الحالي
        </p>
        <p className="text-[12px] leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 whitespace-pre-wrap">
          {request.currentValue || "(فارغ)"}
        </p>
      </div>

      <List title="المعلومات الموجودة في هذا العنصر" items={request.existing} />
      <List title="معلومات مرتبطة مباشرة في سيرتك" items={request.relevant} />
      <List title="المعلومات الناقصة تحديداً" items={request.missing} tone="amber" />
    </div>
  );
}