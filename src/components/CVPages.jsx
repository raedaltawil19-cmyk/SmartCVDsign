import { useState, useEffect, useRef } from "react";
import CVPreview from "./CVPreview";

const A4_W = 794; // px at 96dpi
const A4_H = 1123;

/**
 * Continuous-flow rendering.
 * Preview: one long white sheet with dashed page-boundary markers.
 * Print:   browser-native CSS pagination — no JS clipping, no scale transforms.
 */
export default function CVPages({ templateId, data, editable, actions, layout, mode }) {
  const flowRef = useRef(null);
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    const el = flowRef.current;
    if (!el) return;
    const measure = () => setPageCount(Math.max(1, Math.ceil(el.scrollHeight / A4_H)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data, templateId, layout, mode]);

  return (
    <>
      {/* ── Screen / Preview ── */}
      <div className="no-print relative" style={{ width: A4_W }}>
        <div ref={flowRef} className="bg-white shadow-2xl" style={{ width: A4_W }}>
          <CVPreview templateId={templateId} data={data} editable={editable} actions={actions} layout={layout} />
        </div>

        {/* Page boundary markers */}
        {Array.from({ length: pageCount - 1 }, (_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 pointer-events-none"
            style={{ top: (i + 1) * A4_H }}
          >
            <div className="border-t-2 border-dashed border-slate-300 relative">
              <span className="absolute right-2 -top-3 text-[9px] text-slate-400 bg-white px-1">
                Sida {i + 2}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Print only: hidden on screen (display:none), shown in print (display:block) ── */}
      <div className="cv-print-area hidden print:block" style={{ width: A4_W }}>
        <CVPreview templateId={templateId} data={data} editable={false} actions={actions} layout={layout} />
      </div>
    </>
  );
}