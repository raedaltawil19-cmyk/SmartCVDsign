/**
 * اختبارات فصل اللغتين: لغة الواجهة (تواصل) ولغة السيرة (نصّ تنفيذي).
 * نقية بالكامل: بلا وكيل ولا واجهة ولا شبكة.
 * لا تعمل تلقائياً — استدعِ runCVLanguageTests() في Console أو صفحة تشخيص.
 */
import { detectCVLanguage, cvLanguageTag } from "./cvLanguage";
import { buildReviewIntent, formatIntentMessage, formatConfirmedIntentMessage, formatLanguageRule } from "./reviewIntent";
import { buildCVContextBlock } from "./cvReviewSession";
import { composeDraft, buildConfirmedEvidence } from "./reviewEvidence";

const SV_CV = {
  namn: "Anna Lind",
  titel: "Systemutvecklare",
  profil: "Systemutvecklare med erfarenhet av utveckling och ansvar för kunder inom offentlig sektor.",
  erfarenhet: [{ roll: "Utvecklare", foretag: "Nordkod AB", period: "2020–2024", beskrivning: "Ledde arbetet med integrationer och utvecklade tjänster för kunder." }],
  utbildning: [{ examen: "Kandidatexamen i informatik", skola: "Uppsala universitet", period: "2016–2019", beskrivning: "" }],
  fardigheter: [{ namn: "Java", niva: 80 }],
  sprak: [{ sprak: "Svenska", niva: "Flytande" }]
};

const EN_CV = {
  namn: "Anna Lind",
  titel: "Software Engineer",
  profil: "Software engineer with experience of development and responsible for clients within the public sector.",
  erfarenhet: [{ roll: "Engineer", foretag: "Nordcode Ltd", period: "2020–2024", beskrivning: "Led the work with integrations and developed services for clients." }],
  utbildning: [{ examen: "Bachelor degree in informatics", skola: "University of Uppsala", period: "2016–2019", beskrivning: "" }],
  fardigheter: [{ namn: "Java", niva: 80 }],
  sprak: [{ sprak: "English", niva: "Flytande" }]
};

const AR_CV = {
  namn: "أنس لند",
  titel: "مهندس برمجيات",
  profil: "مهندس برمجيات لديه خبرة في تطوير الأنظمة ومسؤول عن العملاء في القطاع العام.",
  erfarenhet: [{ roll: "مهندس", foretag: "شركة نوردكود", period: "2020–2024", beskrivning: "قاد العمل على التكاملات وطوّر خدمات للعملاء." }],
  utbildning: [],
  fardigheter: [],
  sprak: []
};

const INDEX = [{ section: "erfarenhet", items: [{ id: "experience_1", fields: [] }] }];

const REC = {
  id: "r1",
  type: "content",
  severity: "necessary",
  title: "تحويل الوصف إلى إنجازات",
  problem: "الوصف يركّز على المسؤوليات.",
  why: "الإنجازات توضح القيمة.",
  recommendation: "إعادة الصياغة بنتائج قابلة للقياس.",
  target: { section: "erfarenhet", itemRef: "experience_1", field: "beskrivning" },
  dependsOn: []
};

const intentFor = (cvData, uiLanguage) =>
  buildReviewIntent({
    rec: REC,
    selectedIds: ["r1"],
    cvId: "cv1",
    templateId: "stockholm",
    indexSummary: INDEX,
    cvLanguage: cvLanguageTag(cvData),
    uiLanguage
  });

export function runCVLanguageTests() {
  const results = [];
  const add = (name, pass, note) => results.push({ name, pass: !!pass, note: typeof note === "string" ? note : JSON.stringify(note) });

  // 0) كشف لغة السيرة من محتواها لا من لغة المحادثة
  add("0. كشف لغة السيرة من المحتوى",
    detectCVLanguage(SV_CV).code === "sv" &&
    detectCVLanguage(EN_CV).code === "en" &&
    detectCVLanguage(AR_CV).code === "ar" &&
    detectCVLanguage({}).code === "unknown",
    [detectCVLanguage(SV_CV).code, detectCVLanguage(EN_CV).code, detectCVLanguage(AR_CV).code, detectCVLanguage({}).code]);

  // CASE A: واجهة عربية + سيرة سويدية
  {
    const r = intentFor(SV_CV, "ar");
    const msg = formatIntentMessage(r.intent);
    add("A. UI=ar / CV=sv",
      r.ok && r.intent.context.cvLanguage.code === "sv" && r.intent.context.uiLanguage === "ar" &&
      msg.includes("Swedish") && msg.includes("(ar)"),
      [r.intent?.context, msg.includes("Swedish")]);
  }
  // CASE B: واجهة إنجليزية + سيرة سويدية
  {
    const r = intentFor(SV_CV, "en");
    const msg = formatIntentMessage(r.intent);
    add("B. UI=en / CV=sv",
      r.ok && r.intent.context.cvLanguage.code === "sv" && r.intent.context.uiLanguage === "en" && msg.includes("Swedish"),
      r.intent?.context);
  }
  // CASE C: واجهة عربية + سيرة إنجليزية
  {
    const r = intentFor(EN_CV, "ar");
    const msg = formatIntentMessage(r.intent);
    add("C. UI=ar / CV=en",
      r.ok && r.intent.context.cvLanguage.code === "en" && r.intent.context.uiLanguage === "ar" && msg.includes("English"),
      r.intent?.context);
  }
  // CASE D: واجهة إنجليزية + سيرة إنجليزية
  {
    const r = intentFor(EN_CV, "en");
    add("D. UI=en / CV=en",
      r.ok && r.intent.context.cvLanguage.code === "en" && r.intent.context.uiLanguage === "en", r.intent?.context);
  }

  // 1) لغة السيرة معلنة في كتلة السياق المرسلة للمراجعة
  {
    const block = buildCVContextBlock({ cvId: "cv1", templateId: "stockholm", layout: { main: [] }, data: SV_CV });
    add("1. cvLanguage معلنة في CV_CONTEXT", typeof block === "string" && block.includes("\"cvLanguage\"") && block.includes("\"sv\""), (block || "").slice(0, 40));
  }

  // 2) لغة غير معروفة ⇒ لا افتراض ولا تخمين، بل قاعدة تطلب السؤال
  {
    const r = buildReviewIntent({ rec: REC, selectedIds: ["r1"], cvId: "cv1", templateId: "stockholm", indexSummary: INDEX, cvLanguage: cvLanguageTag({}), uiLanguage: "ar" });
    add("2. لغة سيرة غير معروفة تُعلن ولا تُخمَّن",
      r.ok && r.intent.context.cvLanguage.code === "unknown" && formatLanguageRule(r.intent).includes("unknown"),
      r.intent?.context?.cvLanguage);
  }

  // 3) الاختيار/الإرسال ليس تطبيقاً تلقائياً: لا CV_ACTION ولا حمولة كتابة في الـIntent
  {
    const r = intentFor(SV_CV, "ar");
    const msg = formatIntentMessage(r.intent);
    add("3. لا تطبيق تلقائي ولا CV_ACTION في الـIntent",
      !msg.includes("<<<CV_ACTION") && !("action" in r.intent) &&
      !Object.keys(r.intent).some((k) => /data|payload|update/i.test(k)), Object.keys(r.intent));
  }

  // 4) confirmedValue يُحفظ حرفياً ولا يُترجَم
  {
    const request = { section: "erfarenhet", itemRef: "experience_1", field: "beskrivning", currentValue: "Gammal text" };
    const svText = "Ledde införandet av ett nytt system och minskade handläggningstiden.";
    const res = buildConfirmedEvidence({ request, confirmed: [], userText: "", finalText: svText });
    const r = intentFor(SV_CV, "ar");
    const msg = formatConfirmedIntentMessage(r.intent, res.evidence);
    add("4. confirmedValue محفوظ حرفياً وممنوع ترجمته",
      res.ok && res.evidence.confirmedValue === svText && msg.includes(svText) && msg.includes("لا تترجمه"),
      res.evidence?.confirmedValue);
  }

  // 5) composeDraft محيَّدة لغوياً ولا تبني قيمة إلا من إجابة المستخدم
  {
    const out = composeDraft({ userText: "Java, SQL" });
    const ignored = composeDraft({ currentValue: "Systemutvecklare", confirmed: ["تأكيد الجهة"], userText: "" });
    add("5. composeDraft محيَّدة لغوياً وتعتمد إجابة المستخدم وحدها",
      !/\b(och|inom|and|within|و)\b/i.test(out) && out === "Java, SQL" && ignored === "",
      `${out} | ${ignored}`);
  }

  // 6) عقد CV_REVIEW لم يتغيّر: لا حقول لغة أُضيفت إلى التوصية أو evidencePack
  {
    const r = intentFor(SV_CV, "ar");
    const recKeys = Object.keys(REC);
    add("6. عقد التوصية سليم واللغة في context فقط",
      !recKeys.some((k) => /lang/i.test(k)) &&
      "cvLanguage" in r.intent.context && !("cvLanguage" in r.intent) && r.intent.evidencePack === null,
      Object.keys(r.intent.context));
  }

  const passed = results.filter((x) => x.pass).length;
  return { passed, total: results.length, allPassed: passed === results.length, results };
}

export default runCVLanguageTests;