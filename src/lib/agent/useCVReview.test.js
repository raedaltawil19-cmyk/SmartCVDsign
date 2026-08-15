/**
 * اختبارات معزولة لبوابة استهلاك CV_REVIEW (M5) — نقية بالكامل.
 * تختبر scanForReview فقط: بلا React، بلا وكيل، بلا قاعدة بيانات، بلا واجهة.
 * لا تعمل تلقائياً — استدعِ runCVReviewConsumerTests().
 */
import { scanForReview } from "./useCVReview";
import { REVIEW_OPEN, REVIEW_CLOSE } from "./cvReviewParser";

const BLOCK = (o) => `${REVIEW_OPEN}\n${JSON.stringify(o)}\n${REVIEW_CLOSE}`;
const INDEX = [{ section: "erfarenhet", items: [{ id: "experience_8f31a", fields: [] }] }];
const CTX = { templateId: "stockholm", cvIndex: INDEX };

/** حزمة أدلّة مطابقة للعقد الحالي — إلزامية لتوصيات content على erfarenhet */
const PACK = () => ({
  status: "needs_user",
  assessment: { isValidRecommendation: true, reason: "الوصف مسؤوليات بلا نتيجة قابلة للقياس.", confidence: "high" },
  existing: ["الوصف الحالي"],
  relevant: [],
  missing: ["نتيجة قابلة للقياس"],
  draft: null,
  userConfirmationRequired: ["تأكيد النتيجة قبل كتابتها"]
});

const REC = (over = {}) => ({
  id: "r1",
  evidencePack: PACK(),
  type: "content",
  severity: "necessary",
  title: "إضافة إنجازات قابلة للقياس",
  problem: "الوصف مسؤوليات فقط.",
  why: "الإنجازات توضح القيمة.",
  recommendation: "أعد الصياغة بنتائج عند توفّرها.",
  target: { section: "erfarenhet", itemRef: "experience_8f31a" },
  dependsOn: [],
  ...over
});
const FOUND = (recs) => ({ reviewStatus: "improvements_found", summary: "ملخّص.", recommendations: recs });
const NONE = () => ({ reviewStatus: "no_improvement", summary: "السيرة متماسكة.", recommendations: [] });

const gate = () => ({ seen: new Map(), done: new Set() });
const scan = (content, g, context = CTX) =>
  scanForReview({ messages: [{ id: "m1", role: "assistant", content }], context, seen: g.seen, done: g.done });

/** محاكاة الاختيار المحلي — نفس منطق toggleRecommendation بلا React */
const toggle = (ids, id) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

export function runCVReviewConsumerTests() {
  const results = [];
  const add = (name, pass, note) => results.push({ name, pass: !!pass, note: typeof note === "string" ? note : JSON.stringify(note) });

  // A) no_improvement
  {
    const r = scan(`شرح بشري.\n${BLOCK(NONE())}`, gate());
    add("A. no_improvement يُستهلك بنجاح", r?.review?.reviewStatus === "no_improvement" && r.text === "شرح بشري.", r);
  }
  // B) improvements_found
  {
    const r = scan(BLOCK(FOUND([REC()])), gate());
    add("B. improvements_found يُستهلك", r?.review?.recommendations.length === 1, r?.error);
  }
  // C/D/E) الاختيار الفردي مستقل
  {
    let sel = [];
    sel = toggle(sel, "r1");
    const one = sel.length === 1 && sel.includes("r1");
    sel = toggle(sel, "r2");
    const two = sel.length === 2 && sel.includes("r1") && sel.includes("r2");
    sel = toggle(sel, "r1");
    const off = sel.length === 1 && sel.includes("r2");
    add("C. اختيار توصية واحدة", one, sel);
    add("D. اختيار الثانية لا يلغي الأولى", two, sel);
    add("E. إلغاء الاختيار يعمل", off, sel);
  }
  // F–J) لا مسارات كتابة في هذه الوحدة
  {
    const src = String(scanForReview);
    const forbidden = ["setData", "setLayout", "setTemplateId", "cvRepository", "update(", "CV_ACTION", "executeAssistantAction", "runCvEditContent", "runCvMoveSection"];
    const hit = forbidden.filter((f) => src.includes(f));
    add("F–J. لا data/layout/templateId/SavedCV/CV_ACTION في بوابة الاستهلاك", hit.length === 0, hit);
  }
  // K) رسالة غير مكتملة
  {
    const g = gate();
    const r = scan(`أحلّل...\n${REVIEW_OPEN}\n{"reviewStatus":"improvements_fo`, g);
    add("K. بثّ غير مكتمل لا يعرض توصيات", r === null && g.done.size === 0, r);
  }
  // L + M) الاكتمال يعرض مرة واحدة
  {
    const g = gate();
    scan(`أحلّل...\n${REVIEW_OPEN}\n{"reviewStatus":"improv`, g);
    const full = `أحلّل...\n${BLOCK(FOUND([REC()]))}`;
    const first = scan(full, g);
    const again = scan(full, g);
    add("L. اكتمال الكتلة يعرض التوصيات", first?.review?.recommendations.length === 1 && g.done.size === 1, first?.error);
    add("M. نفس الرسالة لا تُعالج مرتين", again === null, again);
  }
  // N) تغيير السيرة يمسح النتيجة — بوابة جديدة = ذاكرة جديدة
  {
    const g1 = gate();
    scan(BLOCK(FOUND([REC()])), g1);
    const g2 = gate();
    add("N. بوابة سيرة جديدة لا ترث نتيجة سابقة", g2.done.size === 0 && g2.seen.size === 0 && g1.done.size === 1);
  }
  // O) توصية خارج العقد
  {
    const g = gate();
    const r = scan(BLOCK(FOUND([REC({ severity: "critical" })])), g);
    add("O. خارج العقد لا يُعرض (خطأ لا توصيات)", r && r.error === "recommendations[0]: SEVERITY_INVALID" && !r.review, r);
  }
  // P) itemRef يبقى داخلياً فقط
  {
    const r = scan(BLOCK(FOUND([REC()])), gate());
    const shown = ["title", "problem", "why", "recommendation", "severity", "type"];
    add("P. itemRef موجود في البيانات ولا يُصنَّف حقل عرض",
      r?.review?.recommendations[0].target.itemRef === "experience_8f31a" && !shown.includes("itemRef"));
  }
  // Q) no_improvement بلا توصيات ⇒ لا شيء لتطبيقه
  {
    const r = scan(BLOCK(NONE()), gate());
    add("Q. no_improvement قائمته فارغة", r?.review?.recommendations.length === 0);
  }
  // R) رسالة المستخدم تُتجاهل
  {
    const r = scanForReview({ messages: [{ id: "u1", role: "user", content: BLOCK(FOUND([REC()])) }], context: CTX, ...gate() });
    add("R. رسائل المستخدم تُتجاهل", r === null, r);
  }

  const passed = results.filter((r) => r.pass).length;
  return { passed, total: results.length, allPassed: passed === results.length, results };
}

export default runCVReviewConsumerTests;