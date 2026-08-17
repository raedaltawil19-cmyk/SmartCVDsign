import { EditText } from "./Editable";
import { Plus, X } from "lucide-react";
import { DEFAULT_LAYOUTS } from "@/lib/cvModel";
import ContactBar from "./ContactBar";
import ReferenceEntries, { referencesTitle, referencesHidden } from "./ReferenceEntries";

const ACCENT = "#0d9488";
const TINT = "#f0fdfa";

function Head({ children }) {
  return (
    <h2 className="inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.18em] uppercase font-bold px-2.5 py-1 rounded-full mb-3 bg-white" style={{ color: ACCENT, border: `1px solid ${ACCENT}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
      {children}
    </h2>
  );
}

function Profil({ d, editable, actions }) {
  return (
    <section>
      <Head>Profil</Head>
      <EditText as="textarea" value={d.profil} editable={editable} onChange={(v) => actions.setField("profil", v)} className="text-[13px] leading-relaxed text-slate-700 text-justify" placeholder="Kort personlig presentation" />
    </section>
  );
}

function Erfarenhet({ d, editable, actions }) {
  return (
    <section>
      <Head>Arbetslivserfarenhet</Head>
      <div className="space-y-4">
        {d.erfarenhet.map((e, i) => (
          <div key={i} className="relative cv-keep pl-3.5 border-l-2" style={{ borderColor: ACCENT }}>
            <div className="flex justify-between items-baseline gap-3">
              <h3 className="text-[14px] font-semibold text-slate-900"><EditText value={e.roll} editable={editable} onChange={(v) => actions.setExp(i, "roll", v)} placeholder="Roll" /></h3>
              <span className="text-[11.5px] text-slate-400 whitespace-nowrap"><EditText value={e.period} editable={editable} onChange={(v) => actions.setExp(i, "period", v)} placeholder="Period" /></span>
            </div>
            <div className="text-[12.5px] font-medium mb-0.5" style={{ color: ACCENT }}><EditText value={e.foretag} editable={editable} onChange={(v) => actions.setExp(i, "foretag", v)} placeholder="Företag" /></div>
            <EditText as="textarea" value={e.beskrivning} editable={editable} onChange={(v) => actions.setExp(i, "beskrivning", v)} className="text-[12.5px] leading-relaxed text-slate-600 text-justify" placeholder="Beskrivning av ansvarsområden och resultat" />
            {editable && <button onClick={() => actions.removeExp(i)} className="no-print absolute -right-6 top-0"><X className="w-4 h-4 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addExp} className="no-print text-[12px] flex items-center gap-1" style={{ color: ACCENT }}><Plus className="w-3 h-3" />Lägg till erfarenhet</button>}
      </div>
    </section>
  );
}

function Utbildning({ d, editable, actions }) {
  return (
    <section>
      <Head>Utbildning</Head>
      <div className="space-y-4">
        {d.utbildning.map((u, i) => (
          <div key={i} className="relative cv-keep pl-3.5 border-l-2" style={{ borderColor: ACCENT }}>
            <div className="flex justify-between items-baseline gap-3">
              <h3 className="text-[14px] font-semibold text-slate-900"><EditText value={u.examen} editable={editable} onChange={(v) => actions.setEdu(i, "examen", v)} placeholder="Examen" /></h3>
              <span className="text-[11.5px] text-slate-400 whitespace-nowrap"><EditText value={u.period} editable={editable} onChange={(v) => actions.setEdu(i, "period", v)} placeholder="Period" /></span>
            </div>
            <div className="text-[12.5px] font-medium mb-0.5" style={{ color: ACCENT }}><EditText value={u.skola} editable={editable} onChange={(v) => actions.setEdu(i, "skola", v)} placeholder="Skola" /></div>
            <EditText as="textarea" value={u.beskrivning} editable={editable} onChange={(v) => actions.setEdu(i, "beskrivning", v)} className="text-[12.5px] leading-relaxed text-slate-600 text-justify" placeholder="Beskrivning" rows={2} />
            {editable && <button onClick={() => actions.removeEdu(i)} className="no-print absolute -right-6 top-0"><X className="w-4 h-4 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addEdu} className="no-print text-[12px] flex items-center gap-1" style={{ color: ACCENT }}><Plus className="w-3 h-3" />Lägg till utbildning</button>}
      </div>
    </section>
  );
}

function Fardigheter({ d, editable, actions }) {
  return (
    <div>
      <Head>Färdigheter</Head>
      <div className="space-y-2">
        {d.fardigheter.map((f, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
            <EditText value={f.namn} editable={editable} onChange={(v) => actions.setSkill(i, "namn", v)} className="text-[12.5px] text-slate-700" placeholder="Färdighet" />
            {editable && <button onClick={() => actions.removeSkill(i)} className="no-print"><X className="w-3 h-3 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addSkill} className="no-print text-[12px] flex items-center gap-1" style={{ color: ACCENT }}><Plus className="w-3 h-3" />Lägg till</button>}
      </div>
    </div>
  );
}

function Sprak({ d, editable, actions }) {
  return (
    <div>
      <Head>Språk</Head>
      <div className="space-y-1.5">
        {d.sprak.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-[12.5px] text-slate-700">
            <EditText value={s.sprak} editable={editable} onChange={(v) => actions.setSprak(i, "sprak", v)} placeholder="Språk" />
            <span className="text-slate-300">—</span>
            <EditText value={s.niva} editable={editable} onChange={(v) => actions.setSprak(i, "niva", v)} placeholder="Nivå" />
            {editable && <button onClick={() => actions.removeSprak(i)} className="no-print"><X className="w-3 h-3 text-slate-300" /></button>}
          </div>
        ))}
        {editable && <button onClick={actions.addSprak} className="no-print text-[12px] flex items-center gap-1" style={{ color: ACCENT }}><Plus className="w-3 h-3" />Lägg till</button>}
      </div>
    </div>
  );
}

function Referenser({ d, editable, actions }) {
  if (referencesHidden(d)) return null;
  return (
    <section>
      <Head>{referencesTitle(d)}</Head>
      <ReferenceEntries
        d={d} editable={editable} actions={actions}
        itemClassName="relative cv-keep pl-3.5 border-l-2"
        nameClassName="text-[13.5px] font-semibold text-slate-900"
        metaClassName="text-[12px] font-medium"
        metaStyle={{ color: ACCENT }}
        contactClassName="text-[12px] text-slate-600"
        noteClassName="text-[12px] text-slate-600"
        addClassName="text-[12px]"
        addStyle={{ color: ACCENT }}
      />
    </section>
  );
}

const RENDER = { profil: Profil, erfarenhet: Erfarenhet, utbildning: Utbildning, fardigheter: Fardigheter, sprak: Sprak, references: Referenser };

export default function CreativeEdgeTemplate({ data: d, editable, actions, layout }) {
  const lay = layout || DEFAULT_LAYOUTS.creative;
  const render = (k) => {
    const S = RENDER[k];
    return S ? <S key={k} d={d} editable={editable} actions={actions} /> : null;
  };
  return (
    <div dir="ltr" className="w-full h-full bg-white text-slate-800" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <header className="px-10 pt-10 pb-7" style={{ background: ACCENT }}>
        <h1 className="text-3xl font-bold tracking-tight text-white"><EditText value={d.namn} editable={editable} onChange={(v) => actions.setField("namn", v)} placeholder="Ditt namn" /></h1>
        <p className="text-base mt-1 text-white/85 font-medium"><EditText value={d.titel} editable={editable} onChange={(v) => actions.setField("titel", v)} placeholder="Titel" /></p>
        <ContactBar
          kontakt={d.kontakt}
          editable={editable}
          actions={actions}
          separator="|"
          separatorClassName="text-[11.5px] text-white/40"
          itemClassName="text-[11.5px] text-white/80"
          containerClassName="mt-3"
        />
      </header>
      <div className="flex">
        <main className="flex-1 py-10 pl-[76px] pr-[76px] space-y-7 bg-white">
          {lay.main.map(render)}
        </main>
        {lay.sidebar.length > 0 && (
          <aside className="w-[32%] p-8 space-y-7" style={{ background: TINT }}>
            {lay.sidebar.map(render)}
          </aside>
        )}
      </div>
    </div>
  );
}