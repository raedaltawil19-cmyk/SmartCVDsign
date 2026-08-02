import { useState, useEffect, useRef } from "react";
import CVPreview from "./CVPreview";

const A4_W = 794;
const A4_H = 1123;
const GAP = 22;

export default function CVPages({ templateId, data, editable, actions, layout, mode }) {
  const [pageCount, setPageCount] = useState(1);
  const measureRef = useRef(null);

  useEffect(() => {
    if (mode === "edit") return;
    const el = measureRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.scrollHeight;
      setPageCount(Math.max(1, Math.ceil(h / A4_H)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data, templateId, layout, mode]);

  return (
    <>
      {/* hidden measuring container — preview only */}
      {mode !== "edit" && (
        <div
          ref={measureRef}
          className="no-print"
          style={{ position: "absolute", left: "-9999px", top: 0, width: A4_W, visibility: "hidden" }}
          aria-hidden="true"
        >
          <CVPreview templateId={templateId} data={data} editable={false} actions={actions} layout={layout} />
        </div>
      )}

      {/* on-screen sheets */}
      <div className="no-print">
        {mode === "edit" ? (
          <div className="bg-white shadow-2xl" style={{ width: A4_W, minHeight: A4_H }}>
            <CVPreview templateId={templateId} data={data} editable actions={actions} layout={layout} />
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: GAP }}>
            {Array.from({ length: pageCount }, (_, i) => (
              <div
                key={i}
                className="bg-white shadow-2xl relative overflow-hidden"
                style={{ width: A4_W, height: A4_H }}
              >
                <div style={{ position: "absolute", top: -(i * A4_H), left: 0, width: A4_W }}>
                  <CVPreview templateId={templateId} data={data} editable={false} actions={actions} layout={layout} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* print: single continuous flow — browser paginates */}
      <div className="cv-print-area hidden print:block bg-white" style={{ width: A4_W, minHeight: A4_H }}>
        <CVPreview templateId={templateId} data={data} editable={false} actions={actions} layout={layout} />
      </div>
    </>
  );
}