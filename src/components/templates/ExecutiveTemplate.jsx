import { EditText } from "./Editable";
import { Plus, X } from "lucide-react";
import { DEFAULT_LAYOUTS } from "@/lib/cvModel";
import ContactBar from "./ContactBar";
import ReferenceEntries, { referencesTitle, referencesHidden } from "./ReferenceEntries";

const GOLD = "#B08D57";

function Profil({ d, editable, actions }) {
  return (
    <section>
      <h2 className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-3 text-center" style={{ color: GOLD }}>Profil</h2>
      <EditText as="textarea" value={d.profil} editable={editable} onChange={(v) => actions.setField("profil", v)} className="text-[13.5px] leading-relaxed text-slate-700 text-justify" placeholder="Kort personlig presentation" />
    </section>
  );
}

function Erfarenhet({ d, editable, actions }) {
  return (
    <section>
      <h2 className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-4 text-center pb-2 border-b border-slate-200" style={{ color: GOLD }}>Arbetslivserfarenhet</h2>
      <div className="space-y-6">
        {d.erfarenhet.map((e, i) => (
          <div key={i} className="relative text-center cv-keep">
            <h3 className="text-[15px] font-semibold text-slate-900"><EditText value={e.roll} editable={editable} onChange={(v) => actions.setExp(i, "roll", v)} placeholder="Roll" /></h3>
            <div className="text-[12.5px] text-slate-500 italic"><EditText value={e.foretag} editable={editable} onChange={(v) => actions.setExp(i, "foretag", v)} placeholder="Företag" /></div>
            <div className="text-[11.5px] mb-1" style={{ color: GOLD }}><EditText value={e.period} editable={editable} onChange={(v) => actions.setExp(i, "period", v)} placeholder="Period" /></div>
            <EditText as="textarea" value={e.beskrivning} editable={editable} onChange={(v) => actions.setExp(i, "beskrivning", v)} className="text-[12.5px] leading-relaxed text-slate-600 text-justify" placeholder="Beskrivning" />
            {editable && <button onClick={() => actions.removeExp(i)} className="no-print absolute -right-6 top-0"><X className="w-4 h-4 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addExp} className="no-print text-[12px] flex items-center gap-1 mx-auto" style={{ color: GOLD }}><Plus className="w-3 h-3" />Lägg till erfarenhet</button>}
      </div>
    </section>
  );
}

function Utbildning({ d, editable, actions }) {
  return (
    <section>
      <h2 className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-4 text-center pb-2 border-b border-slate-200" style={{ color: GOLD }}>Utbildning</h2>
      <div className="space-y-5">
        {d.utbildning.map((u, i) => (
          <div key={i} className="relative text-center cv-keep">
            <h3 className="text-[15px] font-semibold text-slate-900"><EditText value={u.examen} editable={editable} onChange={(v) => actions.setEdu(i, "examen", v)} placeholder="Examen" /></h3>
            <div className="text-[12.5px] text-slate-500 italic"><EditText value={u.skola} editable={editable} onChange={(v) => actions.setEdu(i, "skola", v)} placeholder="Skola" /></div>
            <div className="text-[11.5px] mb-1" style={{ color: GOLD }}><EditText value={u.period} editable={editable} onChange={(v) => actions.setEdu(i, "period", v)} placeholder="Period" /></div>
            <EditText as="textarea" value={u.beskrivning} editable={editable} onChange={(v) => actions.setEdu(i, "beskrivning", v)} className="text-[12.5px] leading-relaxed text-slate-600 text-justify" placeholder="Beskrivning" rows={2} />
            {editable && <button onClick={() => actions.removeEdu(i)} className="no-print absolute -right-6 top-0"><X className="w-4 h-4 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addEdu} className="no-print text-[12px] flex items-center gap-1 mx-auto" style={{ color: GOLD }}><Plus className="w-3 h-3" />Lägg till utbildning</button>}
      </div>
    </section>
  );
}

function Fardigheter({ d, editable, actions }) {
  return (
    <section>
      <h2 className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-4 text-center pb-2 border-b border-slate-200" style={{ color: GOLD }}>Färdigheter</h2>
      <div className="space-y-1 text-center text-[12.5px] text-slate-600">
        {d.fardigheter.map((f, i) => (
          <div key={i} className="flex items-center justify-center gap-1">
            <EditText value={f.namn} editable={editable} onChange={(v) => actions.setSkill(i, "namn", v)} placeholder="Färdighet" />
            {editable && <button onClick={() => actions.removeSkill(i)} className="no-print"><X className="w-3 h-3 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addSkill} className="no-print text-[12px] flex items-center gap-1 mx-auto" style={{ color: GOLD }}><Plus className="w-3 h-3" />Lägg till</button>}
      </div>
    </section>
  );
}

function Sprak({ d, editable, actions }) {
  return (
    <section>
      <h2 className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-4 text-center pb-2 border-b border-slate-200" style={{ color: GOLD }}>Språk</h2>
      <div className="space-y-1 text-center text-[12.5px] text-slate-600">
        {d.sprak.map((s, i) => (
          <div key={i} className="flex items-center justify-center gap-2">
            <EditText value={s.sprak} editable={editable} onChange={(v) => actions.setSprak(i, "sprak", v)} placeholder="Språk" />
            <span>—</span>
            <EditText value={s.niva} editable={editable} onChange={(v) => actions.setSprak(i, "niva", v)} placeholder="Nivå" />
            {editable && <button onClick={() => actions.removeSprak(i)} className="no-print"><X className="w-3 h-3 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addSprak} className="no-print text-[12px] flex items-center gap-1 mx-auto" style={{ color: GOLD }}><Plus className="w-3 h-3" />Lägg till</button>}
      </div>
    </section>
  );
}

function Referenser({ d, editable, actions }) {
  if (referencesHidden(d)) return null;
  return (
    <section>
      <h2 className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-4 text-center pb-2 border-b border-slate-200" style={{ color: GOLD }}>{referencesTitle(d)}</h2>
      <ReferenceEntries
        d={d} editable={editable} actions={actions}
        wrapperClassName="space-y-4"
        itemClassName="relative text-center cv-keep"
        nameClassName="text-[14.5px] font-semibold text-slate-900"
        metaClassName="text-[12.5px] text-slate-500 italic"
        contactClassName="text-[12px] text-slate-600"
        noteClassName="text-[12px] text-slate-600"
        addClassName="text-[12px] mx-auto"
        addStyle={{ color: GOLD }}
      />
    </section>
  );
}

const RENDER = { profil: Profil, erfarenhet: Erfarenhet, utbildning: Utbildning, fardigheter: Fardigheter, sprak: Sprak, references: Referenser };

export default function ExecutiveTemplate({ data: d, editable, actions, layout }) {
  const lay = layout || DEFAULT_LAYOUTS.executive;
  const render = (k) => {
    const S = RENDER[k];
    return S ? <S key={k} d={d} editable={editable} actions={actions} /> : null;
  };
  return (
    <div dir="ltr" className="w-full h-full bg-white text-slate-800" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <header className="text-center px-12 pt-14 pb-8">
        <h1 className="text-4xl tracking-[0.12em] font-semibold text-slate-900 uppercase"><EditText value={d.namn} editable={editable} onChange={(v) => actions.setField("namn", v)} placeholder="Ditt namn" /></h1>
        <div className="flex items-center justify-center gap-3 mt-3">
          <span className="h-px w-12" style={{ background: GOLD }} />
          <p className="text-sm tracking-[0.25em] uppercase" style={{ color: GOLD }}><EditText value={d.titel} editable={editable} onChange={(v) => actions.setField("titel", v)} placeholder="Titel" /></p>
          <span className="h-px w-12" style={{ background: GOLD }} />
        </div>
      </header>

      <div className="px-12">
        <ContactBar
          kontakt={d.kontakt}
          editable={editable}
          actions={actions}
          separator="•"
          separatorClassName="text-[12px]"
          itemClassName="text-[12px] text-slate-500"
          containerClassName="justify-center pb-6 border-b border-slate-200"
        />
      </div>

      <main className="py-8 pl-[76px] pr-[76px] space-y-8 max-w-none mx-0">
        {lay.main.map(render)}
      </main>
    </div>
  );
}