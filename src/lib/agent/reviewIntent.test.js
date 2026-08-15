/**
 * اختبارات معزولة لقناة M6 (توصية مختارة → Intent → Smart CV Assistant).
 * نقية بالكامل: بلا وكيل ولا واجهة ولا قاعدة بيانات.
 * لا تعمل تلقائياً — استدعِ runReviewIntentTests() في Console أو صفحة تشخيص.
 */
import { buildReviewIntent, buildSelectedIntents, formatIntentMessage, INTENT_OPEN, INTENT_CLOSE } from "./reviewIntent";
import * as reviewParser from "./cvReviewParser";
import useCVReviewModule from "./useCVReview";
import * as reviewSession from "./cvReviewSession";

const INDEX = [
  { section: "erfarenhet", items: [{ id: "experience_8f31a", fields: [] }, { id: "experience_1b2c3", fields: [] }] },
  { section: "profil", items: [{ id: "profile_main", fields: [] }] }
];

const REC = (over = {}) => ({
  id: "r1",
  type: "content",
  severity: "necessary",
  title: "تحويل الوصف إلى إنجازات",
  problem: "الوصف يركّز على المسؤوليات.",
  why: "الإنجازات توضح القيمة المضافة.",
  recommendation: "إعادة صياغة النقاط بنتائج قابلة للقياس.",
  target: { section: "erfarenhet", itemRef: "experience_8f31a" },
  dependsOn: [],
  ...over
});

const REVIEW = (recs) => ({ reviewStatus: "improvements_found", summary: "ملخّص.", recommendations: recs });
const BASE = { cvId: "cv1", templateId: "stockholm", indexSummary: INDEX };

export function runReviewIntentTests() {
  const results = [];
  const add = (name, pass, note) => results.push({ name, pass: !!pass, note: typeof note === "string" ? note : JSON.stringify(note) });

  // A) توصية مختارة → Intent كامل جاهز للتسليم
  {
    const r = buildReviewIntent({ ...BASE, rec: REC(), selectedIds: ["r1"] });
    const need = ["recommendationId", "type", "severity", "title", "problem", "why", "recommendation", "target", "dependsOn", "cvId", "context"];
    add("A. توصية مختارة تصل كـIntent كامل",
      r.ok && need.every((k) => k in r.intent) && r.intent.recommendationId === "r1", r.error || Object.keys(r.intent || {}));
  }
  // B) توصية غير مختارة لا تصل للتنفيذ
  {
    const one = buildReviewIntent({ ...BASE, rec: REC(), selectedIds: [] });
    const many = buildSelectedIntents({ ...BASE, review: REVIEW([REC(), REC({ id: "r2", target: { section: "profil" } })]), selectedIds: ["r2"] });
    add("B. غير المختارة لا تصل",
      one.ok === false && one.error === "NOT_SELECTED" &&
      many.intents.length === 1 && many.intents[0].recommendationId === "r2", [one.error, many.intents.map((i) => i.recommendationId)]);
  }
  // C+D+J) Review Coach لا يكتب ولا يستدعي أدوات كتابة (فحص بنيوي على مصادره)
  {
    const forbidden = ["cvRepository", "SavedCV", "runCvEditContent", "runCvMoveSection", "executeAssistantAction", "setData", "setLayout", "setTemplateId"];
    const surfaces = { ...reviewParser, ...reviewSession, useCVReview: useCVReviewModule };
    const leaked = forbidden.filter((n) => n in surfaces);
    const writers = Object.keys(surfaces).filter((k) => /update|create|save|delete|write/i.test(k));
    add("C+D+J. مسار المراجعة بلا أي واجهة كتابة", leaked.length === 0 && writers.length === 0, [leaked, writers]);
  }
  // E) الـIntent لا يحمل أمر تنفيذ — التنفيذ حصراً عبر مسار المساعد (CV_ACTION)
  {
    const r = buildReviewIntent({ ...BASE, rec: REC(), selectedIds: ["r1"] });
    const msg = formatIntentMessage(r.intent);
    add("E. نقطة التنفيذ واحدة: لا CV_ACTION في الـIntent",
      msg.includes(INTENT_OPEN) && msg.includes(INTENT_CLOSE) && !msg.includes("CV_ACTION") && !("action" in r.intent), msg.slice(0, 60));
  }
  // F) هدف غير صالح مرفوض
  {
    const bad = buildReviewIntent({ ...BASE, rec: REC({ target: { section: "CV" } }), selectedIds: ["r1"] });
    const ok = buildReviewIntent({ ...BASE, rec: REC({ type: "layout", target: { section: "layout" } }), selectedIds: ["r1"] });
    add("F. الهدف يجب أن يكون صالحاً", bad.ok === false && bad.error === "TARGET_SECTION_INVALID" && ok.ok === true, [bad.error, ok.error]);
  }
  // G) itemRef غير قابل للتحقّق → لا تنفيذ تخميني
  {
    const r1 = buildReviewIntent({ ...BASE, indexSummary: null, rec: REC(), selectedIds: ["r1"] });
    const r2 = buildReviewIntent({ ...BASE, indexSummary: null, rec: REC({ target: { section: "erfarenhet" } }), selectedIds: ["r1"] });
    add("G. itemRef غير قابل للتحقّق مرفوض (والهدف القسمي مقبول)",
      r1.ok === false && r1.error === "ITEM_REF_UNVERIFIABLE" && r2.ok === true, [r1.error, r2.error]);
  }
  // H) تغيّرت السيرة بعد التوصية → لا تنفيذ أعمى
  {
    const changed = [{ section: "erfarenhet", items: [{ id: "experience_9zzzz", fields: [] }] }];
    const r = buildReviewIntent({ ...BASE, indexSummary: changed, rec: REC(), selectedIds: ["r1"] });
    add("H. هدف قديم بعد تغيّر السيرة مرفوض", r.ok === false && r.error === "TARGET_STALE", r.error);
  }
  // I) الـIntent يحمل cvId ولا يحمل أي حمولة كتابة على SavedCV
  {
    const r = buildReviewIntent({ ...BASE, rec: REC(), selectedIds: ["r1"] });
    const keys = Object.keys(r.intent);
    add("I. Intent يحدّد cvId بلا حمولة كتابة",
      r.intent.cvId === "cv1" && !keys.some((k) => /data|layout|templateId|payload|update/i.test(k)), keys);
  }
  // K) تعدد التوصيات لا يعني موافقة جماعية + التبعية لا تُنفَّذ تلقائياً
  {
    const review = REVIEW([REC(), REC({ id: "r2", target: { section: "profil" }, dependsOn: ["r1"] })]);
    const onlyDependent = buildSelectedIntents({ ...BASE, review, selectedIds: ["r2"] });
    const both = buildSelectedIntents({ ...BASE, review, selectedIds: ["r1", "r2"] });
    add("K. لا موافقة جماعية ولا تبعية تلقائية",
      onlyDependent.intents.length === 0 &&
      onlyDependent.rejected[0].error.startsWith("DEPENDENCY_NOT_SELECTED") &&
      both.intents.length === 2, [onlyDependent.rejected, both.intents.length]);
  }
  // L) كل توصية رسالة مستقلة بمفتاح فريد (لا دمج ولا تكرار)
  {
    const { intents } = buildSelectedIntents({ ...BASE, review: REVIEW([REC(), REC({ id: "r2", target: { section: "profil" } })]), selectedIds: ["r1", "r2"] });
    const msgs = intents.map(formatIntentMessage);
    add("L. كل توصية وحدة مستقلة", intents.length === 2 && msgs.length === 2 && msgs[0] !== msgs[1] &&
      msgs.every((m) => (m.match(new RegExp(INTENT_OPEN.replace(/</g, "\\<"), "g")) || []).length === 1), intents.length);
  }
  // M) عقد CV_REVIEW لم يتغيّر (لا regression في المسار القائم)
  {
    add("M. عقد CV_REVIEW سليم",
      reviewParser.RECOMMENDATION_FIELDS.join(",") === "id,type,severity,title,problem,why,recommendation,target,dependsOn" &&
      reviewParser.MAX_RECOMMENDATIONS === 7 &&
      typeof reviewParser.parseCVReview === "function", reviewParser.RECOMMENDATION_FIELDS);
  }

  const passed = results.filter((r) => r.pass).length;
  return { passed, total: results.length, allPassed: passed === results.length, results };
}

export default runReviewIntentTests;