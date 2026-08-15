import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Target, CornerUpLeft, FileText } from "lucide-react";
import { useServices } from "@/hooks/useServices";
import { isTailored, tailoredChildrenOf } from "@/lib/cvProfiles";

/**
 * شريط علاقة السيرة — عرض وتنقّل فقط.
 * قراءة محضة: list/get فقط، بلا create ولا update ولا remove، ولا لمس لمحتوى السيرة.
 */
export default function CVRelationBar({ cvId, meta }) {
  const navigate = useNavigate();
  const { cvRepository } = useServices();
  const [parent, setParent] = useState(null);
  const [children, setChildren] = useState([]);

  const tailored = isTailored(meta);
  const parentId = meta?.parentCvId || null;

  useEffect(() => {
    if (!cvId || !meta) return;
    let alive = true;
    (async () => {
      try {
        if (tailored) {
          if (!parentId) return;
          const rec = await cvRepository.get(parentId);
          if (alive) setParent(rec || null);
        } else {
          const list = await cvRepository.list("-updated_date");
          if (alive) setChildren(tailoredChildrenOf(list, cvId)); // أبناء هذه السيرة فقط
        }
      } catch (e) {
        // قراءة فاشلة = لا شريط، بلا أي تأثير على السيرة
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvId, tailored, parentId]);

  if (!cvId || !meta) return null;
  if (!tailored && children.length === 0) return null;

  return (
    <div dir="rtl" className="no-print shrink-0 px-4 py-2 bg-white border-b border-slate-200 flex items-center gap-3 flex-wrap text-right">
      {tailored ? (
        <>
          <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-[#D9E830] text-black font-medium">
            <Target className="w-3 h-3" />
            نسخة مخصّصة لوظيفة
          </span>
          <span className="text-xs text-slate-600 truncate max-w-[280px]">{meta.titel || "بدون عنوان"}</span>
          {parent && (
            <button onClick={() => navigate(`/builder/${parent.id}`)} className="mr-auto inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              <CornerUpLeft className="w-3.5 h-3.5" />
              العودة إلى السيرة الأساسية: {parent.titel || "بدون عنوان"}
            </button>
          )}
        </>
      ) : (
        <>
          <span className="text-[11px] text-slate-400">نسخ مخصّصة مشتقّة من هذه السيرة</span>
          <div className="flex items-center gap-2 flex-wrap">
            {children.map((c) => (
              <button key={c.id} onClick={() => navigate(`/builder/${c.id}`)} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors max-w-[240px]">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{c.titel || "نسخة مخصّصة"}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}