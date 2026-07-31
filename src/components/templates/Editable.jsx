import { cn } from "@/lib/utils";

export function EditText({ value, editable, onChange, className, as = "input", placeholder = "", rows = 3 }) {
  if (!editable) {
    return <span className={className}>{value ? value : placeholder}</span>;
  }
  const base = "bg-transparent border-0 outline-none w-full p-0 m-0 placeholder:text-slate-300 focus:bg-slate-50/60 rounded transition-colors";
  if (as === "textarea") {
    return (
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={cn(base, "resize-none", className)}
        placeholder={placeholder}
        rows={rows}
      />
    );
  }
  return (
    <input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={cn(base, className)}
      placeholder={placeholder}
    />
  );
}