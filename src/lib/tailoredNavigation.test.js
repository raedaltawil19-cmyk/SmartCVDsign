/**
 * اختبارات منطقية لمسار التخصيص والتنقّل master/tailored — بلا framework.
 * تُشغَّل من Console المتصفح:
 *   (await import('/src/lib/tailoredNavigation.test.js')).runTailoredNavTests()
 */
import { MASTER, TAILORED, isTailored, tailoredChildrenOf, buildTailoredPayload, createTailoredCV } from "@/lib/cvProfiles";
import { resolveBaseCV, adFromUserText } from "@/lib/tailoringSession";
import { findExistingTailored } from "@/lib/tailoredLookup";
import { resolveSaveTarget } from "@/lib/cvSaveTarget";

function fakeRepo() {
  const calls = { create: 0, update: [], remove: [] };
  return {
    calls,
    create: async (p) => { calls.create++; return { id: `t${calls.create}`, ...p }; },
    update: async (id, p) => { calls.update.push([id, p]); return { id, ...p }; },
    remove: async (id) => { calls.remove.push(id); },
  };
}

const mk = (id, titel, extra = {}) => ({ id, titel, cvType: MASTER, updated_date: "2026-01-01", data: { titel, profil: titel, fardigheter: [{ namn: titel }] }, templateId: "stockholm", layout: {}, ...extra });

export function runTailoredNavTests() {
  const results = [];
  const add = (n, pass, info) => results.push({ n, pass, info });

  return (async () => {
    const mA = mk("mA", "Business Consultant");
    const mB = mk("mB", "Restaurant Manager");
    const mC = mk("mC", "Legal");
    const adA = adFromUserText("Business Consultant hos Acme i Stockholm");

    // A) Master → Tailored
    {
      const repo = fakeRepo();
      const resolved = resolveBaseCV({ list: [mA, mB, mC], preferredId: "mA", ad: adA });
      const { created, error } = await createTailoredCV(repo, { base: resolved.base, ad: adA });
      add("A. إنشاء نسخة مخصّصة من Master ينجح", !error && !!created && created.cvType === TAILORED && repo.calls.create === 1, error || created?.titel);
      add("C. النسخة تحمل parentCvId الصحيح", created?.parentCvId === "mA", created?.parentCvId);
      add("D. Master لم يُعدَّل ولم يُلمَس", repo.calls.update.length === 0 && repo.calls.remove.length === 0 && created.data !== mA.data && JSON.stringify(created.data) === JSON.stringify(mA.data), repo.calls);
    }

    // B) Tailored ⇒ لا Tailored منها مباشرة
    {
      const t1 = { id: "t1", titel: "Consultant — Job A", cvType: TAILORED, parentCvId: "mA", data: mA.data };
      add("B1. buildTailoredPayload يرفض Tailored كأساس", buildTailoredPayload({ base: t1, ad: adA }).error === "BASE_MUST_BE_MASTER", null);
      const r = resolveBaseCV({ list: [mA, t1], preferredId: "t1", ad: adA });
      add("B2. اختيار Tailored يرتدّ إلى أصلها Master", r.base?.id === "mA" && r.source === "parent", r.source);
    }

    // E) الرجوع من Tailored إلى Master عبر parentCvId
    {
      const t1 = { id: "t1", cvType: TAILORED, parentCvId: "mB" };
      add("E. مسار الرجوع = parentCvId", isTailored(t1) && `/builder/${t1.parentCvId}` === "/builder/mB", t1.parentCvId);
    }

    // F,G) كل Master يرى أبناءه فقط
    {
      const list = [mA, mB, mC,
        { id: "tA1", cvType: TAILORED, parentCvId: "mA", titel: "Job A" },
        { id: "tA2", cvType: TAILORED, parentCvId: "mA", titel: "Job B" },
        { id: "tB1", cvType: TAILORED, parentCvId: "mB", titel: "Job C" }];
      const a = tailoredChildrenOf(list, "mA").map((r) => r.id);
      const b = tailoredChildrenOf(list, "mB").map((r) => r.id);
      const c = tailoredChildrenOf(list, "mC");
      add("F. Master يعرض نسخه المرتبطة", a.join(",") === "tA1,tA2" && b.join(",") === "tB1", { a, b });
      add("G. لا خلط بين Masters", !a.includes("tB1") && !b.includes("tA1") && c.length === 0, null);
    }

    // H) لا تكرار صامت
    {
      const expected = buildTailoredPayload({ base: mA, ad: adA }).payload.titel;
      const list = [mA, { id: "tA1", cvType: TAILORED, parentCvId: "mA", titel: expected }];
      const byTitel = findExistingTailored({ list, baseId: "mA", expectedTitel: expected });
      add("H1. يُكتشف التكرار عبر عنوان الوظيفة", byTitel.existing?.id === "tA1" && byTitel.identity === "titel", byTitel.identity);
      const withJob = findExistingTailored({ list: [mA, { id: "tA9", cvType: TAILORED, parentCvId: "mA", jobApplicationId: "job-1" }], baseId: "mA", jobApplicationId: "job-1" });
      add("H2. الهوية المستقرّة jobApplicationId أقوى", withJob.existing?.id === "tA9" && withJob.identity === "jobApplicationId", withJob.identity);
      const none = findExistingTailored({ list: [mA], baseId: "mA", expectedTitel: expected });
      add("H3. لا تكرار موهوم عند عدم وجود نسخة", none.existing === null, null);
    }

    // I,J) لا مسار كتابة في مسار التحليل — تحقّق نصّي على الملفات
    {
      const src = await Promise.all([
        fetch("/src/lib/tailoredLookup.js").then((r) => r.text()),
        fetch("/src/components/cv/CVRelationBar.jsx").then((r) => r.text()),
        fetch("/src/components/tailor/JobTailorDialog.jsx").then((r) => r.text()),
      ]);
      const banned = /\.update\(|\.remove\(|SavedCV\.update|setData\(/;
      add("I. وحدات البحث/العرض بلا أي مسار كتابة", src.every((s) => !banned.test(s)), null);
      const builder = await fetch("/src/pages/Builder.jsx").then((r) => r.text());
      const tailorDialog = await fetch("/src/components/tailor/JobTailorDialog.jsx").then((r) => r.text());
      add("J. Builder يفتح Job Tailor داخلياً ولا يكتب على السيرة منه", /<JobTailorDialog/.test(builder) && !/cvRepository\.update\(|cvRepository\.remove\(/.test(tailorDialog), null);
    }

    // K) Builder لا يحذف شيئاً
    {
      const builder = await fetch("/src/pages/Builder.jsx").then((r) => r.text());
      add("K. Builder بلا remove وبقرار حفظ محسوم", !/cvRepository\.remove\(/.test(builder) && resolveSaveTarget(null).mode === "create" && resolveSaveTarget("x").mode === "update", null);
    }

    const passed = results.filter((r) => r.pass).length;
    results.forEach((r) => console[r.pass ? "log" : "error"](`${r.pass ? "✅" : "❌"} ${r.n}`, r.info ?? ""));
    console.log(`النتيجة: ${passed}/${results.length}`);
    return { passed, total: results.length, results };
  })();
}

export default runTailoredNavTests;