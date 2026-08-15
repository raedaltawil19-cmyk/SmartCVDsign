/**
 * اختبارات منطقية لقرار الحفظ — بلا framework.
 * تُشغَّل من Console المتصفح:
 *   (await import('/src/lib/cvSaveTarget.test.js')).runSaveTargetTests()
 */
import { resolveSaveTarget } from "@/lib/cvSaveTarget";
import { cvTypeOf, MASTER, TAILORED } from "@/lib/cvProfiles";

/** مستودع وهمي يرصد كل نداء — يكشف أي حذف تلقائي */
function fakeRepo(list) {
  const calls = { create: 0, update: [], remove: [], list: 0 };
  return {
    calls,
    records: [...list],
    list: async () => { calls.list++; return [...list]; },
    create: async (payload) => { calls.create++; const rec = { id: `new${calls.create}`, ...payload }; return rec; },
    update: async (id, patch) => { calls.update.push([id, patch]); return { id, ...patch }; },
    remove: async (id) => { calls.remove.push(id); },
  };
}

/** يحاكي فرع الحفظ في Builder حرفياً: القرار من resolveSaveTarget ثم update أو create فقط */
async function saveOnce(repo, currentCvId, draft) {
  const target = resolveSaveTarget(currentCvId);
  if (target.mode === "update") return repo.update(target.id, draft);
  return repo.create(draft);
}

export function runSaveTargetTests() {
  const results = [];
  const add = (name, pass, info) => results.push({ name, pass, info });
  const run = async () => {
    const masters = [
      { id: "m1", titel: "Master Consultant", cvType: MASTER },
      { id: "m2", titel: "Master Restaurant", cvType: MASTER },
      { id: "m3", titel: "Master Legal" }, // سجل قديم بلا cvType ⇒ master بالاستنتاج
    ];

    // A) ثلاث Masters + إنشاء سيرة جديدة ⇒ لا حذف ولا استبدال
    {
      const repo = fakeRepo(masters);
      const created = await saveOnce(repo, null, { titel: "CV جديدة" });
      add("A. إنشاء سيرة جديدة لا يحذف أي Master",
        repo.calls.remove.length === 0 && repo.calls.update.length === 0 && repo.calls.list === 0 &&
        repo.records.length === 3 && !!created.id, repo.calls);
      add("A2. السجل القديم بلا cvType يبقى Master", cvTypeOf(masters[2]) === MASTER, cvTypeOf(masters[2]));
    }

    // B) Master + Tailored + إنشاء جديدة ⇒ لا حذف لأي منهما
    {
      const list = [masters[0], { id: "t1", cvType: TAILORED, parentCvId: "m1", jobApplicationId: "job-1" }];
      const repo = fakeRepo(list);
      await saveOnce(repo, null, { titel: "CV جديدة" });
      add("B. Master و Tailored يبقيان بعد إنشاء سيرة جديدة",
        repo.calls.remove.length === 0 && repo.records.length === 2 &&
        cvTypeOf(list[1]) === TAILORED && list[1].parentCvId === "m1", repo.calls);
    }

    // C) تعديل سيرة موجودة ⇒ update على نفس السجل، بلا إنشاء
    {
      const repo = fakeRepo(masters);
      await saveOnce(repo, "m2", { titel: "بعد التعديل" });
      await saveOnce(repo, "m2", { titel: "تعديل ثانٍ" });
      add("C. التعديل يقع على نفس السجل فقط",
        repo.calls.create === 0 && repo.calls.update.length === 2 &&
        repo.calls.update.every(([id]) => id === "m2"), repo.calls.update.map(([id]) => id));
    }

    // D) بلا currentCvId ⇒ سجل جديد
    {
      const repo = fakeRepo(masters);
      const a = await saveOnce(repo, null, { titel: "أولى" });
      const b = await saveOnce(repo, null, { titel: "ثانية" });
      add("D. الحفظ بلا معرّف ينشئ سجلاً جديداً كل مرة",
        repo.calls.create === 2 && a.id !== b.id && repo.calls.update.length === 0, repo.calls);
      add("D2. القرار نفسه صريح", resolveSaveTarget("x").mode === "update" && resolveSaveTarget(null).mode === "create" && resolveSaveTarget("").mode === "create", null);
    }

    // E) لا حذف تلقائي في هذا المسار إطلاقاً
    {
      const repo = fakeRepo(masters);
      await saveOnce(repo, null, { titel: "جديدة" });
      await saveOnce(repo, "m1", { titel: "تعديل" });
      const decisions = [resolveSaveTarget(null), resolveSaveTarget("m1")];
      add("E. لا حذف ولا تنظيف تلقائي",
        repo.calls.remove.length === 0 && decisions.every((d) => d.deletes.length === 0), repo.calls.remove);
    }

    const passed = results.filter((r) => r.pass).length;
    results.forEach((r) => console[r.pass ? "log" : "error"](`${r.pass ? "✅" : "❌"} ${r.name}`, r.info ?? ""));
    console.log(`النتيجة: ${passed}/${results.length}`);
    return { passed, total: results.length, results };
  };
  return run();
}

export default runSaveTargetTests;