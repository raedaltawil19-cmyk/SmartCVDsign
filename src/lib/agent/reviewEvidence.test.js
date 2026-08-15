/**
 * اختبارات طبقة التأكيد: فصل السؤال / نقاط الإقرار / السياق عن **قيمة السيرة**.
 * منطق نقيّ: لا React، لا شبكة، لا كتابة.
 */
import { buildEvidenceRequest, buildConfirmedEvidence, composeDraft } from "@/lib/agent/reviewEvidence";
import { checkValueLanguage } from "@/lib/agent/cvLanguageGuard";
import { buildCVIndex, summarizeIndex } from "@/lib/agent/cvIndex";

const CV = {
  namn: "Ali", titel: "Jurist", kontakt: { telefon: "07", epost: "a@b.se" },
  profil: "Jurist.", erfarenhet: [],
  utbildning: [{ examen: "Juristexamen", skola: "Damascus University", period: "2010-2015", beskrivning: "Juridikstudier vid universitetet." }],
  fardigheter: [], sprak: []
};
const SV = { code: "sv", label: "Swedish (svenska)", confident: true, source: "cv_content" };
const QUESTION = "من الجهة التي قيّمت الشهادة؟";
const CONFIRM = "تأكيد الجهة التي أجرت التقييم";
const RELEVANT = "الشهادة أجنبية والتقييم يذكر عادة في وصف التعليم";

const itemRef = () => summarizeIndex(buildCVIndex(CV)).find((s) => s.section === "utbildning").items[0].id;

const intentFor = (packOverride = {}) => ({
  recommendationId: "r1",
  title: "وضّح تقييم الشهادة",
  problem: "غير واضح",
  why: "مهم",
  recommendation: QUESTION,
  target: { section: "utbildning", itemRef: itemRef(), field: "beskrivning" },
  evidencePack: {
    status: "needs_user",
    assessment: { isValidRecommendation: true, reason: "لا ذكر لجهة التقييم", confidence: "high" },
    existing: ["Juristexamen"], relevant: [RELEVANT], missing: ["اسم الجهة"],
    draft: null, userConfirmationRequired: [CONFIRM],
    ...packOverride
  },
  context: { templateId: "stockholm", cvLanguage: SV, uiLanguage: "ar" }
});

const requestFor = (packOverride) => buildEvidenceRequest({ intent: intentFor(packOverride), data: CV }).request;
const hasArabic = (v) => /[\u0621-\u064A]/.test(String(v));

export function runEvidenceValueTests() {
  const results = [];
  const t = (name, fn) => {
    try { const r = fn(); results.push({ name, pass: r === true, note: r === true ? "" : String(r) }); }
    catch (e) { results.push({ name, pass: false, note: e.message }); }
  };

  // A — إجابة المستخدم وحدها هي القيمة
  t("A. answer 'UHR' ⇒ confirmedValue = 'UHR'", () => {
    const request = requestFor();
    const finalText = composeDraft({ userText: "UHR" });
    const res = buildConfirmedEvidence({ request, confirmed: [CONFIRM], userText: "UHR", finalText });
    return res.ok && res.evidence.confirmedValue === "UHR" ? true : JSON.stringify(res);
  });

  // B — لا حرف عربي واحد في قيمة سيرة سويدية
  t("B. CV سويدي ⇒ لا كلمة عربية في القيمة", () => {
    const request = requestFor();
    const res = buildConfirmedEvidence({ request, confirmed: [CONFIRM], userText: "UHR", finalText: composeDraft({ userText: "UHR" }) });
    return res.ok && !hasArabic(res.evidence.confirmedValue) ? true : "arabic leaked";
  });

  // C — بند التأكيد لا يظهر في القيمة، ويبقى كسياق مؤكَّد فقط
  t("C. confirmationRequired ليس قيمة", () => {
    const request = requestFor();
    const res = buildConfirmedEvidence({ request, confirmed: [CONFIRM], userText: "UHR", finalText: composeDraft({ userText: "UHR" }) });
    return res.ok && !res.evidence.confirmedValue.includes(CONFIRM) && res.evidence.confirmedFacts.includes(CONFIRM)
      ? true : JSON.stringify(res.evidence);
  });

  // D — السياق العربي لا يصبح قيمة، ولا يُعرض كبند قابل للاختيار
  t("D. relevant ليس قيمة ولا خياراً", () => {
    const request = requestFor();
    const notSelectable = !request.confirmationRequired.includes(RELEVANT);
    const composed = composeDraft({ userText: "UHR" });
    return notSelectable && !composed.includes(RELEVANT) ? true : "relevant leaked";
  });

  // E — البحث الخارجي لا يتحول تلقائياً إلى قيمة
  t("E. external research لا يصبح confirmedValue", () => {
    const request = { ...requestFor(), research: { status: "ready", sources: [{ title: "UHR", url: "https://uhr.se", publisher: "uhr.se", sourceType: "official_authority", isPrimary: true, retrievedContent: "UHR evaluates foreign qualifications", retrievalStatus: "fetched" }] } };
    const empty = buildConfirmedEvidence({ request, confirmed: [], userText: "", finalText: composeDraft({ userText: "" }) });
    return empty.ok === false && empty.error === "EMPTY_VALUE" ? true : JSON.stringify(empty);
  });

  // F — draft لا يصبح قيمة بلا اعتماد صريح (السلوك مفروض في الواجهة: بلا إجابة وبلا اعتماد ⇒ لا نصّ)
  t("F. draft بلا مساهمة صريحة ⇒ لا قيمة", () => {
    const request = requestFor({ draft: "Juridikstudier. Examen bedömd av behörig myndighet." });
    const res = buildConfirmedEvidence({ request, confirmed: [], userText: "", finalText: composeDraft({ userText: "" }) });
    return res.ok === false && res.error === "EMPTY_VALUE" ? true : JSON.stringify(res);
  });

  // G — قناة واحدة: القيمة تساوي ما اعتمده المستخدم حرفياً، ولا يشتقّها النظام من السؤال/السياق
  t("G. لا قناة أخرى تبني القيمة", () => {
    const request = requestFor();
    const forbidden = [request.question, CONFIRM, RELEVANT, request.problem, request.why, request.reason];
    const res = buildConfirmedEvidence({ request, confirmed: [CONFIRM], userText: "UHR", finalText: composeDraft({ userText: "UHR" }) });
    return res.ok && forbidden.every((f) => f && !res.evidence.confirmedValue.includes(f)) ? true : "value derived from question/context";
  });

  // الحاجز اللغوي fail-closed
  t("H. قيمة عربية + سيرة سويدية ⇒ رفض", () => {
    const request = requestFor();
    const res = buildConfirmedEvidence({ request, confirmed: [], userText: CONFIRM, finalText: CONFIRM });
    return res.ok === false && res.error === "VALUE_LANGUAGE_MISMATCH" ? true : JSON.stringify(res);
  });
  t("I. لغة سيرة غير معروفة + قيمة عربية ⇒ رفض", () => {
    const request = { ...requestFor(), cvLanguage: null };
    const res = buildConfirmedEvidence({ request, confirmed: [], userText: "شيء", finalText: "شيء" });
    return res.ok === false && res.error === "CV_LANGUAGE_UNKNOWN" ? true : JSON.stringify(res);
  });
  t("J. سيرة عربية تقبل نصاً عربياً", () => {
    const request = { ...requestFor(), cvLanguage: { code: "ar", label: "العربية" } };
    const res = buildConfirmedEvidence({ request, confirmed: [], userText: "المجلس الأعلى", finalText: "المجلس الأعلى" });
    return res.ok === true && res.evidence.confirmedValue === "المجلس الأعلى" ? true : JSON.stringify(res);
  });
  t("K. الحاجز لا يمسّ نصاً سويدياً", () => {
    const g = checkValueLanguage({ value: "Examen bedömd av UHR.", cvLanguage: SV });
    return g.ok === true ? true : JSON.stringify(g);
  });
  t("L. request يحمل لغة السيرة من الـIntent", () => {
    const request = requestFor();
    return request.cvLanguage?.code === "sv" ? true : JSON.stringify(request.cvLanguage);
  });

  return { total: results.length, passed: results.filter((r) => r.pass).length, results };
}

export default runEvidenceValueTests;