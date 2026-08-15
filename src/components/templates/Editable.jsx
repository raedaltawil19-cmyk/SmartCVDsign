import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useEditContext } from "./EditContext";
import FloatingToolbar from "./FloatingToolbar";

const INPUT_BASE =
  "bg-transparent border-0 outline-none w-full p-0 m-0 placeholder:text-slate-300 focus:bg-slate-50/60 rounded transition-colors";

// يحوّل نص عادي إلى HTML: يحافظ على الأسطر الجديدة كـ <br>، ويترك الـHTML كما هو
function toHtml(v) {
  if (!v) return "";
  const s = String(v);
  if (/<[a-z!]/i.test(s)) return s;
  return s.replace(/\n/g, "<br>");
}

export function EditText({ value, editable, onChange, className, as = "input", placeholder = "", rows = 3 }) {
  const { activateEdit } = useEditContext();
  const ref = useRef(null);
  const clickPosRef = useRef(null);
  const [toolbar, setToolbar] = useState(null);

  // عند التفعيل بالنقر: ركّز الحقل واعرض الشريط عند مؤشر الماوس
  useEffect(() => {
    if (editable && clickPosRef.current && ref.current) {
      const pos = clickPosRef.current;
      clickPosRef.current = null;
      ref.current.focus();
      if (as === "textarea") setToolbar({ top: pos.y - 6, left: pos.x });
    }
  }, [editable]);

  // مزامنة القيمة الخارجية (تراجع/وكيل) داخل الـcontentEditable
  useEffect(() => {
    if (editable && as === "textarea" && ref.current) {
      const html = toHtml(value || "");
      if (ref.current.innerHTML !== html) ref.current.innerHTML = html;
    }
  }, [editable, value]);

  const activate = (e) => {
    clickPosRef.current = { x: e.clientX, y: e.clientY };
    activateEdit();
  };

  if (!editable) {
    if (as === "textarea") {
      return (
        <span
          className={cn(className, "cursor-text block w-full")}
          onClick={activate}
          dangerouslySetInnerHTML={{ __html: value ? toHtml(value) : "" }}
        />
      );
    }
    return (
      <span className={cn(className, "cursor-text block w-full")} onClick={activate}>
        {value ? value : ""}
      </span>
    );
  }

  // حقول السطر الواحد: <input> عادي — التحرير والمعاينة متطابقان (نص صرف)
  if (as === "input") {
    return (
      <input
        ref={ref}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(INPUT_BASE, className)}
      />
    );
  }

  // حقول متعددة الأسطر: محرر WYSIWYG — التنسيق يظهر أثناء التحرير كما في المعاينة
  const onFocus = (e) => {
    if (!clickPosRef.current) {
      const r = e.target.getBoundingClientRect();
      setToolbar({ top: r.top - 6, left: r.left + r.width / 2 });
    }
  };
  const onBlur = () => setToolbar(null);
  const onInput = () => {
    if (!ref.current) return;
    if (ref.current.textContent.trim() === "") ref.current.innerHTML = "";
    onChange(ref.current.innerHTML);
  };
  const applyFormat = (type) => {
    ref.current?.focus();
    if (type === "bold") document.execCommand("bold");
    else if (type === "italic") document.execCommand("italic");
    else if (type === "bullet") document.execCommand("insertHTML", false, "• ");
  };

  return (
    <>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onFocus={onFocus}
        onBlur={onBlur}
        onInput={onInput}
        data-placeholder={placeholder}
        className={cn(className, "cv-editable outline-none focus:bg-slate-50/60 rounded transition-colors")}
        style={{ minHeight: `${rows * 1.6}em` }}
      />
      <FloatingToolbar pos={toolbar} onAction={applyFormat} />
    </>
  );
}