import { EditText } from "./Editable";
import { Plus, X } from "lucide-react";
import { DEFAULT_LAYOUTS } from "@/lib/cvModel";

const BLUE = "#1B4FD8";
const DARK = "#0f172a";

function Profil({ d, editable, actions }) {
  return (
    <section>
      <h2 className="text-[11px] tracking-[0.18em] uppercase font-bold mb-2 pb-1.5 border-b-2" style={{ color: BLUE, borderColor: BLUE }}>Profil</h2>
      <EditText as="textarea" value={d.profil} editable={editable} onChange={(v) => actions.setField("profil", v)} className="text-[12.5px] leading-relaxed text-slate-600" placeholder="Kort personlig presentation" />
    </section>
  );
}

function Erfarenhet({ d, editable, actions }) {
  return (
    <section>
      <h2 className="text-[11px] tracking-[0.18em] uppercase font-bold mb-3 pb-1.5 border-b-2" style={{ color: BLUE, borderColor: BLUE }}>Arbetslivserfarenhet</h2>
      <div className="space-y-5">
        {d.erfarenhet.map((e, i) => (
          <div key={i} className="relative cv-keep">
            <div className="flex justify-between items-baseline gap-3">
              <h3 className="text-[13.5px] font-bold text-slate-900"><EditText value={e.roll} editable={editable} onChange={(v) => actions.setExp(i, "roll", v)} placeholder="Roll" /></h3>
              <span className="text-[11px] px-2 py-0.5 rounded text-white font-medium whitespace-nowrap" style={{ background: BLUE }}><EditText value={e.period} editable={editable} onChange={(v) => actions.setExp(i, "period", v)} placeholder="Period" /></span>
            </div>
            <div className="text-[12px] font-medium mb-1" style={{ color: BLUE }}><EditText value={e.foretag} editable={editable} onChange={(v) => actions.setExp(i, "foretag", v)} placeholder="Företag" /></div>
            <EditText as="textarea" value={e.beskrivning} editable={editable} onChange={(v) => actions.setExp(i, "beskrivning", v)} className="text-[12px] leading-relaxed text-slate-600" placeholder="Beskrivning" />
            {editable && <button onClick={() => actions.removeExp(i)} className="no-print absolute -right-6 top-0"><X className="w-4 h-4 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addExp} className="no-print text-[11.5px] flex items-center gap-1" style={{ color: BLUE }}><Plus className="w-3 h-3" />Lägg till erfarenhet</button>}
      </div>
    </section>
  );
}

function Utbildning({ d, editable, actions }) {
  return (
    <section>
      <h2 className="text-[11px] tracking-[0.18em] uppercase font-bold mb-3 pb-1.5 border-b-2" style={{ color: BLUE, borderColor: BLUE }}>Utbildning</h2>
      <div className="space-y-4">
        {d.utbildning.map((u, i) => (
          <div key={i} className="relative cv-keep">
            <div className="flex justify-between items-baseline gap-3">
              <h3 className="text-[13px] font-bold text-slate-900"><EditText value={u.examen} editable={editable} onChange={(v) => actions.setEdu(i, "examen", v)} placeholder="Examen" /></h3>
              <span className="text-[11px] text-slate-400 whitespace-nowrap"><EditText value={u.period} editable={editable} onChange={(v) => actions.setEdu(i, "period", v)} placeholder="Period" /></span>
            </div>
            <div className="text-[12px] font-medium" style={{ color: BLUE }}><EditText value={u.skola} editable={editable} onChange={(v) => actions.setEdu(i, "skola", v)} placeholder="Skola" /></div>
            <EditText as="textarea" value={u.beskrivning} editable={editable} onChange={(v) => actions.setEdu(i, "beskrivning", v)} className="text-[11.5px] leading-relaxed text-slate-600" placeholder="Beskrivning" rows={2} />
            {editable && <button onClick={() => actions.removeEdu(i)} className="no-print absolute -right-6 top-0"><X className="w-4 h-4 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addEdu} className="no-print text-[11.5px] flex items-center gap-1" style={{ color: BLUE }}><Plus className="w-3 h-3" />Lägg till utbildning</button>}
      </div>
    </section>
  );
}

function Fardigheter({ d, editable, actions }) {
  return (
    <section>
      <h2 className="text-[11px] tracking-[0.18em] uppercase font-bold mb-3" style={{ color: BLUE }}>Färdigheter</h2>
      <div className="space-y-3">
        {d.fardigheter.map((f, i) => (
          <div key={i} className="relative cv-keep">
            <div className="flex items-center justify-between mb-1">
              <EditText value={f.namn} editable={editable} onChange={(v) => actions.setSkill(i, "namn", v)} className="text-[12px] font-medium text-slate-700" placeholder="Färdighet" />
              {editable && <button onClick={() => actions.removeSkill(i)} className="no-print"><X className="w-3 h-3 text-slate-300" /></button>}
            </div>
            {editable ? (
              <input type="range" min={0} max={100} value={f.niva} onChange={(e) => actions.setSkill(i, "niva", Number(e.target.value))} className="w-full h-1.5 accent-blue-600" />
            ) : (
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${f.niva}%`, background: BLUE }} /></div>
            )}
          </div>
        ))}
        {editable && <button onClick={actions.addSkill} className="no-print text-[11.5px] flex items-center gap-1" style={{ color: BLUE }}><Plus className="w-3 h-3" />Lägg till</button>}
      </div>
    </section>
  );
}

function Sprak({ d, editable, actions }) {
  return (
    <section>
      <h2 className="text-[11px] tracking-[0.18em] uppercase font-bold mb-3" style={{ color: BLUE }}>Språk</h2>
      <div className="space-y-2">
        {d.sprak.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px] text-slate-700">
            <EditText value={s.sprak} editable={editable} onChange={(v) => actions.setSprak(i, "sprak", v)} placeholder="Språk" />
            <span>—</span>
            <EditText value={s.niva} editable={editable} onChange={(v) => actions.setSprak(i, "niva", v)} placeholder="Nivå" />
            {editable && <button onClick={() => actions.removeSprak(i)} className="no-print"><X className="w-3 h-3 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addSprak} className="no-print text-[11.5px] flex items-center gap-1" style={{ color: BLUE }}><Plus className="w-3 h-3" />Lägg till</button>}
      </div>
    </section>
  );
}

const RENDER = { profil: Profil, erfarenhet: Erfarenhet, utbildning: Utbildning, fardigheter: Fardigheter, sprak: Sprak };

export default function TechProTemplate({ data: d, editable, actions, layout }) {
  const lay = layout || DEFAULT_LAYOUTS.techpro;
  const render = (k) => {
    const S = RENDER[k];
    return S ? <S key={k} d={d} editable={editable} actions={actions} /> : null;
  };
  return (
    <div dir="ltr" className="w-full h-full bg-white text-slate-800" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header className="px-9 py-8" style={{ background: DARK }}>
        <h1 className="text-3xl font-bold text-white tracking-tight"><EditText value={d.namn} editable={editable} onChange={(v) => actions.setField("namn", v)} placeholder="Ditt namn" /></h1>
        <p className="text-[15px] mt-1" style={{ color: "#7aa2ff" }}><EditText value={d.titel} editable={editable} onChange={(v) => actions.setField("titel", v)} placeholder="Titel" /></p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11.5px] text-slate-300">
          <EditText value={d.kontakt.telefon} editable={editable} onChange={(v) => actions.setContact("telefon", v)} placeholder="Telefon" />
          <span style={{ color: "#3b5998" }}>|</span>
          <EditText value={d.kontakt.epost} editable={editable} onChange={(v) => actions.setContact("epost", v)} placeholder="E-post" />
          <span style={{ color: "#3b5998" }}>|</span>
          <EditText value={d.kontakt.adress} editable={editable} onChange={(v) => actions.setContact("adress", v)} placeholder="Adress" />
          <span style={{ color: "#3b5998" }}>|</span>
          <EditText value={d.kontakt.linkedin} editable={editable} onChange={(v) => actions.setContact("linkedin", v)} placeholder="LinkedIn" />
        </div>
      </header>

      <main className="flex">
        <div className="flex-1 p-9 space-y-7">
          {lay.main.map(render)}
        </div>
        {lay.sidebar.length > 0 && (
          <aside className="w-[35%] p-7 space-y-6" style={{ background: "#f8fafc" }}>
            {lay.sidebar.map(render)}
          </aside>
        )}
      </main>
    </div>
  );
}