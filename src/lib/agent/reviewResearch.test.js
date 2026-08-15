/**
 * اختبارات معزولة لقناة CV_RESEARCH — نقية بالكامل (بلا React/شبكة/قاعدة بيانات).
 * لا تعمل تلقائياً — استدعِ runReviewResearchTests().
 */
import { extractResearch, stripResearch, researchFor, RESEARCH_OPEN, RESEARCH_CLOSE } from "./reviewResearch";
import { parseCVReview, REVIEW_OPEN, REVIEW_CLOSE } from "./cvReviewParser";

const SRC = (over = {}) => ({
  title: "Recognition of foreign qualifications",
  url: "https://www.uhr.se/en/start/recognition-of-foreign-qualifications/",
  publisher: "uhr.se",
  sourceType: "official_authority",
  isPrimary: true,
  retrievedContent: "UHR evaluates foreign qualifications…",
  retrievalStatus: "fetched",
  ...over
});
const RBLOCK = (o) => `${RESEARCH_OPEN}\n${JSON.stringify(o)}\n${RESEARCH_CLOSE}`;

const REVIEW = {
  reviewStatus: "improvements_found",
  summary: "ملخّص.",
  recommendations: [{
    id: "r1", type: "content", severity: "necessary",
    title: "ت", problem: "م", why: "ل", recommendation: "ص",
    target: { section: "utbildning" }, dependsOn: [],
    evidencePack: {
      status: "needs_user",
      assessment: { isValidRecommendation: true, reason: "س", confidence: "high" },
      existing: [], relevant: [], missing: ["قرار التقييم"], draft: null,
      userConfirmationRequired: ["أن شهادتك قُيّمت"]
    }
  }]
};
const VBLOCK = `${REVIEW_OPEN}\n${JSON.stringify(REVIEW)}\n${REVIEW_CLOSE}`;

export function runReviewResearchTests() {
  const results = [];
  const add = (name, pass, note) => results.push({ name, pass: !!pass, note: typeof note === "string" ? note : JSON.stringify(note) });

  // 1) كتلة صالحة
  {
    const r = extractResearch(RBLOCK({ r1: { status: "ready", sources: [SRC()] } }));
    add("1. كتلة صالحة تُستخرج", r?.r1?.status === "ready" && r.r1.sources.length === 1, r);
  }
  // 2) no_source
  {
    const r = extractResearch(RBLOCK({ r1: { status: "no_source", sources: [] } }));
    add("2. no_source مقبولة", r?.r1?.status === "no_source", r);
  }
  // 3) حقل غريب في المصدر ⇒ تُهمَل الكتلة
  {
    const r = extractResearch(RBLOCK({ r1: { status: "ready", sources: [SRC({ note: "x" })] } }));
    add("3. حقل غريب يُهمل الكتلة", r === null, r);
  }
  // 4) حالة لا يسندها محتواها
  {
    const a = extractResearch(RBLOCK({ r1: { status: "ready", sources: [] } }));
    const b = extractResearch(RBLOCK({ r1: { status: "no_source", sources: [SRC()] } }));
    add("4. حالة غير متسقة تُهمل", a === null && b === null, { a, b });
  }
  // 5) status/sourceType/isPrimary خارج القائمة
  {
    const a = extractResearch(RBLOCK({ r1: { status: "maybe", sources: [] } }));
    const b = extractResearch(RBLOCK({ r1: { status: "ready", sources: [SRC({ sourceType: "blog" })] } }));
    const c = extractResearch(RBLOCK({ r1: { status: "ready", sources: [SRC({ isPrimary: "true" })] } }));
    const d = extractResearch(RBLOCK({ r1: { status: "ready", sources: [SRC({ url: "ftp://x.se" })] } }));
    add("5. قيم خارج العقد تُهمل", !a && !b && !c && !d, { a, b, c, d });
  }
  // 6) JSON تالف / كتلة غير مغلقة / غياب الكتلة
  {
    const a = extractResearch(`${RESEARCH_OPEN}\n{"r1":{"status":"rea`);
    const b = extractResearch(`${RESEARCH_OPEN}\n{{{\n${RESEARCH_CLOSE}`);
    const c = extractResearch("لا كتلة هنا");
    add("6. تالف/غير مغلق/غائب ⇒ null بلا استثناء", a === null && b === null && c === null, { a, b, c });
  }
  // 7) الأهم: كتلة بحث تالفة لا تُسقط CV_REVIEW
  {
    const content = `شرح.\n${RBLOCK({ r1: { status: "ready", sources: [SRC({ bogus: 1 })] } })}\n${VBLOCK}`;
    const parsed = parseCVReview(content, { templateId: "stockholm", cvIndex: [] });
    add("7. بحث تالف + CV_REVIEW صالح ⇒ المراجعة تُعرض", parsed.ready === true && extractResearch(content) === null, parsed.error);
  }
  // 8) CV_REVIEW يبقى صالحاً مع كتلة بحث صالحة (كتلتان في رسالة واحدة)
  {
    const content = `شرح.\n${RBLOCK({ r1: { status: "ready", sources: [SRC()] } })}\n${VBLOCK}`;
    const parsed = parseCVReview(content, { templateId: "stockholm", cvIndex: [] });
    add("8. كتلتان معاً: كلٌّ يُقرأ من قناته", parsed.ready === true && !!extractResearch(content)?.r1, parsed.error);
  }
  // 9) stripResearch ينظّف النصّ البشري فقط
  {
    const out = stripResearch(`قبل.\n${RBLOCK({ r1: { status: "no_source", sources: [] } })}\nبعد.`);
    add("9. تنظيف الكتلة من النصّ البشري", out === "قبل.\n\nبعد." || out === "قبل.\nبعد." || !out.includes("CV_RESEARCH"), out);
  }
  // 10) الربط بالتوصية الصحيحة
  {
    const map = extractResearch(RBLOCK({
      r1: { status: "ready", sources: [SRC()] },
      r2: { status: "ready", sources: [SRC({ url: "https://legitimation.socialstyrelsen.se/", publisher: "legitimation.socialstyrelsen.se" })] }
    }));
    const a = researchFor(map, "r1");
    const b = researchFor(map, "r2");
    add("10. كل توصية ترى بحثها وحده",
      a.sources[0].publisher === "uhr.se" && b.sources[0].publisher === "legitimation.socialstyrelsen.se" && researchFor(map, "r3") === null);
  }
  // 11) لا مسارات كتابة ولا بحث داخل هذه الوحدة
  {
    const src = [String(extractResearch), String(stripResearch), String(researchFor)].join("\n");
    const forbidden = ["ResearchPublicSource", "fetch(", "base44", "CV_ACTION", "confirmedValue", "cvRepository", "SavedCV"];
    const hit = forbidden.filter((f) => src.includes(f));
    add("11. لا بحث ولا كتابة ولا CV_ACTION في هذه الطبقة", hit.length === 0, hit);
  }

  const passed = results.filter((r) => r.pass).length;
  return { passed, total: results.length, allPassed: passed === results.length, results };
}

export default runReviewResearchTests;