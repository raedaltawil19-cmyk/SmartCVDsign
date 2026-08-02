import { useState, useEffect, useRef } from "react";
import CVPreview from "./CVPreview";

const A4_W = 794;
const A4_H = 1123;
const GAP = 22;

function offsetTo(el, root) {
  let top = 0;
  let cur = el;
  let guard = 0;
  while (cur && cur !== root && guard < 50) {
    top += cur.offsetTop;
    cur = cur.offsetParent;
    guard++;
  }
  return top;
}

export default function CVPages({ templateId, data, editable, actions, layout, mode }) {
  const [pages, setPages] = useState([{ start: 0, end: A4_H }]);
  const measureRef = useRef(null);

  useEffect(() => {
    if (mode === "edit") return;
    const el = measureRef.current;
    if (!el) return;

    const measure = () => {
      const total = el.scrollHeight;
      if (total <= 0) return;

      const blockEls = el.querySelectorAll(".cv-keep, h1, h2, h3, h4");
      const blocks = [...blockEls]
        .map((b) => {
          const top = offsetTo(b, el);
          return { top, bottom: top + b.offsetHeight };
        })
        .filter((b) => b.bottom > 0.5 && b.top < total - 0.5)
        .sort((a, b) => a.top - b.top);

      const starts = [0];
      let cur = 0;
      let guard = 0;
      while (cur + A4_H < total - 1 && guard < 50) {
        let end = cur + A4_H;
        for (const b of blocks) {
          if (b.top >= cur - 0.5 && b.bottom <= cur + A4_H + 0.5) end = b.bottom;
        }
        if (end <= cur + 1) end = cur + A4_H; // no block fits fully -> hard cut
        cur = end;
        starts.push(cur);
        guard++;
      }

      const pagesArr = starts.map((s, i) => ({
        start: s,
        end: i < starts.length - 1 ? starts[i + 1] : total,
      }));
      setPages(pagesArr);
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

      {/* on-screen sheets — broken at block boundaries */}
      <div className="no-print">
        {mode === "edit" ? (
          <div className="bg-white shadow-2xl" style={{ width: A4_W, minHeight: A4_H }}>
            <CVPreview templateId={templateId} data={data} editable actions={actions} layout={layout} />
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: GAP }}>
            {pages.map((p, i) => (
              <div key={i} className="bg-white shadow-2xl relative" style={{ width: A4_W, height: A4_H }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: A4_W, height: Math.min(p.end - p.start, A4_H), overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -p.start, left: 0, width: A4_W }}>
                    <CVPreview templateId={templateId} data={data} editable={false} actions={actions} layout={layout} />
                  </div>
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