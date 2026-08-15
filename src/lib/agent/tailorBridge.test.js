/**
 * اختبارات منطقية لجسر Job Tailor → Smart CV Assistant (M7) — بلا framework.
 * تُشغَّل من Console المتصفح:
 *   (await import('/src/lib/agent/tailorBridge.test.js')).runTailorBridgeTests()
 */
import { buildSelectedIntents, buildReviewIntent, formatIntentMessage, intentDeliveryKey } from "@/lib/agent/reviewIntent";
import { parseCVReview } from "@/lib/agent/cvReviewParser";

const INDEX = { sections: [{ key: "erfarenhet", items: [{ id: "experience_a" }, { id: "experience_b" }] }] };

const rec = (over = {}) => ({
  id: "r1", type: "job_alignment", severity: "necessary",
  title: "t", problem: "p", why: "w", recommendation: "r",
  target: { section: "erfarenhet", itemRef: "experience_a" }, dependsOn: [], ...over
});

export function runTailorBridgeTests() {
  const out = [];
  const add = (n, pass, info) => out.push({ n, pass, info });

  // 1) كتلة CV_REVIEW من Job Tailor تمرّ بنفس parser الخاص بـM5 (لا parser ثانٍ)
  const block = `<<<CV_REVIEW\n${JSON.stringify({ reviewStatus: "improvements_found", summary: "s", recommendations: [rec()] })}\nCV_REVIEW>>>\nشرح بشري`;
  const parsed = parseCVReview(block, { templateId: "stockholm", cvIndex: INDEX });
  add("1. مخرج Job Tailor يُقبَل بنفس عقد CV_REVIEW", parsed.ready === true, parsed.error);

  // 2) source = application_tailor يُقبل ويظهر في الـIntent
  const r2 = buildReviewIntent({ rec: rec(), selectedIds: ["r1"], cvId: "t1", templateId: "stockholm", indexSummary: INDEX, source: "application_tailor" });
  add("2. Intent يحمل source = application_tailor", r2.ok && r2.intent.source === "application_tailor", r2.error);

  // 3) M6 غير مكسور: الافتراضي يبقى cv_review_coach
  const r3 = buildReviewIntent({ rec: rec(), selectedIds: ["r1"], cvId: "c1", templateId: "stockholm", indexSummary: INDEX });
  add("3. الافتراضي بلا source يبقى cv_review_coach", r3.ok && r3.intent.source === "cv_review_coach", r3.error);

  // 4) مصدر مجهول يُرفض
  const r4 = buildReviewIntent({ rec: rec(), selectedIds: ["r1"], cvId: "c1", templateId: "stockholm", indexSummary: INDEX, source: "job_tailor_x" });
  add("4. مصدر غير معتمد يُرفض", !r4.ok && r4.error === "SOURCE_INVALID", r4.error);

  // 5) لا تنفيذ تلقائي: غير المختار لا يُبنى له Intent
  const many = { reviewStatus: "improvements_found", summary: "s", recommendations: [rec(), rec({ id: "r2", target: { section: "erfarenhet", itemRef: "experience_b" } })] };
  const sel = buildSelectedIntents({ review: many, selectedIds: ["r2"], cvId: "t1", templateId: "stockholm", indexSummary: INDEX, source: "application_tailor" });
  add("5. المختار فقط يُرسَل", sel.intents.length === 1 && sel.intents[0].recommendationId === "r2", sel.intents.map((i) => i.recommendationId));

  // 6) هدف قديم (stale) يُرفض ولا يُخمَّن
  const stale = buildSelectedIntents({ review: { reviewStatus: "improvements_found", summary: "s", recommendations: [rec({ target: { section: "erfarenhet", itemRef: "experience_gone" } })] }, selectedIds: ["r1"], cvId: "t1", templateId: "stockholm", indexSummary: INDEX, source: "application_tailor" });
  add("6. هدف غير موجود في الحالة الحالية ⇒ TARGET_STALE", stale.intents.length === 0 && stale.rejected[0]?.error === "TARGET_STALE", stale.rejected);

  // 7) الرسالة تُعلم الوكيل بالمصدر وبأن الهدف هو النسخة المخصّصة المفتوحة
  const msg = formatIntentMessage(r2.intent);
  add("7. الرسالة تذكر مخصّص الطلبات والنسخة المخصّصة", /مخصّص الطلبات/.test(msg) && /النسخة المخصّصة/.test(msg) && /REVIEW_INTENT/.test(msg), null);

  // 8) مفتاح التسليم يمنع التكرار داخل الدورة نفسها فقط
  add("8. مفتاح التسليم مرتبط بالدورة", intentDeliveryKey("tailor-1", "r1") !== intentDeliveryKey("tailor-2", "r1"), null);

  // 9) الـIntent يحمل مرجعاً صريحاً للعنصر المستهدف
  add("9. Intent يحمل section + itemRef", r2.intent.target.section === "erfarenhet" && r2.intent.target.itemRef === "experience_a", r2.intent.target);

  return (async () => {
    // 10) لا مسار كتابة على SavedCV في مسار Job Tailor
    const [tailorPage, hook, agent] = await Promise.all([
      fetch("/src/pages/ApplicationTailor.jsx").then((r) => r.text()),
      fetch("/src/lib/agent/useTailorRecommendations.js").then((r) => r.text()),
      fetch("/base44/agents/application_tailor.jsonc").then((r) => r.text()).catch(() => ""),
    ]);
    add("10. صفحة Job Tailor بلا update/delete على السيرة", !/cvRepository\.update\(|cvRepository\.remove\(|SavedCV\.update|SavedCV\.delete/.test(tailorPage), null);
    add("11. الجسر (hook) بلا أي كتابة أو تنفيذ", !/update\(|create\(|executeAssistantAction|CV_ACTION/.test(hook), null);
    if (agent) add("12. تعريف الوكيل لا يمنح update على SavedCV", !/"SavedCV"[\s\S]{0,120}update/.test(agent), null);

    const passed = out.filter((r) => r.pass).length;
    out.forEach((r) => console[r.pass ? "log" : "error"](`${r.pass ? "✅" : "❌"} ${r.n}`, r.info ?? ""));
    console.log(`النتيجة: ${passed}/${out.length}`);
    return { passed, total: out.length, results: out };
  })();
}

export default runTailorBridgeTests;