import { createPortal } from "react-dom";
import { Bold, Italic, List } from "lucide-react";

const ACTIONS = [
  { type: "bold", icon: Bold, label: "Fet" },
  { type: "italic", icon: Italic, label: "Kursiv" },
  { type: "bullet", icon: List, label: "Punktlista" },
];

export default function FloatingToolbar({ pos, onAction }) {
  if (!pos) return null;
  const style = {
    position: "fixed",
    top: Math.max(8, pos.top),
    left: Math.min(Math.max(8, pos.left), window.innerWidth - 8),
    transform: "translate(-50%, -100%)",
    zIndex: 100,
  };
  return createPortal(
    <div
      style={style}
      onMouseDown={(e) => e.preventDefault()}
      className="no-print flex items-center gap-0.5 bg-slate-900 text-white rounded-lg shadow-xl px-1 py-1"
    >
      {ACTIONS.map((a) => (
        <button
          key={a.type}
          title={a.label}
          onClick={() => onAction(a.type)}
          className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-white/15 transition-colors"
        >
          <a.icon className="w-4 h-4" />
        </button>
      ))}
    </div>,
    document.body
  );
}