/**
 * اختبارات مسار التخصيص الفعلي — بيانات وهمية فقط، بلا شبكة وبلا قاعدة بيانات.
 * تُشغَّل عبر runTailoringSessionTests().
 */
import { resolveBaseCV, startTailoringSession, adFromUserText } from "./tailoringSession";

const MASTER_COACH = {
  id: "m_coach", titel: "CV كوتش", cvType: "master", updated_date: "2026-01-02", templateId: "stockholm", layout: { main: ["profil"] },
  data: { titel: "Arbetskonsulent", profil: "Jag stöttar arbetssökande mot arbetsmarknaden.", erfarenhet: [{ roll: "Arbetskonsulent", foretag: "AME" }], utbildning: [{ examen: "Socialt arbete" }], fardigheter: [{ namn: "Coaching" }, { namn: "Matchning" }], sprak: [{ sprak: "Svenska" }] },
};
const MASTER_DEV = {
  id: "m_dev", titel: "CV مطوّر", cvType: "master", updated_date: "2026-01-05", templateId: "techpro", layout: { main: ["profil"] },
  data: { titel: "Frontendutvecklare", profil: "Jag bygger webbgränssnitt.", erfarenhet: [{ roll: "Frontendutvecklare" }], utbildning: [{ examen: "Datateknik" }], fardigheter: [{ namn: "React" }, { namn: "JavaScript" }], sprak: [{ sprak: "Svenska" }] },
};
const TAILORED_OLD = { id: "t_old", titel: "نسخة قديمة", cvType: "tailored", parentCvId: "m_coach", data: { titel: "Arbetskonsulent" } };
const LEGACY = { id: "legacy", titel: "سيرة قديمة", updated_date: "2025-11-01", data: { titel: "Arbetskonsulent", fardigheter: [{ namn: "Coaching" }] } };

const JOB_COACH = { rubrik: "Arbetskonsulenter till AME", beskrivning: "Vi söker arbetskonsulent med coaching och matchning." };
const JOB_DEV = { rubrik: "Frontendutvecklare med React", beskrivning: "Vi söker frontendutvecklare som arbetar med React och JavaScript." };
const JOB_FAR = { rubrik: "Lastbilschaufför sökes", beskrivning: "Vi söker chaufför med CE-behörighet för fjärrtransport." };

const fakeRepo = () => {
  const calls = [];
  return {
    calls,
    create: async (p) => { calls.push("create"); return { id: "new_1", ...p }; },
    update: async () => { calls.push("update"); throw new Error("update محظور"); },
    remove: async () => { calls.push("remove"); throw new Error("remove محظور"); },
  };
};

export async function runTailoringSessionTests() {
  const results = [];
  const T = (name, pass, note) => results.push({ name, pass: !!pass, note });
  const LIST = [MASTER_COACH, MASTER_DEV, TAILORED_OLD, LEGACY];

  // 1) Fast Matching يختار الأساس الصحيح عند غياب اختيار صريح
  let r = resolveBaseCV({ list: LIST, ad: JOB_COACH });
  T("1a. مطابقة → أساس الكوتش", r.base?.id === "m_coach" && r.source === "match", JSON.stringify({ id: r.base?.id, conf: r.confidence }));
  r = resolveBaseCV({ list: LIST, ad: JOB_DEV });
  T("1b. مطابقة → أساس المطوّر", r.base?.id === "m_dev" && r.confidence === "strong", JSON.stringify({ id: r.base?.id, margin: r.margin }));

  // 2) none: لا اختيار عشوائي ولا إنشاء
  const repoNone = fakeRepo();
  const none = await startTailoringSession({ repository: repoNone, list: LIST, ad: JOB_FAR });
  T("2a. وظيفة بعيدة → NO_CONFIDENT_BASE", none.error === "NO_CONFIDENT_BASE" && !none.tailored, JSON.stringify({ error: none.error, conf: none.resolved.confidence }));
  T("2b. لا إنشاء عند none", repoNone.calls.length === 0, JSON.stringify(repoNone.calls));
  const empty = resolveBaseCV({ list: [TAILORED_OLD], ad: JOB_COACH });
  T("2c. لا نسخة أساس متاحة → none", empty.base === null && empty.confidence === "none");

  // 3) weak: يُكمل بحذر مع علم cautious
  const twinA = { ...MASTER_COACH, id: "twin_a", updated_date: "2026-02-01" };
  const twinB = { ...MASTER_COACH, id: "twin_b", updated_date: "2026-03-01" };
  const weak = resolveBaseCV({ list: [twinA, twinB], ad: JOB_COACH });
  T("3a. تعادل → weak + cautious", weak.confidence === "weak" && weak.cautious === true, JSON.stringify({ conf: weak.confidence, margin: weak.margin }));
  T("3b. weak يكسر التعادل بالأحدث", weak.base?.id === "twin_b", weak.base?.id);
  const repoWeak = fakeRepo();
  const weakStart = await startTailoringSession({ repository: repoWeak, list: [twinA, twinB], ad: JOB_COACH });
  T("3c. weak يُنشئ نسخة مع رفع علم الحذر", weakStart.cautious === true && !!weakStart.tailored, JSON.stringify({ cautious: weakStart.cautious, id: weakStart.tailored?.id }));

  // 4) الاختيار الصريح للمستخدم يُحترم ولا تُستبدل به المطابقة
  r = resolveBaseCV({ list: LIST, preferredId: "m_dev", ad: JOB_COACH });
  T("4a. الاختيار الصريح مقدَّم على المطابقة", r.base?.id === "m_dev" && r.source === "explicit", r.confidence);
  r = resolveBaseCV({ list: LIST, preferredId: "legacy", ad: JOB_COACH });
  T("4b. سجل قديم بلا cvType يصلح أساساً صريحاً", r.base?.id === "legacy" && r.source === "explicit");

  // 5) تخصيص فوق تخصيص → يعود للأصل
  r = resolveBaseCV({ list: LIST, preferredId: "t_old", ad: JOB_COACH });
  T("5a. النسخة المخصّصة تُرجع إلى أصلها", r.base?.id === "m_coach" && r.source === "parent");
  const orphan = { id: "t_orphan", cvType: "tailored", parentCvId: "gone", data: {} };
  r = resolveBaseCV({ list: [orphan, MASTER_COACH], preferredId: "t_orphan", ad: JOB_COACH });
  T("5b. نسخة بلا أصل → تعود للمطابقة", r.source === "match" && r.base?.id === "m_coach");

  // 6) الأصل لا يُمَسّ + create فقط
  const repo = fakeRepo();
  const before = JSON.stringify(MASTER_COACH);
  const ses = await startTailoringSession({ repository: repo, list: LIST, preferredId: "m_coach", ad: JOB_COACH, jobApplicationId: "app_9" });
  T("6a. create فقط — لا update ولا remove", JSON.stringify(repo.calls) === JSON.stringify(["create"]), JSON.stringify(repo.calls));
  T("6b. الأصل لم يتغيّر بايتاً", JSON.stringify(MASTER_COACH) === before);
  T("6c. النسخة tailored ومرتبطة بالأصل والطلب", ses.tailored.cvType === "tailored" && ses.tailored.parentCvId === "m_coach" && ses.tailored.jobApplicationId === "app_9", JSON.stringify({ t: ses.tailored.cvType, p: ses.tailored.parentCvId, j: ses.tailored.jobApplicationId }));
  T("6d. القالب والهيكل منقولان", ses.tailored.templateId === "stockholm" && !!ses.tailored.layout);

  // 7) استقلال النسخة (نسخ عميق)
  ses.tailored.data.profil = "نصّ معدَّل في النسخة";
  ses.tailored.layout.main.push("erfarenhet");
  T("7a. تعديل النسخة لا يلمس بيانات الأصل", MASTER_COACH.data.profil === "Jag stöttar arbetssökande mot arbetsmarknaden.");
  T("7b. تعديل هيكل النسخة لا يلمس هيكل الأصل", MASTER_COACH.layout.main.length === 1);

  // 8) رفض التخصيص انطلاقاً من نسخة مخصّصة كأساس مباشر
  const repoBad = fakeRepo();
  const bad = await startTailoringSession({ repository: repoBad, list: [TAILORED_OLD], preferredId: "t_old", ad: JOB_COACH });
  T("8. أساس غير صالح يُرفض بلا إنشاء", !!bad.error && repoBad.calls.length === 0, bad.error);

  // 9) صفر نموذج لغوي / شبكة في مسار الربط
  const src = [resolveBaseCV, startTailoringSession, adFromUserText].map(String).join("\n");
  const banned = ["InvokeLLM", "integrations", "fetch(", "agents."].filter((k) => src.includes(k));
  T("9. صفر نموذج لغوي أو شبكة في المسار", banned.length === 0, JSON.stringify(banned));

  // 10) إعلان مبسّط من نصّ المستخدم يكفي للمطابقة
  const fromText = resolveBaseCV({ list: LIST, ad: adFromUserText("أريد التخصيص لوظيفة Frontendutvecklare med React i Stockholm") });
  T("10. المطابقة من نصّ المستخدم", fromText.base?.id === "m_dev", JSON.stringify({ id: fromText.base?.id, conf: fromText.confidence }));

  const passed = results.filter((x) => x.pass).length;
  return { passed, total: results.length, allPassed: passed === results.length, results };
}