import { useState, useEffect, useRef } from "react";
import CVPreview from "./CVPreview";

const A4_W = 794;
const A4_H = 1123;

/**
 * Continuous-flow pagination engine (CSS Paged Media standard).
 *
 * Preview: renders ONE continuous sheet with visual page-boundary overlays
 *   at A4_H intervals — content flows naturally across boundaries, exactly
 *   as the browser will paginate it in print.
 * Print:   a single continuous flow; the browser paginates with CSS break
 *   rules (break-after: avoid on headings, orphans/widows, etc.) defined
 *   in index.css. No JS clipping, no isolated page containers.
 */
export default function CVPages({ templateId, data, editable, actions, layout, mode }) {
  const flowRef = useRef(null);
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    if (mode === "edit") return;
    const el = flowRef.current;
    if (!el) return;
    const measure = () => {
      const total = el.scrollHeight;
      setPageCount(Math.max(1, Math.ceil(total / A4_H)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data, templateId, layout, mode]);

  // ── Edit mode: single page, boundary line handled by Builder.jsx ──
  if (mode === "edit") {
    return (
      <div className="bg-white shadow-2xl" style={{ width: A4_W, minHeight: A4_H }}>
        <CVPreview templateId={templateId} data={data} editable actions={actions} layout={layout} />
      </div>
    );
  }

  // ── Preview + Print: continuous flow ──
  return (
    <>
      {/* Preview: one continuous sheet with page-boundary overlay lines */}
      <div className="no-print relative" style={{ width: A4_W }}>
        <div ref={flowRef} className="bg-white shadow-2xl relative" style={{ width: A4_W }}>
          <CVPreview templateId={templateId} data={data} editable={false} actions={actions} layout={layout} />
          {Array.from({ length: pageCount - 1 }, (_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 pointer-events-none flex items-center"
              style={{ top: (i + 1) * A4_H }}
            >
              <div className="flex-1 border-t-2 border-dashed border-slate-300" />
              <span className="text-[9px] text-slate-400 bg-white px-1.5 -mt-3 whitespace-nowrap">
                Sida {i + 2}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Print: single continuous flow — browser paginates via CSS break rules */}
      <div className="cv-print-area hidden print:block bg-white" style={{ width: A4_W }}>
        <CVPreview templateId={templateId} data={data} editable={false} actions={actions} layout={layout} />
      </div>
    </>
  );
}