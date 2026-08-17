import { EditText } from "./Editable";
import { Plus, X } from "lucide-react";

/** عنوان قسم المراجع: عنوان المستخدم إن وُجد، وإلا الافتراضي */
export const referencesTitle = (d) => ((d?.referencesTitel || "").trim() || "Referenser");
/** إخفاء/إظهار القسم بالكامل */
export const referencesHidden = (d) => d?.referencesDold === true;

const PLACEHOLDERS = {
  namn: "Namn",
  relation: "Relation / titel",
  organisation: "Organisation",
  telefon: "Telefon",
  epost: "E-post",
  anteckning: "Övrig text (t.ex. Referenser lämnas på begäran)"
};

const join = (parts) => parts.filter((p) => String(p || "").trim()).join(" · ");

/**
 * عناصر المراجع — بنية مشتركة لكل القوالب، بنفس البيانات (data.references).
 * كل الحقول اختيارية: الحقول الفارغة لا تُرسم إطلاقاً فلا تُحدث فراغات.
 * التنسيق يأتي من القالب عبر الـclassNames حتى تبقى هوية كل قالب كما هي.
 */
export default function ReferenceEntries({
  d, editable, actions,
  wrapperClassName = "space-y-3",
  itemClassName = "relative cv-keep",
  nameClassName = "",
  metaClassName = "",
  metaStyle,
  contactClassName = "",
  noteClassName = "",
  addClassName = "",
  addStyle,
  removeClassName = "no-print absolute -right-6 top-0"
}) {
  const list = d.references || [];
  return (
    <div className={wrapperClassName}>
      {list.map((r, i) => {
        const meta = join([r.relation, r.organisation]);
        const contact = join([r.telefon, r.epost]);
        return (
          <div key={i} className={itemClassName}>
            {editable ? (
              <>
                {["namn", "relation", "organisation", "telefon", "epost", "anteckning"].map((f) => (
                  <div key={f} className={f === "namn" ? nameClassName : f === "anteckning" ? noteClassName : f === "relation" || f === "organisation" ? metaClassName : contactClassName} style={f === "relation" || f === "organisation" ? metaStyle : undefined}>
                    <EditText value={r[f]} editable onChange={(v) => actions.setRef(i, f, v)} placeholder={PLACEHOLDERS[f]} />
                  </div>
                ))}
                <button onClick={() => actions.removeRef(i)} className={removeClassName}><X className="w-4 h-4 text-slate-300" /></button>
              </>
            ) : (
              <>
                {r.namn && <h3 className={nameClassName}>{r.namn}</h3>}
                {meta && <div className={metaClassName} style={metaStyle}>{meta}</div>}
                {contact && <div className={contactClassName}>{contact}</div>}
                {r.anteckning && <div className={noteClassName}>{r.anteckning}</div>}
              </>
            )}
          </div>
        );
      })}
      {editable && (
        <button onClick={actions.addRef} className={`no-print flex items-center gap-1 ${addClassName}`} style={addStyle}>
          <Plus className="w-3 h-3" />Lägg till referens
        </button>
      )}
    </div>
  );
}