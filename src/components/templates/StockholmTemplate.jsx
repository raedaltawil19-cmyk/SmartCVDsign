import { EditText } from "./Editable";
import { Plus, X } from "lucide-react";
import { DEFAULT_LAYOUTS } from "@/lib/cvModel";

const BLUE = "#1B4FD8";

function Profil({ d, editable, actions }) {
  return (
    <section>
      <h2 className="text-[10px] tracking-[0.2em] uppercase text-slate-400 font-semibold mb-3">Profil</h2>
      <EditText as="textarea" value={d.profil} editable={editable} onChange={(v) => actions.setField("profil", v)} className="text-[13px] leading-relaxed text-slate-700 text-justify" placeholder="Kort personlig presentation" />
    </section>
  );
}

function Erfarenhet({ d, editable, actions }) {
  return (
    <section>
      <h2 className="text-[10px] tracking-[0.2em] uppercase text-slate-400 font-semibold mb-3">Arbetslivserfarenhet</h2>
      <div className="space-y-5">
        {d.erfarenhet.map((e, i) => (
          <div key={i} className="relative cv-keep">
            <div className="flex justify-between items-baseline gap-3">
              <h3 className="text-[14px] font-semibold text-slate-900"><EditText value={e.roll} editable={editable} onChange={(v) => actions.setExp(i, "roll", v)} placeholder="Roll" /></h3>
              <span className="text-[11.5px] text-slate-400 whitespace-nowrap"><EditText value={e.period} editable={editable} onChange={(v) => actions.setExp(i, "period", v)} placeholder="Period" /></span>
            </div>
            <div className="text-[12.5px] text-slate-500 mb-0.5"><EditText value={e.foretag} editable={editable} onChange={(v) => actions.setExp(i, "foretag", v)} placeholder="Företag" /></div>
            <EditText as="textarea" value={e.beskrivning} editable={editable} onChange={(v) => actions.setExp(i, "beskrivning", v)} className="text-[12.5px] leading-relaxed text-slate-600 text-justify" placeholder="Beskrivning av ansvarsområden och resultat" />
            {editable && <button onClick={() => actions.removeExp(i)} className="no-print absolute -right-6 top-0"><X className="w-4 h-4 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addExp} className="no-print text-[12px] flex items-center gap-1" style={{ color: BLUE }}><Plus className="w-3 h-3" />Lägg till erfarenhet</button>}
      </div>
    </section>
  );
}

function Utbildning({ d, editable, actions }) {
  return (
    <section>
      <h2 className="text-[10px] tracking-[0.2em] uppercase text-slate-400 font-semibold mb-3">Utbildning</h2>
      <div className="space-y-4">
        {d.utbildning.map((u, i) => (
          <div key={i} className="relative cv-keep">
            <div className="flex justify-between items-baseline gap-3">
              <h3 className="text-[14px] font-semibold text-slate-900"><EditText value={u.examen} editable={editable} onChange={(v) => actions.setEdu(i, "examen", v)} placeholder="Examen" /></h3>
              <span className="text-[11.5px] text-slate-400 whitespace-nowrap"><EditText value={u.period} editable={editable} onChange={(v) => actions.setEdu(i, "period", v)} placeholder="Period" /></span>
            </div>
            <div className="text-[12.5px] text-slate-500 mb-0.5"><EditText value={u.skola} editable={editable} onChange={(v) => actions.setEdu(i, "skola", v)} placeholder="Skola" /></div>
            <EditText as="textarea" value={u.beskrivning} editable={editable} onChange={(v) => actions.setEdu(i, "beskrivning", v)} className="text-[12.5px] leading-relaxed text-slate-600 text-justify" placeholder="Beskrivning" rows={2} />
            {editable && <button onClick={() => actions.removeEdu(i)} className="no-print absolute -right-6 top-0"><X className="w-4 h-4 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addEdu} className="no-print text-[12px] flex items-center gap-1" style={{ color: BLUE }}><Plus className="w-3 h-3" />Lägg till utbildning</button>}
      </div>
    </section>
  );
}

function Fardigheter({ d, editable, actions }) {
  return (
    <div>
      <h2 className="text-[10px] tracking-[0.2em] uppercase text-slate-400 font-semibold mb-3">Färdigheter</h2>
      <div className="space-y-2">
        {d.fardigheter.map((f, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: BLUE }} />
            <EditText value={f.namn} editable={editable} onChange={(v) => actions.setSkill(i, "namn", v)} className="text-[12.5px] text-slate-700" placeholder="Färdighet" />
            {editable && <button onClick={() => actions.removeSkill(i)} className="no-print"><X className="w-3 h-3 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addSkill} className="no-print text-[12px] flex items-center gap-1" style={{ color: BLUE }}><Plus className="w-3 h-3" />Lägg till</button>}
      </div>
    </div>
  );
}

function Sprak({ d, editable, actions }) {
  return (
    <div>
      <h2 className="text-[10px] tracking-[0.2em] uppercase text-slate-400 font-semibold mb-3">Språk</h2>
      <div className="space-y-1.5">
        {d.sprak.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-[12.5px] text-slate-700">
            <EditText value={s.sprak} editable={editable} onChange={(v) => actions.setSprak(i, "sprak", v)} placeholder="Språk" />
            <span>—</span>
            <EditText value={s.niva} editable={editable} onChange={(v) => actions.setSprak(i, "niva", v)} placeholder="Nivå" />
            {editable && <button onClick={() => actions.removeSprak(i)} className="no-print"><X className="w-3 h-3 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addSprak} className="no-print text-[12px] flex items-center gap-1" style={{ color: BLUE }}><Plus className="w-3 h-3" />Lägg till</button>}
      </div>
    </div>
  );
}

const RENDER = { profil: Profil, erfarenhet: Erfarenhet, utbildning: Utbildning, fardigheter: Fardigheter, sprak: Sprak };

export default function StockholmTemplate({ data: d, editable, actions, layout }) {
  const lay = layout || DEFAULT_LAYOUTS.stockholm;
  const render = (k) => {
    const S = RENDER[k];
    return S ? <S key={k} d={d} editable={editable} actions={actions} /> : null;
  };
  return (
    <div dir="ltr" className="w-full h-full bg-white text-slate-800 flex" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <aside className="w-[32%] bg-slate-50 py-8 pl-12 pr-6 space-y-8 border-r border-slate-200">
        <div>
          <h2 className="text-[10px] tracking-[0.2em] uppercase text-slate-400 font-semibold mb-3">Kontakt</h2>
          <div className="space-y-1.5 text-[12.5px] text-slate-700">
            {(editable ? ["telefon", "epost", "adress", "linkedin"] : ["telefon", "epost", "adress", "linkedin"].filter((k) => d.kontakt[k])).map((k) => (
              <EditText key={k} value={d.kontakt[k]} editable={editable} onChange={(v) => actions.setContact(k, v)} placeholder={k.charAt(0).toUpperCase() + k.slice(1)} />
            ))}
          </div>
        </div>
        {lay.sidebar.map(render)}
      </aside>
      <main className="flex-1 py-10 pl-[76px] pr-[76px] space-y-7 bg-white">
        <header className="pb-5 border-b border-slate-200">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900"><EditText value={d.namn} editable={editable} onChange={(v) => actions.setField("namn", v)} placeholder="Ditt namn" /></h1>
          <p className="text-base text-slate-500 mt-1"><EditText value={d.titel} editable={editable} onChange={(v) => actions.setField("titel", v)} placeholder="Titel" /></p>
        </header>
        {lay.main.map(render)}
      </main>
    </div>
  );
}