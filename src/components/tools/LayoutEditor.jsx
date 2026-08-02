import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { SECTIONS } from "@/lib/cvModel";
import { X, GripVertical, Columns2 } from "lucide-react";

const LABELS = Object.fromEntries(SECTIONS.map((s) => [s.key, s.label]));
const AR = { profil: "نبذة", erfarenhet: "الخبرات", utbildning: "التعليم", fardigheter: "المهارات", sprak: "اللغات" };

export default function LayoutEditor({ layout, hasSidebar, onChange, onClose }) {
  const lanes = hasSidebar ? ["main", "sidebar"] : ["main"];
  const titles = { main: "العمود الرئيسي", sidebar: "العمود الجانبي" };

  const onDragEnd = (res) => {
    const { source, destination } = res;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const next = { main: [...layout.main], sidebar: hasSidebar ? [...layout.sidebar] : [] };
    const srcList = next[source.droppableId];
    const [moved] = srcList.splice(source.index, 1);
    next[destination.droppableId].splice(destination.index, 0, moved);
    onChange(next);
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
        <span className="font-medium text-slate-900 inline-flex items-center gap-2"><Columns2 className="w-4 h-4 text-[#1B4FD8]" /> ترتيب الأقسام</span>
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"><X className="w-4 h-4" /><span>إغلاق</span></button>
      </div>
      <div className="flex-1 overflow-auto p-6 bg-slate-100 flex justify-center items-start">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className={`flex ${hasSidebar ? "flex-row-reverse gap-6" : "flex-col"} max-w-3xl w-full`}>
            {lanes.map((lane) => (
              <Droppable key={lane} droppableId={lane}>
                {(prov, snap) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.droppableProps}
                    className={`flex-1 min-h-[260px] rounded-2xl border-2 border-dashed p-3 transition-colors ${snap.isDraggingOver ? "border-[#1B4FD8] bg-[#1B4FD8]/5" : "border-slate-300 bg-white"}`}
                  >
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 px-1">{titles[lane]}</h3>
                    <div className="space-y-2">
                      {layout[lane].map((key, i) => (
                        <Draggable key={key} draggableId={key} index={i}>
                          {(p, s) => (
                            <div
                              ref={p.innerRef}
                              {...p.draggableProps}
                              {...p.dragHandleProps}
                              className={`flex items-center gap-3 px-3 py-3 rounded-xl border bg-white cursor-grab active:cursor-grabbing shadow-sm transition-shadow ${s.isDragging ? "shadow-lg border-[#1B4FD8]" : "border-slate-200"}`}
                            >
                              <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                              <div className="flex-1">
                                <div className="text-[13px] font-medium text-slate-800">{LABELS[key]}</div>
                                <div className="text-[11px] text-slate-400">{AR[key]}</div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {layout[lane].length === 0 && <div className="text-[12px] text-slate-400 text-center py-8">اسحب قسمًا إلى هنا</div>}
                      {prov.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>
      <div className="shrink-0 px-5 py-2.5 bg-white border-t border-slate-200 text-center text-[12px] text-slate-400">
        اسحب بطاقة قسم من عمود إلى آخر لتغيير مكانها يميناً أو يساراً، أو أعِد ترتيبها داخل العمود
      </div>
    </div>
  );
}