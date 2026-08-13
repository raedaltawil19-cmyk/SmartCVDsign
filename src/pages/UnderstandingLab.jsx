import { useState } from "react";
import { useParams } from "react-router-dom";
import { emptyCV, mergeCV } from "@/lib/cvModel";
import { buildCVIndex, summarizeIndex } from "@/lib/agent/cvIndex";
import { understandCommand } from "@/lib/agent/understandCommand";
import { useServices } from "@/hooks/useServices";
import UnderstandingResult from "@/components/agent/UnderstandingResult";
import { Loader2, Play, Download } from "lucide-react";

const TESTS = [
  "وين خبرة Arbetsförmedlingen؟",
  "شو مكتوب بوصفها؟",
  "اختصر وصفet تبع Arbetsförmedlingen وخليه mer professionellt",
  "الخبرة اللي بعدها شو اسم الشركة؟",
  "اللي قبلها انقلها فوق",
  "احذفها",
  "gör beskrivningen för Arbetsförmedlingen كورت وواضح mer professionellt"
];

export default function UnderstandingLab() {
  const { cvId } = useParams();
  const { cvRepository } = useServices();
  const [data, setData] = useState(emptyCV);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [input, setInput] = useState("");
  const [lastItemRef, setLastItemRef] = useState(null);

  const index = buildCVIndex(data);

  const loadCV = async () => {
    setLoading(true);
    try {
      const list = cvId ? [await cvRepository.get(cvId)] : await cvRepository.list();
      const rec = list?.[0];
      if (rec?.data) setData(mergeCV(rec.data));
    } finally {
      setLoading(false);
    }
  };

  const run = async (message, history, prevRef) => {
    const res = await understandCommand({ data, message, history, lastItemRef: prevRef });
    return res;
  };

  const runOne = async (message) => {
    setRunning(true);
    try {
      const history = log.flatMap((l) => [{ role: "user", content: l.message }, { role: "assistant", content: l.result.understanding }]);
      const res = await run(message, history, lastItemRef);
      if (res.target?.ref) setLastItemRef(res.target.ref);
      setLog((l) => [...l, { message, result: res }]);
    } finally {
      setRunning(false);
    }
  };

  const runAll = async () => {
    setRunning(true);
    setLog([]);
    setLastItemRef(null);
    try {
      let history = [];
      let ref = null;
      const out = [];
      for (const message of TESTS) {
        const res = await run(message, history, ref);
        if (res.target?.ref) ref = res.target.ref;
        history = [...history, { role: "user", content: message }, { role: "assistant", content: res.understanding }];
        out.push({ message, result: res });
        setLog([...out]);
      }
      setLastItemRef(ref);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <header>
          <h1 className="text-xl font-semibold text-slate-900">مختبر الفهم — المرحلة الأولى</h1>
          <p className="text-[13px] text-slate-500 mt-1">قراءة وفهم فقط. لا يُنفَّذ أي تعديل على السيرة.</p>
        </header>

        <div className="flex flex-wrap gap-2">
          <button onClick={loadCV} disabled={loading} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            تحميل سيرة محفوظة
          </button>
          <button onClick={runAll} disabled={running} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-[#000066] text-white disabled:opacity-50">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            تشغيل الأوامر السبعة
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-[13px] font-semibold text-slate-700 mb-2">المعرفات الثابتة الحالية</h2>
          <pre dir="ltr" className="text-[11px] leading-relaxed text-slate-600 overflow-x-auto">{JSON.stringify(summarizeIndex(index), null, 1)}</pre>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); if (input.trim()) { runOne(input.trim()); setInput(""); } }}
          className="flex gap-2"
        >
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="اكتب أمرًا لاختبار الفهم..." className="inp flex-1" />
          <button disabled={running} className="text-sm px-4 py-2 rounded-lg border border-slate-200 bg-white">فهم</button>
        </form>

        <div className="space-y-3">
          {log.map((l, i) => (
            <div key={i} className="space-y-1.5">
              <div className="text-[13px] font-medium text-slate-900">{i + 1}. {l.message}</div>
              <UnderstandingResult result={l.result} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}