import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import CVPreview from "@/components/CVPreview";
import { normalizeLayout } from "@/lib/cvModel";

export default function SharedCV() {
  const { token } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    base44.entities.SharedCV.filter({ token }, "-created_date", 1).then((rows) => setRecord(rows?.[0] || null)).catch(() => setRecord(null)).finally(() => setLoading(false));
  }, [token]);
  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-100"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>;
  if (!record) return <div className="min-h-screen grid place-items-center bg-slate-100 text-slate-500">هذه السيرة غير متاحة أو أن الرابط غير صحيح.</div>;
  const layout = normalizeLayout(record.layout, record.templateId);
  return <div className="min-h-screen bg-slate-100 py-8 px-4"><div className="mx-auto w-fit bg-white shadow-xl"><CVPreview templateId={record.templateId} data={record.data} editable={false} actions={{}} layout={layout} /></div></div>;
}