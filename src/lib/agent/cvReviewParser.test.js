/**
 * اختبارات معزولة لـ cvReviewParser — نقية بالكامل، بلا وكيل ولا واجهة ولا قاعدة بيانات.
 * لا تعمل تلقائياً. استدعِ runCVReviewParserTests() في Console أو صفحة تشخيص.
 */
import { parseCVReview, stripCVReview, REVIEW_OPEN, REVIEW_CLOSE, MAX_RECOMMENDATIONS } from "./cvReviewParser";

const BLOCK = (o) => `${REVIEW_OPEN}\n${JSON.stringify(o)}\n${REVIEW_CLOSE}`;

/** CV_INDEX على شكل مخرج summarizeIndex */
const INDEX = [
  { section: "erfarenhet", items: [{ id: "experience_8f31a", fields: [] }, { id: "experience_1b2c3", fields: [] }] },
  { section: "profil", items: [{ id: "profile_main", fields: [] }] }
];
const CTX = { templateId: "stockholm", cvIndex: INDEX };

/** حزمة أدلّة مطابقة للعقد الحالي — إلزامية لتوصيات content على profil/erfarenhet/utbildning */
const PACK = (over = {}) => ({
  status: "needs_user",
  assessment: { isValidRecommendation: true, reason: "الوصف يسرد مسؤوليات بلا نتيجة قابلة للقياس.", confidence: "high" },
  existing: ["وصف المسؤوليات الحالي"],
  relevant: [],
  missing: ["نتيجة قابلة للقياس لهذه المهمة"],
  draft: null,
  userConfirmationRequired: ["تأكيد النتيجة قبل كتابتها"],
  ...over
});

const REC = (over = {}) => ({
  id: "r1",
  evidencePack: PACK(),
  type: "content",
  severity: "necessary",
  title: "تحويل الوصف إلى إنجازات",
  problem: "الوصف يركّز على المسؤوليات.",
  why: "الإنجازات توضح القيمة المضافة.",
  recommendation: "إعادة صياغة النقاط بنتائج قابلة للقياس عند توفّرها.",
  target: { section: "erfarenhet", itemRef: "experience_8f31a" },
  dependsOn: [],
  ...over
});

const FOUND = (recs) => ({ reviewStatus: "improvements_found", summary: "ملخّص قصير.", recommendations: recs });
const NONE = () => ({ reviewStatus: "no_improvement", summary: "السيرة متماسكة.", recommendations: [] });

export function runCVReviewParserTests() {
  const results = [];
  const add = (name, pass, note) => results.push({ name, pass: !!pass, note: typeof note === "string" ? note : JSON.stringify(note) });

  // A) no_improvement صحيح
  {
    const r = parseCVReview(`شرح بشري.\n${BLOCK(NONE())}`, CTX);
    add("A. no_improvement صالح", r.ready && r.review.recommendations.length === 0 && r.error === null, r.error);
  }
  // B) improvements_found صحيح
  {
    const r = parseCVReview(BLOCK(FOUND([REC()])), CTX);
    add("B. improvements_found صالح", r.ready && r.review.recommendations.length === 1, r.error);
  }
  // C) JSON ناقص
  {
    const r = parseCVReview(`${REVIEW_OPEN}\n{"reviewStatus":"improvements_f`, CTX);
    add("C. JSON ناقص مرفوض", r.ready === false && r.error === "NOT_READY", r.error);
  }
  // D) علامة الإغلاق مفقودة
  {
    const r = parseCVReview(`${REVIEW_OPEN}\n${JSON.stringify(NONE())}`, CTX);
    add("D. بلا علامة إغلاق مرفوض", r.ready === false && r.error === "NOT_READY", r.error);
  }
  // E) reviewStatus غير صحيح
  {
    const r = parseCVReview(BLOCK({ ...NONE(), reviewStatus: "maybe" }), CTX);
    add("E. reviewStatus غير صالح", r.ready === false && r.error === "REVIEW_STATUS_INVALID", r.error);
  }
  // F) أكثر من 7 توصيات
  {
    const many = Array.from({ length: MAX_RECOMMENDATIONS + 1 }, (_, i) => REC({ id: `r${i + 1}` }));
    const r = parseCVReview(BLOCK(FOUND(many)), CTX);
    add("F. أكثر من 7 مرفوض", r.ready === false && r.error === "TOO_MANY_RECOMMENDATIONS", r.error);
  }
  // F2) 7 بالضبط مقبولة
  {
    const seven = Array.from({ length: MAX_RECOMMENDATIONS }, (_, i) => REC({ id: `r${i + 1}` }));
    const r = parseCVReview(BLOCK(FOUND(seven)), CTX);
    add("F2. 7 بالضبط مقبولة", r.ready === true, r.error);
  }
  // G) no_improvement مع توصيات
  {
    const r = parseCVReview(BLOCK({ ...NONE(), recommendations: [REC()] }), CTX);
    add("G. no_improvement + توصيات مرفوض", r.ready === false && r.error === "NO_IMPROVEMENT_WITH_RECOMMENDATIONS", r.error);
  }
  // H) improvements_found بلا توصيات
  {
    const r = parseCVReview(BLOCK(FOUND([])), CTX);
    add("H. improvements_found بلا توصيات مرفوض", r.ready === false && r.error === "IMPROVEMENTS_FOUND_WITHOUT_RECOMMENDATIONS", r.error);
  }
  // I) توصية ناقصة حقلاً
  {
    const bad = REC(); delete bad.why;
    const r = parseCVReview(BLOCK(FOUND([bad])), CTX);
    add("I. حقل ناقص مرفوض", r.ready === false && r.error.includes("MISSING_FIELDS(why)"), r.error);
  }
  // J) type غير صالح
  {
    const r = parseCVReview(BLOCK(FOUND([REC({ type: "design" })])), CTX);
    add("J. type غير صالح", r.ready === false && r.error.includes("TYPE_INVALID"), r.error);
  }
  // K) severity غير صالح
  {
    const r = parseCVReview(BLOCK(FOUND([REC({ severity: "critical" })])), CTX);
    add("K. severity غير صالح", r.ready === false && r.error.includes("SEVERITY_INVALID"), r.error);
  }
  // L) target.section غير صالح
  {
    const r = parseCVReview(BLOCK(FOUND([REC({ target: { section: "CV" } })])), CTX);
    add("L. section غير صالح", r.ready === false && r.error.includes("TARGET_SECTION_INVALID"), r.error);
  }
  // L2) section=layout مقبول (بلا itemRef)
  {
    const r = parseCVReview(BLOCK(FOUND([REC({ type: "layout", target: { section: "layout" } })])), CTX);
    add("L2. section=layout مقبول", r.ready === true, r.error);
  }
  // M) معرّف مكرر
  {
    const r = parseCVReview(BLOCK(FOUND([REC(), REC({ target: { section: "profil" } })])), CTX);
    add("M. id مكرر مرفوض", r.ready === false && r.error === "DUPLICATE_RECOMMENDATION_ID", r.error);
  }
  // N) اعتماد على النفس
  {
    const r = parseCVReview(BLOCK(FOUND([REC({ dependsOn: ["r1"] })])), CTX);
    add("N. self-dependency مرفوض", r.ready === false && r.error.includes("SELF_DEPENDENCY"), r.error);
  }
  // O) حقول إضافية غير معرّفة
  {
    const r1 = parseCVReview(BLOCK(FOUND([REC({ expectedValue: "x" })])), CTX);
    const r2 = parseCVReview(BLOCK({ ...NONE(), extra: 1 }), CTX);
    const r3 = parseCVReview(BLOCK(FOUND([REC({ target: { section: "profil", weight: 2 } })])), CTX);
    add("O. حقول إضافية مرفوضة (توصية/جذر/هدف)",
      r1.ready === false && r1.error.includes("UNKNOWN_FIELDS(expectedValue)") &&
      r2.ready === false && r2.error === "UNKNOWN_FIELDS(extra)" &&
      r3.ready === false && r3.error.includes("TARGET_UNKNOWN_FIELDS(weight)"),
      [r1.error, r2.error, r3.error]);
  }
  // P) itemRef غير موجود في CV_INDEX + غياب الفهرس
  {
    const r1 = parseCVReview(BLOCK(FOUND([REC({ target: { section: "erfarenhet", itemRef: "experience_zzzzz" } })])), CTX);
    const r2 = parseCVReview(BLOCK(FOUND([REC()])), { templateId: "stockholm", cvIndex: null });
    const r3 = parseCVReview(BLOCK(FOUND([REC()])), undefined);
    add("P. itemRef مخترع/غير قابل للتحقّق مرفوض",
      r1.ready === false && r1.error.includes("ITEM_REF_NOT_IN_INDEX") &&
      r2.ready === false && r2.error.includes("ITEM_REF_UNVERIFIABLE") &&
      r3.ready === false && r3.error.includes("ITEM_REF_UNVERIFIABLE"),
      [r1.error, r2.error, r3.error]);
  }
  // P2) بلا itemRef يعمل حتى بلا فهرس (هدف على مستوى القسم)
  {
    const r = parseCVReview(BLOCK(FOUND([REC({ target: { section: "erfarenhet" } })])), undefined);
    add("P2. هدف على مستوى القسم بلا فهرس مقبول", r.ready === true, r.error);
  }
  // Q) النص البشري يبقى بعد الحذف
  {
    const text = `السيرة قوية في الخبرة.\n${BLOCK(NONE())}`;
    add("Q. الشرح البشري يبقى", stripCVReview(text) === "السيرة قوية في الخبرة.", stripCVReview(text));
  }
  // R) رسالة بلا كتلة
  {
    const r = parseCVReview("راجعت سيرتك وهي جيدة.", CTX);
    add("R. بلا كتلة ليست مراجعة", r.ready === false && r.error === "NOT_READY" && r.review === null, r.error);
  }
  // S) بثّ جزئي ثم T) اكتمال
  {
    const partial = `أحلّل...\n${REVIEW_OPEN}\n{"reviewStatus":"improvements_found","summary":"م`;
    const s = parseCVReview(partial, CTX);
    add("S. بثّ جزئي لا يعطي ready", s.ready === false, s.error);
    const full = `أحلّل...\n${BLOCK(FOUND([REC()]))}`;
    const t = parseCVReview(full, CTX);
    const t2 = parseCVReview(full, CTX);
    add("T. الاكتمال يعطي ready ونتيجة ثابتة (نقيّة)",
      t.ready === true && t2.ready === true && JSON.stringify(t.review) === JSON.stringify(t2.review), t.error);
  }
  // إضافي) dependsOn غير مصفوفة / عنصر غير نصّي
  {
    const r1 = parseCVReview(BLOCK(FOUND([REC({ dependsOn: "r2" })])), CTX);
    const r2 = parseCVReview(BLOCK(FOUND([REC({ dependsOn: [2] })])), CTX);
    add("U. dependsOn يجب أن تكون مصفوفة نصوص",
      r1.ready === false && r1.error.includes("DEPENDS_ON_NOT_ARRAY") &&
      r2.ready === false && r2.error.includes("DEPENDS_ON_ITEM_INVALID"), [r1.error, r2.error]);
  }
  // إضافي) اعتماد حقيقي على توصية أخرى مقبول
  {
    const r = parseCVReview(BLOCK(FOUND([REC(), REC({ id: "r2", target: { section: "profil" }, dependsOn: ["r1"] })])), CTX);
    add("V. اعتماد على توصية أخرى مقبول", r.ready === true, r.error);
  }

  const passed = results.filter((r) => r.pass).length;
  return { passed, total: results.length, allPassed: passed === results.length, results };
}

export default runCVReviewParserTests;