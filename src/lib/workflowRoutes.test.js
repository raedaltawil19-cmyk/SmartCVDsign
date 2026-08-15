/**
 * اختبارات منطقية لمسار العمل (تحسين عام مقابل تخصيص وظيفة) + حدود master/tailored + قاعدة الكاتب الواحد.
 * تُشغَّل من Console المتصفح (Vite يحلّ مسارات @/):
 *   (await import('/src/lib/workflowRoutes.test.js')).runWorkflowTests()
 * لا مُشغّل اختبارات في المشروع، ولم يُضَف أي framework.
 */
import { WORKFLOW_GENERAL, WORKFLOW_TAILOR, resolveWorkflowActions, isWorkflowChoiceReady, generalImprovementKeepsType } from "@/lib/workflowRoutes";
import { buildTailoredPayload, rankBaseCVs, cvTypeOf, isTailored, MASTER, TAILORED } from "@/lib/cvProfiles";
import { resolveBaseCV } from "@/lib/tailoringSession";
import { buildSelectedIntents, formatIntentMessage } from "@/lib/agent/reviewIntent";
import * as reviewCoachHook from "@/lib/agent/useCVReview";
import * as reviewParser from "@/lib/agent/cvReviewParser";

const AD = { rubrik: "Arbetsmarknadskonsulent", beskrivning: "konsulent handledning arbetsmarknad" };

const master = (id, titel, data, extra = {}) => ({ id, titel, cvType: MASTER, data, templateId: "stockholm", layout: {}, updated_date: "2026-01-01", ...extra });

export function runWorkflowTests() {
  const results = [];
  const add = (name, pass, info) => results.push({ name, pass, info });

  // A) التحسين العام لا يشغّل مسار التخصيص
  {
    const a = resolveWorkflowActions(WORKFLOW_GENERAL);
    add("A. التحسين العام لا يشغّل التخصيص", a.runGeneralReview === true && a.startJobTailoring === false, a);
  }

  // B) التخصيص لا يشغّل المراجعة العامة
  {
    const b = resolveWorkflowActions(WORKFLOW_TAILOR);
    add("B. التخصيص لا يشغّل المراجعة العامة", b.startJobTailoring === true && b.runGeneralReview === false, b);
    const bad = resolveWorkflowActions("something");
    add("B2. قرار غير معروف لا يشغّل أي مسار", bad.runGeneralReview === false && bad.startJobTailoring === false && !!bad.error, bad);
    add("B3. نقطة الاختيار تحتاج سيرة وقالباً ومراجعة قالب منتهية",
      isWorkflowChoiceReady({ cvId: "c1", templateId: "stockholm", templateReviewStatus: "reviewed" }) === true &&
      isWorkflowChoiceReady({ cvId: "c1", templateId: "stockholm", templateReviewStatus: "pending" }) === false &&
      isWorkflowChoiceReady({ cvId: "", templateId: "stockholm" }) === false, null);
  }

  // C+D+E+F) إنشاء النسخة المخصّصة
  {
    const base = master("m1", "Konsult CV", { titel: "Arbetsmarknadskonsulent", erfarenhet: [{ roll: "konsulent" }] });
    const before = JSON.stringify(base);
    const { payload, error } = buildTailoredPayload({ base, ad: AD, jobApplicationId: "job-9" });
    add("C. الأصل لا يُمَسّ بعد إنشاء النسخة", !error && JSON.stringify(base) === before && cvTypeOf(base) === MASTER, error);
    add("D. النسخة الجديدة cvType=tailored", payload?.cvType === TAILORED, payload?.cvType);
    add("E. parentCvId يشير إلى الأصل", payload?.parentCvId === "m1", payload?.parentCvId);
    add("F. jobApplicationId يُربَط عند توفّره", payload?.jobApplicationId === "job-9", payload?.jobApplicationId);
    payload.data.titel = "تعديل على النسخة";
    add("C2. تعديل النسخة لا يعدّل الأصل", base.data.titel === "Arbetsmarknadskonsulent", base.data.titel);
    add("N. التحسين العام لا يحوّل السيرة إلى tailored", generalImprovementKeepsType() === true && cvTypeOf(base) === MASTER, null);
  }

  // G) لا tailored من tailored
  {
    const tailored = { id: "t1", cvType: TAILORED, parentCvId: "m1", titel: "T", data: { titel: "x" } };
    const res = buildTailoredPayload({ base: tailored, ad: AD });
    add("G. النسخة المخصّصة لا تصلح أساساً لتخصيص آخر", res.error === "BASE_MUST_BE_MASTER", res.error);
    const parent = master("m1", "Master", { titel: "Arbetsmarknadskonsulent" });
    const resolved = resolveBaseCV({ list: [parent, tailored], preferredId: "t1", ad: AD });
    add("G2. اختيار نسخة مخصّصة يعود إلى أصلها", resolved.base?.id === "m1" && resolved.source === "parent", resolved.source);
  }

  // H+I) تعدد الـMasters والترتيب على الـMasters فقط
  {
    const m1 = master("m1", "Konsult", { titel: "Arbetsmarknadskonsulent", fardigheter: [{ namn: "handledning" }] });
    const m2 = master("m2", "Restaurang", { titel: "Kock", fardigheter: [{ namn: "matlagning" }] });
    const m3 = master("m3", "Teknik", { titel: "Utvecklare", fardigheter: [{ namn: "javascript" }] });
    const t1 = { id: "t9", cvType: TAILORED, parentCvId: "m1", titel: "Tailored konsulent", data: { titel: "Arbetsmarknadskonsulent" } };
    const ranked = rankBaseCVs([m1, m2, m3, t1], AD);
    add("H. أكثر من Master يتعايشون", ranked.length === 3 && ranked.every((r) => r.cvType === MASTER), ranked.map((r) => r.id));
    add("I. الترتيب يقتصر على الـMasters ويقدّم الأنسب", ranked[0].id === "m1" && !ranked.some((r) => r.id === "t9"), ranked.map((r) => [r.id, r.score]));
    const resolved = resolveBaseCV({ list: [m1, m2, m3, t1], ad: AD });
    add("I2. الأساس المختار هو Master وليس نسخة مخصّصة", resolved.base?.id === "m1" && !isTailored(resolved.base), resolved.confidence);
    const none = resolveBaseCV({ list: [m2], ad: { rubrik: "Zzz", beskrivning: "qqq" } });
    add("I3. عند انعدام الثقة لا اختيار عشوائي", none.base === null && none.error === "NO_CONFIDENT_BASE", none.error);
  }

  // J+E) قاعدة الكاتب الواحد: REVIEW_INTENT بلا CV_ACTION وبلا حِمل كتابة
  {
    const rec = {
      id: "r1", type: "content", severity: "high", title: "t", problem: "p", why: "w", recommendation: "rc",
      target: { section: "profil" }, dependsOn: []
    };
    const { intents } = buildSelectedIntents({ review: { recommendations: [rec] }, selectedIds: ["r1"], cvId: "c1", templateId: "stockholm", indexSummary: { sections: [] } });
    const msg = intents.length === 1 ? formatIntentMessage(intents[0]) : "";
    const clean = !!msg && !msg.includes("CV_ACTION") && !/"(data|layout|newData|newLayout|templateId)"\s*:/.test(JSON.stringify(intents[0]).replace(/"templateId":"[^"]*"/, ""));
    add("J. REVIEW_INTENT بلا CV_ACTION ولا حِمل كتابة", clean && !("action" in (intents[0] || {})), msg.slice(0, 40));
  }

  // K+L) لا مسار كتابة في وحدات التحليل
  {
    const surfaces = [...Object.keys(reviewCoachHook), ...Object.keys(reviewParser)];
    const writeish = surfaces.filter((k) => /^(set|update|save|write|create|delete)/i.test(k));
    add("K. وحدات Review Coach بلا أي سطح كتابة", writeish.length === 0, writeish);
    add("L. مسار المسارات (workflowRoutes) بلا كتابة", !("update" in resolveWorkflowActions(WORKFLOW_GENERAL)), null);
  }

  const passed = results.filter((r) => r.pass).length;
  results.forEach((r) => console[r.pass ? "log" : "error"](`${r.pass ? "✅" : "❌"} ${r.name}`, r.info ?? ""));
  console.log(`النتيجة: ${passed}/${results.length}`);
  return { passed, total: results.length, results };
}

export default runWorkflowTests;