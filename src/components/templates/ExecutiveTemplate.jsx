import { EditText } from "./Editable";
import { Plus, X } from "lucide-react";

const GOLD = "#B08D57";

export default function ExecutiveTemplate({ data: d, editable, actions }) {
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
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px] text-slate-500 pb-6 border-b border-slate-200">
          <EditText value={d.kontakt.telefon} editable={editable} onChange={(v) => actions.setContact("telefon", v)} placeholder="Telefon" />
          <span style={{ color: GOLD }}>•</span>
          <EditText value={d.kontakt.epost} editable={editable} onChange={(v) => actions.setContact("epost", v)} placeholder="E-post" />
          <span style={{ color: GOLD }}>•</span>
          <EditText value={d.kontakt.adress} editable={editable} onChange={(v) => actions.setContact("adress", v)} placeholder="Adress" />
          <span style={{ color: GOLD }}>•</span>
          <EditText value={d.kontakt.linkedin} editable={editable} onChange={(v) => actions.setContact("linkedin", v)} placeholder="LinkedIn" />
        </div>
      </div>

      <main className="px-12 py-8 space-y-8 max-w-[620px] mx-auto">
        <section>
          <h2 className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-3 text-center" style={{ color: GOLD }}>Profil</h2>
          <EditText as="textarea" value={d.profil} editable={editable} onChange={(v) => actions.setField("profil", v)} className="text-[13.5px] leading-relaxed text-slate-700 text-center" placeholder="Kort personlig presentation" />
        </section>

        <section>
          <h2 className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-4 text-center pb-2 border-b border-slate-200" style={{ color: GOLD }}>Arbetslivserfarenhet</h2>
          <div className="space-y-6">
            {d.erfarenhet.map((e, i) => (
              <div key={i} className="relative text-center">
                <h3 className="text-[15px] font-semibold text-slate-900"><EditText value={e.roll} editable={editable} onChange={(v) => actions.setExp(i, "roll", v)} placeholder="Roll" /></h3>
                <div className="text-[12.5px] text-slate-500 italic"><EditText value={e.foretag} editable={editable} onChange={(v) => actions.setExp(i, "foretag", v)} placeholder="Företag" /></div>
                <div className="text-[11.5px] mb-1" style={{ color: GOLD }}><EditText value={e.period} editable={editable} onChange={(v) => actions.setExp(i, "period", v)} placeholder="Period" /></div>
                <EditText as="textarea" value={e.beskrivning} editable={editable} onChange={(v) => actions.setExp(i, "beskrivning", v)} className="text-[12.5px] leading-relaxed text-slate-600" placeholder="Beskrivning" />
                {editable && <button onClick={() => actions.removeExp(i)} className="no-print absolute -right-6 top-0"><X className="w-4 h-4 text-slate-300" /></button>}
              </div>
            ))}
            {editable && <button onClick={actions.addExp} className="no-print text-[12px] flex items-center gap-1 mx-auto" style={{ color: GOLD }}><Plus className="w-3 h-3" />Lägg till erfarenhet</button>}
          </div>
        </section>

        <section>
          <h2 className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-4 text-center pb-2 border-b border-slate-200" style={{ color: GOLD }}>Utbildning</h2>
          <div className="space-y-5">
            {d.utbildning.map((u, i) => (
              <div key={i} className="relative text-center">
                <h3 className="text-[15px] font-semibold text-slate-900"><EditText value={u.examen} editable={editable} onChange={(v) => actions.setEdu(i, "examen", v)} placeholder="Examen" /></h3>
                <div className="text-[12.5px] text-slate-500 italic"><EditText value={u.skola} editable={editable} onChange={(v) => actions.setEdu(i, "skola", v)} placeholder="Skola" /></div>
                <div className="text-[11.5px] mb-1" style={{ color: GOLD }}><EditText value={u.period} editable={editable} onChange={(v) => actions.setEdu(i, "period", v)} placeholder="Period" /></div>
                <EditText as="textarea" value={u.beskrivning} editable={editable} onChange={(v) => actions.setEdu(i, "beskrivning", v)} className="text-[12.5px] leading-relaxed text-slate-600" placeholder="Beskrivning" rows={2} />
                {editable && <button onClick={() => actions.removeEdu(i)} className="no-print absolute -right-6 top-0"><X className="w-4 h-4 text-slate-300" /></button>}
              </div>
            ))}
            {editable && <button onClick={actions.addEdu} className="no-print text-[12px] flex items-center gap-1 mx-auto" style={{ color: GOLD }}><Plus className="w-3 h-3" />Lägg till utbildning</button>}
          </div>
        </section>

        <section>
          <h2 className="text-[11px] tracking-[0.3em] uppercase font-semibold mb-4 text-center pb-2 border-b border-slate-200" style={{ color: GOLD }}>Färdigheter & Språk</h2>
          <div className="grid grid-cols-2 gap-6 text-center">
            <div className="space-y-1 text-[12.5px] text-slate-600">
              {d.fardigheter.map((f, i) => (
                <div key={i} className="flex items-center justify-center gap-1">
                  <EditText value={f.namn} editable={editable} onChange={(v) => actions.setSkill(i, "namn", v)} placeholder="Färdighet" />
                  {editable && <button onClick={() => actions.removeSkill(i)} className="no-print"><X className="w-3 h-3 text-slate-300" /></button>}
                </div>
              ))}
              {editable && <button onClick={actions.addSkill} className="no-print text-[12px] flex items-center gap-1 mx-auto" style={{ color: GOLD }}><Plus className="w-3 h-3" />Lägg till</button>}
            </div>
            <div className="space-y-1 text-[12.5px] text-slate-600">
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
          </div>
        </section>
      </main>
    </div>
  );
}