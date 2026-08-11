import { EditText } from "./Editable";

/**
 * شريط التواصل — يعرض حقول التواصل مع فواصل بينها.
 * في وضع المعاينة: يعرض الحقول غير الفارغة فقط (لا placeholder، لا فواصل زائدة).
 * في وضع التحرير: يعرض كل الحقول مع placeholders وفواصل.
 */
export default function ContactBar({ kontakt, editable, actions, separator = "|", separatorClassName = "", itemClassName = "", containerClassName = "" }) {
  const fields = [
    { key: "telefon", placeholder: "Telefon" },
    { key: "epost", placeholder: "E-post" },
    { key: "adress", placeholder: "Adress" },
    { key: "linkedin", placeholder: "LinkedIn" },
  ];

  // في وضع المعاينة: نعرض الحقول غير الفارغة فقط
  const visible = editable ? fields : fields.filter((f) => kontakt[f.key]);

  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-1 ${containerClassName}`}>
      {visible.map((f, i) => (
        <div key={f.key} className="flex items-center gap-x-4">
          {i > 0 && <span className={separatorClassName}>{separator}</span>}
          <EditText
            value={kontakt[f.key]}
            editable={editable}
            onChange={(v) => actions.setContact(f.key, v)}
            placeholder={f.placeholder}
            className={itemClassName}
          />
        </div>
      ))}
    </div>
  );
}