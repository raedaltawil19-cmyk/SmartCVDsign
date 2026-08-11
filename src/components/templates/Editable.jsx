import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useEditContext } from "./EditContext";
import FloatingToolbar from "./FloatingToolbar";

function renderInline(text) {
  if (!text) return text;
  const nodes = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let m;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[3] !== undefined) nodes.push(<em key={key++}>{m[3]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length ? nodes : text;
}

export function EditText({ value, editable, onChange, className, as = "input", placeholder = "", rows = 3 }) {
  const { activateEdit } = useEditContext();
  const taRef = useRef(null);
  const clickPosRef = useRef(null);
  const [toolbar, setToolbar] = useState(null);

  useEffect(() => {
    if (editable && clickPosRef.current && taRef.current) {
      const pos = clickPosRef.current;
      clickPosRef.current = null;
      taRef.current.focus();
      setToolbar({ top: pos.y - 6, left: pos.x });
    }
  }, [editable]);

  const applyFormat = (type) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = (value || "").substring(start, end);
    let newVal;
    let selStart;
    let selEnd;
    if (type === "bold") {
      newVal = value.substring(0, start) + "**" + sel + "**" + value.substring(end);
      selStart = start + 2;
      selEnd = end + 2;
    } else if (type === "italic") {
      newVal = value.substring(0, start) + "*" + sel + "*" + value.substring(end);
      selStart = start + 1;
      selEnd = end + 1;
    } else if (type === "bullet") {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      newVal = value.substring(0, lineStart) + "• " + value.substring(lineStart);
      selStart = start + 2;
      selEnd = end + 2;
    }
    onChange(newVal);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  };

  if (!editable) {
    return (
      <span
        className={cn(className, "cursor-text")}
        onClick={(e) => {
          clickPosRef.current = { x: e.clientX, y: e.clientY };
          activateEdit();
        }}
      >
        {value ? renderInline(value) : placeholder}
      </span>
    );
  }

  const base =
    "bg-transparent border-0 outline-none w-full p-0 m-0 placeholder:text-slate-300 focus:bg-slate-50/60 rounded transition-colors";
  const onFocus = (e) => {
    if (!clickPosRef.current) {
      const r = e.target.getBoundingClientRect();
      setToolbar({ top: r.top - 6, left: r.left + r.width / 2 });
    }
  };
  const onBlur = () => setToolbar(null);

  if (as === "textarea") {
    return (
      <>
        <textarea
          ref={taRef}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          className={cn(base, "resize-none", className)}
          placeholder={placeholder}
          rows={rows}
        />
        <FloatingToolbar pos={toolbar} onAction={applyFormat} />
      </>
    );
  }
  return (
    <>
      <input
        ref={taRef}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className={cn(base, className)}
        placeholder={placeholder}
      />
      <FloatingToolbar pos={toolbar} onAction={applyFormat} />
    </>
  );
}