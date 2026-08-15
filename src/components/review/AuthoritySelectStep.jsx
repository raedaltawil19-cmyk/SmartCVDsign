import { AUTHORITY_QUESTION, OTHER_AUTHORITY } from "@/lib/agent/authoritySelection";

/**
 * اختيار الجهة — واجهة مصغّرة مخصّصة: السؤال + خيارات الجهات فقط.
 * لا تعرض relevant، ولا confirmationRequired، ولا draft، ولا نصوص الأدلّة، ولا محتوى المصادر،
 * ولا أي حقل نصّ حرّ للسيرة. حقل الاسم يظهر فقط مع «Annan myndighet» ويقبل اسم جهة لا نصّ سيرة.
 */
export default function AuthoritySelectStep({ options, selected, onSelect, otherName, onOtherName }) {
  const all = [...options.map((o) => o.name), OTHER_AUTHORITY];
  return (
    <div>
      <p className="text-[13px] font-semibold text-slate-800 mb-2" dir="ltr">{AUTHORITY_QUESTION}</p>
      <div className="space-y-1.5">
        {all.map((name) => (
          <label
            key={name}
            dir="ltr"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
              selected === name ? "border-[#000066] bg-[#000066]/5" : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name="authority"
              checked={selected === name}
              onChange={() => onSelect(name)}
              className="accent-[#000066]"
            />
            <span className="text-[12px] text-slate-800">{name}</span>
          </label>
        ))}
      </div>

      {selected === OTHER_AUTHORITY && (
        <input
          dir="ltr"
          value={otherName}
          onChange={(e) => onOtherName(e.target.value)}
          placeholder="Myndighetens namn"
          className="inp mt-2"
        />
      )}
    </div>
  );
}