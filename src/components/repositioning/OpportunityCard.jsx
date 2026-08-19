import { Building2, MapPin, Coins, Target, ExternalLink } from "lucide-react";

const Score = ({ label, value }) => (
  <div className="text-center">
    <div className="text-[13px] font-semibold text-slate-900">{value === null || value === undefined ? "—" : value}</div>
    <div className="text-[10px] text-slate-400">{label}</div>
  </div>
);

/** فرصة وظيفية حقيقية واحدة + مدخل إلى Job Tailor القائم */
export default function OpportunityCard({ job, onTailor }) {
  const s = job.scores || {};
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{job.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-slate-500">
            {job.company && <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{job.company}</span>}
            {job.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>}
            {job.salary?.text && <span className="inline-flex items-center gap-1"><Coins className="w-3.5 h-3.5" />{job.salary.text} <span className="text-slate-400">({job.salary.source})</span></span>}
          </div>
        </div>
        {job.rank ? <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">#{job.rank}</span> : null}
      </div>

      <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-100 rounded-xl py-2">
        <Score label="ملاءمة" value={s.fit} />
        <Score label="إمكانية" value={s.attainability} />
        <Score label="راتب" value={s.salary} />
        <Score label="قيمة مهنية" value={s.careerValue} />
      </div>

      {Array.isArray(job.requirements?.mandatory) && job.requirements.mandatory.length > 0 && (
        <div className="text-[12px] text-slate-600">
          <span className="font-medium text-slate-800">متطلبات إلزامية: </span>
          {job.requirements.mandatory.join(" · ")}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-2 text-[12px]">
        {Array.isArray(job.strengths) && job.strengths.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-emerald-900">
            <div className="font-medium mb-1">نقاط قوتك</div>
            <ul className="list-disc ps-4 space-y-0.5">{job.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        )}
        {Array.isArray(job.gaps) && job.gaps.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 text-amber-900">
            <div className="font-medium mb-1">فجوات</div>
            <ul className="list-disc ps-4 space-y-0.5">{job.gaps.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={() => onTailor(job)} className="min-h-10 px-3 rounded-xl bg-[#000066] text-white text-[12px] font-semibold inline-flex items-center gap-1.5">
          <Target className="w-4 h-4" /> خصّص سيرتي لهذه الوظيفة
        </button>
        {job.url && (
          <a href={job.url} target="_blank" rel="noreferrer" className="min-h-10 px-3 rounded-xl border border-slate-200 text-[12px] text-slate-700 inline-flex items-center gap-1.5">
            <ExternalLink className="w-4 h-4" /> الإعلان الأصلي
          </a>
        )}
      </div>
    </div>
  );
}