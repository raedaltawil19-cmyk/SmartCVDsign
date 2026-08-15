import { useState } from "react";
import { X, ShieldCheck } from "lucide-react";
import EvidenceCollectStep from "@/components/review/EvidenceCollectStep";
import ResearchSourcesView from "@/components/review/ResearchSourcesView";
import EvidenceDraftStep from "@/components/review/EvidenceDraftStep";
import DraftApprovalOption from "@/components/review/DraftApprovalOption";
import AuthoritySelectStep from "@/components/review/AuthoritySelectStep";
import AuthorityConfirmStep from "@/components/review/AuthorityConfirmStep";
import { composeDraft, buildConfirmedEvidence, describeEvidenceError } from "@/lib/agent/reviewEvidence";
import { isAuthorityCase, authorityOptions, buildAuthorityValue, AUTHORITY_ERROR_MESSAGES } from "@/lib/agent/authoritySelection";

/**
 * Recommendation Evidence / Confirmation — مرحلة وسيطة قبل مساعد السيرة.
 * لا تكتب إلى SavedCV، ولا تُنشئ CV_ACTION، ولا تفتح مساعد السيرة.
 * الإرسال يحدث فقط عبر onConfirm بعد تأكيد المستخدم صراحةً.
 */
export default function EvidenceDialog({ request, index = 1, total = 1, onConfirm, onSkip, onCancel }) {
  const [step, setStep] = useState("collect");
  const [picked, setPicked] = useState([]);
  const [useDraft, setUseDraft] = useState(false);
  const [userText, setUserText] = useState("");
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  // مسار الجهة المصغّر — حالة مستقلّة تماماً عن مسار الأدلّة العام
  const authorityMode = isAuthorityCase(request);
  const options = authorityMode ? authorityOptions(request.research) : [];
  const [authority, setAuthority] = useState("");
  const [otherName, setOtherName] = useState("");
  const [authorityValue, setAuthorityValue] = useState("");

  const togglePick = (label) =>
    setPicked((p) => (p.includes(label) ? p.filter((x) => x !== label) : [...p, label]));

  /**
   * القيمة المرشَّحة تُبنى من **إجابة المستخدم** وحدها، أو من صياغة مقترحة اعتمدها صراحةً.
   * نقاط التأكيد (picked) لا تدخل النصّ إطلاقاً — إقرار لا قيمة.
   */
  const toDraft = () => {
    const answer = userText.trim();
    const approvedDraft = useDraft && request.draft ? request.draft : "";
    if (!answer && !approvedDraft) {
      setError("اكتب إجابتك، أو اعتمد الصياغة المقترحة صراحةً.");
      return;
    }
    setError("");
    setText(
      approvedDraft
        ? [approvedDraft, answer].filter(Boolean).join(" ")
        : composeDraft({ userText: answer })
    );
    setStep("draft");
  };

  /** مسار الجهة: الاختيار وحده يبني القيمة السويدية، ثم تُعرض للتأكيد قبل الإرسال */
  const toAuthorityDraft = () => {
    const res = buildAuthorityValue({ request, selected: authority, otherName });
    if (!res.ok) { setError(AUTHORITY_ERROR_MESSAGES[res.error] || describeEvidenceError(res.error)); return; }
    setError("");
    setAuthorityValue(res.value);
    setAuthority(res.authorityName);
    setStep("draft");
  };

  const confirmAuthority = () => {
    const res = buildConfirmedEvidence({ request, confirmed: [authority], userText: "", finalText: authorityValue });
    if (!res.ok) { setError(describeEvidenceError(res.error)); return; }
    onConfirm(res.evidence);
  };

  const confirm = () => {
    const res = buildConfirmedEvidence({ request, confirmed: picked, userText, finalText: text });
    if (!res.ok) { setError(describeEvidenceError(res.error)); return; }
    onConfirm(res.evidence);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
          <ShieldCheck className="w-4 h-4 text-[#000066]" />
          <h3 className="text-[13px] font-semibold text-slate-800">{request.title || "تأكيد المعلومات"}</h3>
          {total > 1 && <span className="text-[10px] text-slate-400">{index} / {total}</span>}
          <button onClick={onCancel} className="mr-auto text-slate-400 hover:text-slate-700 transition-colors" aria-label="إلغاء">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
            {authorityMode
              ? "لم يتم تطبيق أي شيء بعد. ما يُكتب في سيرتك يُبنى من الجهة التي تختارها أنت فقط — لا السؤال ولا نصوص المصادر."
              : "لم يتم تطبيق أي شيء بعد. ما يُكتب في سيرتك هو إجابتك أنت فقط — لا السؤال ولا نصوص السياق ولا نتائج المصادر."}
          </p>

          {/* بحث خارجي مجهَّز مسبقاً — عرض فقط، ولا يبدأ بحثاً جديداً ولا يصبح معلومة مؤكَّدة عن المستخدم */}
          {!authorityMode && step === "collect" && request.research && <ResearchSourcesView research={request.research} />}

          {!authorityMode && step === "collect" && (
            <div className="mb-3">
              <DraftApprovalOption draft={request.draft} checked={useDraft} onToggle={() => setUseDraft((v) => !v)} />
            </div>
          )}

          {authorityMode ? (
            step === "collect" ? (
              <AuthoritySelectStep
                options={options}
                selected={authority}
                onSelect={setAuthority}
                otherName={otherName}
                onOtherName={setOtherName}
              />
            ) : (
              <AuthorityConfirmStep authorityName={authority} currentValue={request.currentValue} value={authorityValue} />
            )
          ) : step === "collect" ? (
            <EvidenceCollectStep
              request={request}
              picked={picked}
              onPick={togglePick}
              userText={userText}
              onUserText={setUserText}
            />
          ) : (
            <EvidenceDraftStep
              request={request}
              confirmed={picked}
              text={text}
              onText={setText}
              editing={editing}
              onEdit={() => setEditing(true)}
            />
          )}

          {error && <p className="mt-2 text-[11px] text-amber-700">{error}</p>}
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-100 bg-slate-50">
          {step === "draft" ? (
            <>
              <button type="button" onClick={() => setStep("collect")} className="text-[12px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                رجوع
              </button>
              <button type="button" onClick={onSkip} className="text-[12px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                رفض التوصية
              </button>
              <button type="button" onClick={authorityMode ? confirmAuthority : confirm} className="mr-auto text-[12px] px-3 py-1.5 rounded-lg bg-[#000066] text-white hover:bg-[#00003d] transition-colors">
                استخدام الاقتراح وإرساله للتنفيذ
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onSkip} className="text-[12px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                رفض التوصية
              </button>
              <button type="button" onClick={onCancel} className="text-[12px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                العودة إلى التوصيات
              </button>
              <button type="button" onClick={authorityMode ? toAuthorityDraft : toDraft} className="mr-auto text-[12px] px-3 py-1.5 rounded-lg bg-[#000066] text-white hover:bg-[#00003d] transition-colors">
                {authorityMode ? "اعتماد الجهة وإعداد التعديل" : "اعتماد إجابتي وإعداد التعديل"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}