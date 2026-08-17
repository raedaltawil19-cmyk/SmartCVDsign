import { EditText } from "./Editable";
import { Plus, X } from "lucide-react";
import { DEFAULT_LAYOUTS } from "@/lib/cvModel";
import ContactBar from "./ContactBar";
import ReferenceEntries, { referencesTitle, referencesHidden } from "./ReferenceEntries";

function SectionHead({ children }) {
  return (
    <h2 className="text-[10px] tracking-[0.25em] uppercase font-semibold text-slate-400 mb-3 pt-5 border-t border-slate-200">
      {children}
    </h2>
  );
}

function Profil({ d, editable, actions }) {
  return (
    <section>
      <SectionHead>Profil</SectionHead>
      <EditText as="textarea" value={d.profil} editable={editable} onChange={(v) => actions.setField("profil", v)} className="text-[13px] leading-relaxed text-slate-700 text-justify" placeholder="Kort personlig presentation" />
    </section>
  );
}

function Erfarenhet({ d, editable, actions }) {
  return (
    <section>
      <SectionHead>Arbetslivserfarenhet</SectionHead>
      <div className="space-y-5">
        {d.erfarenhet.map((e, i) => (
          <div key={i} className="relative cv-keep">
            <div className="flex justify-between items-baseline gap-3">
              <h3 className="text-[14px] font-medium text-slate-900"><EditText value={e.roll} editable={editable} onChange={(v) => actions.setExp(i, "roll", v)} placeholder="Roll" /></h3>
              <span className="text-[11.5px] text-slate-400 whitespace-nowrap"><EditText value={e.period} editable={editable} onChange={(v) => actions.setExp(i, "period", v)} placeholder="Period" /></span>
            </div>
            <div className="text-[12.5px] text-slate-500 mb-1"><EditText value={e.foretag} editable={editable} onChange={(v) => actions.setExp(i, "foretag", v)} placeholder="Företag" /></div>
            <EditText as="textarea" value={e.beskrivning} editable={editable} onChange={(v) => actions.setExp(i, "beskrivning", v)} className="text-[12.5px] leading-relaxed text-slate-600 text-justify" placeholder="Beskrivning av ansvarsområden och resultat" />
            {editable && <button onClick={() => actions.removeExp(i)} className="no-print absolute -right-6 top-0"><X className="w-4 h-4 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addExp} className="no-print text-[12px] flex items-center gap-1 text-slate-400"><Plus className="w-3 h-3" />Lägg till erfarenhet</button>}
      </div>
    </section>
  );
}

function Utbildning({ d, editable, actions }) {
  return (
    <section>
      <SectionHead>Utbildning</SectionHead>
      <div className="space-y-4">
        {d.utbildning.map((u, i) => (
          <div key={i} className="relative cv-keep">
            <div className="flex justify-between items-baseline gap-3">
              <h3 className="text-[14px] font-medium text-slate-900"><EditText value={u.examen} editable={editable} onChange={(v) => actions.setEdu(i, "examen", v)} placeholder="Examen" /></h3>
              <span className="text-[11.5px] text-slate-400 whitespace-nowrap"><EditText value={u.period} editable={editable} onChange={(v) => actions.setEdu(i, "period", v)} placeholder="Period" /></span>
            </div>
            <div className="text-[12.5px] text-slate-500 mb-1"><EditText value={u.skola} editable={editable} onChange={(v) => actions.setEdu(i, "skola", v)} placeholder="Skola" /></div>
            <EditText as="textarea" value={u.beskrivning} editable={editable} onChange={(v) => actions.setEdu(i, "beskrivning", v)} className="text-[12.5px] leading-relaxed text-slate-600 text-justify" placeholder="Beskrivning" rows={2} />
            {editable && <button onClick={() => actions.removeEdu(i)} className="no-print absolute -right-6 top-0"><X className="w-4 h-4 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addEdu} className="no-print text-[12px] flex items-center gap-1 text-slate-400"><Plus className="w-3 h-3" />Lägg till utbildning</button>}
      </div>
    </section>
  );
}

function Fardigheter({ d, editable, actions }) {
  return (
    <section>
      <SectionHead>Färdigheter</SectionHead>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[12.5px] text-slate-600">
        {d.fardigheter.map((f, i) => (
          <div key={i} className="flex items-center gap-1">
            <EditText value={f.namn} editable={editable} onChange={(v) => actions.setSkill(i, "namn", v)} placeholder="Färdighet" />
            {i < d.fardigheter.length - 1 && <span className="text-slate-300">·</span>}
            {editable && <button onClick={() => actions.removeSkill(i)} className="no-print"><X className="w-3 h-3 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addSkill} className="no-print text-[12px] flex items-center gap-1 text-slate-400"><Plus className="w-3 h-3" />Lägg till</button>}
      </div>
    </section>
  );
}

function Sprak({ d, editable, actions }) {
  return (
    <section>
      <SectionHead>Språk</SectionHead>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[12.5px] text-slate-600">
        {d.sprak.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <EditText value={s.sprak} editable={editable} onChange={(v) => actions.setSprak(i, "sprak", v)} placeholder="Språk" />
            <span className="text-slate-300">—</span>
            <EditText value={s.niva} editable={editable} onChange={(v) => actions.setSprak(i, "niva", v)} placeholder="Nivå" />
            {i < d.sprak.length - 1 && <span className="text-slate-300">·</span>}
            {editable && <button onClick={() => actions.removeSprak(i)} className="no-print"><X className="w-3 h-3 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addSprak} className="no-print text-[12px] flex items-center gap-1 text-slate-400"><Plus className="w-3 h-3" />Lägg till</button>}
      </div>
    </section>
  );
}

function Referenser({ d, editable, actions }) {
  if (referencesHidden(d)) return null;
  if (!editable && (d.references || []).length === 0) return null;
  return (
    <section>
      <SectionHead>{referencesTitle(d)}</SectionHead>
      <ReferenceEntries
        d={d} editable={editable} actions={actions}
        nameClassName="text-[13.5px] font-medium text-slate-900"
        metaClassName="text-[12.5px] text-slate-500"
        contactClassName="text-[12.5px] text-slate-600"
        noteClassName="text-[12.5px] text-slate-600"
        addClassName="text-[12px] text-slate-400"
      />
    </section>
  );
}

const RENDER = { profil: Profil, erfarenhet: Erfarenhet, utbildning: Utbildning, fardigheter: Fardigheter, sprak: Sprak, references: Referenser };

export default function NordicMinimalTemplate({ data: d, editable, actions, layout }) {
  const lay = layout || DEFAULT_LAYOUTS.nordic;
  const render = (k) => {
    const S = RENDER[k];
    return S ? <S key={k} d={d} editable={editable} actions={actions} /> : null;
  };
  return (
    <div dir="ltr" className="w-full h-full bg-white text-slate-800" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <header className="px-14 pt-16 pb-8">
        <h1 className="text-4xl font-light tracking-tight text-slate-900"><EditText value={d.namn} editable={editable} onChange={(v) => actions.setField("namn", v)} placeholder="Ditt namn" /></h1>
        <p className="text-base text-slate-400 mt-1.5 tracking-wide"><EditText value={d.titel} editable={editable} onChange={(v) => actions.setField("titel", v)} placeholder="Titel" /></p>
        <ContactBar
          kontakt={d.kontakt}
          editable={editable}
          actions={actions}
          separator="·"
          separatorClassName="text-[11.5px] text-slate-300"
          itemClassName="text-[11.5px] text-slate-400"
          containerClassName="mt-4"
        />
      </header>
      <main className="pl-[76px] pr-[76px] pb-16 max-w-none mx-0 space-y-1">
        {lay.main.map(render)}
      </main>
    </div>
  );
}