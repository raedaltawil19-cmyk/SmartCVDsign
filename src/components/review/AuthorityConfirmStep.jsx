/**
 * تأكيد الصياغة السويدية الناتجة عن الجهة المختارة — عرض فقط.
 * لا تُعرض هنا أدلّة ولا مصادر ولا نصوص عربية تنفيذية: النصّ المعروض هو ما سيُكتب حرفياً.
 */
export default function AuthorityConfirmStep({ authorityName, currentValue, value }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-[11px] text-slate-500 mb-1">الجهة التي أكّدتها</p>
        <p dir="ltr" className="text-[12px] text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2">{authorityName}</p>
      </div>
      <div>
        <p className="text-[11px] text-slate-500 mb-1">النصّ الحالي في سيرتك</p>
        <p dir="ltr" className="text-[12px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 whitespace-pre-wrap">
          {currentValue || "—"}
        </p>
      </div>
      <div>
        <p className="text-[11px] text-slate-500 mb-1">النصّ الذي سيُكتب (بلغة سيرتك)</p>
        <p dir="ltr" className="text-[12px] text-slate-900 bg-white border border-[#000066]/30 rounded-xl px-3 py-2 whitespace-pre-wrap">
          {value}
        </p>
      </div>
    </div>
  );
}