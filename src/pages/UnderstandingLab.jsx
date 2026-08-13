import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { mergeCV } from "@/lib/cvModel";
import { buildCVIndex, summarizeIndex } from "@/lib/agent/cvIndex";
import { useServices } from "@/hooks/useServices";
import AgentChatPanel from "@/components/agent/AgentChatPanel";
import { Loader2 } from "lucide-react";

export default function UnderstandingLab() {
  const { cvId } = useParams();
  const { cvRepository } = useServices();
  const [cvs, setCvs] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (cvId) {
          const rec = await cvRepository.get(cvId);
          setCvs(rec ? [rec] : []);
          if (rec?.data) setData(mergeCV(rec.data));
        } else {
          const list = await cvRepository.list();
          setCvs(list || []);
          if (list?.[0]?.data) setData(mergeCV(list[0].data));
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvId]);

  const pick = (rec) => setData(rec?.data ? mergeCV(rec.data) : null);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <header>
          <h1 className="text-xl font-semibold text-slate-900">مختبر الوكيل — وضع القراءة فقط</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            الوكيل يقرأ سيرتك الحقيقية ويفهم الأوامر، لكنه لا يملك أي صلاحية تعديل أو حذف أو نقل في هذه المرحلة.
          </p>
        </header>

        {loading && (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> جارٍ تحميل سيرتك...
          </div>
        )}

        {!loading && cvs.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
            لا توجد سيرة محفوظة بعد. احفظ سيرة من صفحة المحرر ثم عد إلى هنا.
          </div>
        )}

        {!loading && cvs.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {cvs.map((rec) => (
              <button key={rec.id} onClick={() => pick(rec)} className="text-[12px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
                {rec.titel || "بدون عنوان"}
              </button>
            ))}
          </div>
        )}

        <AgentChatPanel data={data} disabled={!data} />

        {data && (
          <details className="rounded-xl border border-slate-200 bg-white p-4">
            <summary className="text-[13px] font-semibold text-slate-700 cursor-pointer">المعرفات الثابتة في سيرتك</summary>
            <pre dir="ltr" className="mt-2 text-[11px] leading-relaxed text-slate-600 overflow-x-auto">
              {JSON.stringify(summarizeIndex(buildCVIndex(data)), null, 1)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}