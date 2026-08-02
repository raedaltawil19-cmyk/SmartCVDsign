export default function CoverLetterTemplate({ data: d, letter }) {
  const today = new Date().toLocaleDateString("sv-SE");
  return (
    <div
      dir="ltr"
      className="cl-print-area bg-white text-slate-800"
      style={{ width: 794, minHeight: 1123, padding: "72px 80px", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
    >
      <div className="flex justify-between items-start text-[12px] text-slate-500">
        <div>
          <div className="font-semibold text-slate-800 text-[13px]">{d.namn || "Ditt namn"}</div>
          {d.kontakt.adress && <div>{d.kontakt.adress}</div>}
          {d.kontakt.telefon && <div>{d.kontakt.telefon}</div>}
          {d.kontakt.epost && <div>{d.kontakt.epost}</div>}
          {d.kontakt.linkedin && <div>{d.kontakt.linkedin}</div>}
        </div>
        <div className="text-right">{today}</div>
      </div>

      <h1 className="text-[16px] font-semibold mt-12 mb-6 text-slate-900 tracking-tight">
        {letter?.rubrik || "Personligt brev"}
      </h1>

      <div className="whitespace-pre-line text-[13px] leading-[1.7] text-slate-700">
        {letter?.text || ""}
      </div>

      <div className="mt-12 text-[13px] text-slate-700 leading-relaxed">
        Med vänliga hälsningar,
        <div className="mt-1 font-semibold text-slate-900">{d.namn || ""}</div>
      </div>
    </div>
  );
}