import { buildCVIndex, flattenIndex } from "@/lib/agent/cvIndex";

/** عرض تشخيصي: Section → Item → Field → Stable ID → Role → Current Value */
export default function CVIndexDebug({ data }) {
  if (!data) return null;
  const rows = flattenIndex(buildCVIndex(data));

  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4" open>
      <summary className="text-[13px] font-semibold text-slate-700 cursor-pointer">
        فهرس السيرة الكامل ({rows.length} حقل)
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table dir="ltr" className="w-full text-[11px] text-left">
          <thead className="text-slate-400">
            <tr>
              <th className="py-1 pr-3">Section</th>
              <th className="py-1 pr-3">Item</th>
              <th className="py-1 pr-3">Field</th>
              <th className="py-1 pr-3">Stable ID</th>
              <th className="py-1 pr-3">Role</th>
              <th className="py-1">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ref} className="border-t border-slate-100 align-top">
                <td className="py-1 pr-3 text-slate-500">{r.section}</td>
                <td className="py-1 pr-3 text-slate-500">{r.itemLabel || "—"}</td>
                <td className="py-1 pr-3 text-slate-700">{r.field}</td>
                <td className="py-1 pr-3 font-mono text-slate-900">{r.ref}</td>
                <td className="py-1 pr-3 text-slate-500">{r.role}</td>
                <td className={`py-1 ${r.isEmpty ? "text-amber-600" : "text-slate-800"}`}>
                  {r.isEmpty ? "(tomt)" : String(r.value).slice(0, 90)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}