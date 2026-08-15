/**
 * اختبارات فعلية لـ Fast Matching ومسار master/tailored — ببيانات وهمية بالكامل.
 * نقية: لا قاعدة بيانات، لا شبكة، لا نموذج لغوي. المستودع محاكى في الذاكرة.
 * لا تعمل تلقائياً — استدعِ runCvProfilesTests().
 */
import { localMatchScore, matchDetails, cvKeywords } from "./jobMatcher";
import {
  MASTER, TAILORED, cvTypeOf, isMaster, isTailored, baseCandidates,
  rankBaseCVs, pickBestBaseCV, buildTailoredPayload, createTailoredCV, tailoredChildrenOf,
} from "./cvProfiles";

/* ── بيانات وهمية: 4 ملفات سيرة + نسخة مخصّصة قائمة ── */
const CV_COACH = {
  id: "cv_coach", titel: "Arbetskonsulent", cvType: MASTER, templateId: "nordic",
  layout: { main: ["profil", "erfarenhet"], sidebar: ["fardigheter"] }, updated_date: "2026-08-10",
  data: {
    titel: "Arbetskonsulent och Arbetscoach",
    profil: "Erfaren arbetskonsulent med fokus på coachning, matchning mot arbete och samverkan med arbetsgivare.",
    erfarenhet: [{ roll: "Arbetskonsulent", beskrivning: "Coachning" }, { roll: "Arbetsförmedlare" }, { roll: "Integrationsassistent" }],
    fardigheter: [{ namn: "Coachning och motiverande samtal" }, { namn: "Matchning mot arbete" }, { namn: "Kartläggning" }, { namn: "Arbetsgivarsamverkan" }, { namn: "Handlingsplaner" }],
    utbildning: [{ examen: "Juristexamen" }, { examen: "Tolkutbildning" }],
    sprak: [{ sprak: "Svenska" }, { sprak: "Arabiska" }],
  },
};
const CV_DEV = {
  id: "cv_dev", titel: "Frontend-utvecklare", cvType: MASTER, templateId: "techpro",
  layout: { main: ["profil"], sidebar: ["fardigheter"] }, updated_date: "2026-08-12",
  data: {
    titel: "Frontend-utvecklare",
    profil: "Utvecklare med React, TypeScript och tillgänglighet i webbgränssnitt.",
    erfarenhet: [{ roll: "Frontend-utvecklare" }, { roll: "Webbutvecklare" }],
    fardigheter: [{ namn: "React" }, { namn: "TypeScript" }, { namn: "CSS" }, { namn: "Testning" }, { namn: "Git" }],
    utbildning: [{ examen: "Systemvetenskap" }], sprak: [{ sprak: "Svenska" }],
  },
};
const CV_NURSE = {
  id: "cv_nurse", titel: "Sjuksköterska", cvType: MASTER, templateId: "nordic",
  layout: { main: ["profil"], sidebar: [] }, updated_date: "2026-08-11",
  data: {
    titel: "Sjuksköterska",
    profil: "Legitimerad sjuksköterska med erfarenhet av omvårdnad och patientsäkerhet på vårdavdelning.",
    erfarenhet: [{ roll: "Sjuksköterska" }, { roll: "Undersköterska" }],
    fardigheter: [{ namn: "Omvårdnad" }, { namn: "Patientsäkerhet" }, { namn: "Läkemedelshantering" }],
    utbildning: [{ examen: "Sjuksköterskeprogrammet" }], sprak: [{ sprak: "Svenska" }],
  },
};
/** سيرة فقيرة في نفس مجال CV_COACH — الفخّ الذي كان النموذج القديم يسقط فيه */
const CV_THIN = {
  id: "cv_thin", titel: "Arbetskonsulent (kort)", cvType: MASTER, templateId: "nordic",
  layout: { main: ["profil"], sidebar: [] }, updated_date: "2026-08-13",
  data: { titel: "Arbetskonsulent", profil: "", erfarenhet: [{ roll: "Arbetskonsulent" }], fardigheter: [{ namn: "Coachning" }], utbildning: [], sprak: [] },
};
/** سجل قديم بلا cvType — يجب أن يُستنتج master بلا كتابة */
const CV_LEGACY = { id: "cv_legacy", titel: "Gammal", templateId: "stockholm", updated_date: "2026-01-01", data: { titel: "Lärare", erfarenhet: [{ roll: "Lärare" }], fardigheter: [{ namn: "Pedagogik" }] } };
const CV_EXISTING_TAILORED = { id: "cv_t1", titel: "Arbetskonsulent — AME", cvType: TAILORED, parentCvId: "cv_coach", data: { titel: "Arbetskonsulent" } };

const ALL = [CV_COACH, CV_DEV, CV_NURSE, CV_THIN, CV_LEGACY, CV_EXISTING_TAILORED];

/* ── وظائف وهمية ── */
const JOB_COACH = { rubrik: "Arbetskonsulenter till Arbetsmarknadsenheten", beskrivning: "Vi söker arbetskonsulent som arbetar med coachning, kartläggning och matchning mot arbete i samverkan med arbetsgivare. Handlingsplaner och uppföljning ingår." };
const JOB_COACH_INFLECTED = { rubrik: "Arbetsmarknadskonsulenter", beskrivning: "Du coachar deltagare, gör kartläggningar och samverkar med arbetsgivare kring matchning mot arbete." };
const JOB_DEV = { rubrik: "Frontendutvecklare med React", beskrivning: "Vi söker en utvecklare inom React och TypeScript för vårt webbgränssnitt. Testning och git är meriterande." };
const JOB_NURSE = { rubrik: "Sjuksköterska till vårdavdelning", beskrivning: "Legitimerad sjuksköterska för omvårdnad, läkemedelshantering och patientsäkerhet." };
const JOB_UNRELATED = { rubrik: "Lastbilschaufför", beskrivning: "Vi söker chaufför med CE-behörighet för distribution av gods i Norrland." };

export function runCvProfilesTests() {
  const results = [];
  const add = (name, pass, note) => results.push({ name, pass: !!pass, note: typeof note === "string" ? note : JSON.stringify(note) });

  /* 1. اختيار الأساس الصحيح لكل وظيفة */
  const cases = [
    ["وظيفة كونسولنت", JOB_COACH, "cv_coach"],
    ["وظيفة كونسولنت بتصريف مختلف", JOB_COACH_INFLECTED, "cv_coach"],
    ["وظيفة مطوّر", JOB_DEV, "cv_dev"],
    ["وظيفة تمريض", JOB_NURSE, "cv_nurse"],
  ];
  for (const [label, job, expected] of cases) {
    const r = pickBestBaseCV(ALL, job);
    add(`1. ${label} → ${expected}`, r.best?.id === expected, { picked: r.best?.id, score: r.score, margin: r.margin, ranked: r.ranked.map((x) => `${x.id}:${x.score}`) });
  }

  /* 2. الغنى لا يُعاقَب: الغنية تتقدّم على الفقيرة في نفس المجال */
  {
    const rich = localMatchScore(CV_COACH.data, JOB_COACH);
    const thin = localMatchScore(CV_THIN.data, JOB_COACH);
    add("2. السيرة الغنية تتفوّق على الفقيرة في نفس المجال", rich > thin, { rich, thin });
  }

  /* 3. التصريف السويدي: konsulenter/arbetsmarknads… تُطابق */
  {
    const s = localMatchScore(CV_COACH.data, JOB_COACH_INFLECTED);
    add("3. المطابقة تصمد أمام التصريف والكلمات المركّبة", s >= 50, { score: s });
  }

  /* 4. وظيفة غير ذات صلة → درجات منخفضة للجميع */
  {
    const scores = [CV_COACH, CV_DEV, CV_NURSE].map((c) => localMatchScore(c.data, JOB_UNRELATED));
    add("4. وظيفة بعيدة عن كل الملفات تُنتج درجات منخفضة", Math.max(...scores) < 35, scores);
  }

  /* 5. تمييز الأنواع، والسجل القديم يُستنتج master بلا كتابة */
  {
    const legacyBefore = JSON.stringify(CV_LEGACY);
    add("5a. cvType الافتراضي master للسجل القديم", cvTypeOf(CV_LEGACY) === MASTER && isMaster(CV_LEGACY));
    add("5b. النسخة المخصّصة تُصنَّف tailored", isTailored(CV_EXISTING_TAILORED) && !isMaster(CV_EXISTING_TAILORED));
    add("5c. الاستنتاج لا يعدّل السجل", JSON.stringify(CV_LEGACY) === legacyBefore);
  }

  /* 6. النسخ المخصّصة مستثناة من مرشّحي الأساس */
  {
    const ids = baseCandidates(ALL).map((c) => c.id);
    add("6. tailored لا يصلح أساساً", !ids.includes("cv_t1") && ids.includes("cv_legacy"), ids);
  }

  /* 7. إنشاء نسخة مخصّصة: create فقط، والأصل لم يُمَسّ */
  {
    const beforeBase = JSON.stringify(CV_COACH);
    const calls = [];
    const repo = {
      create: async (p) => { calls.push(["create", p]); return { id: "cv_new", ...p }; },
      update: async () => { calls.push(["update"]); throw new Error("UPDATE_CALLED"); },
      remove: async () => { calls.push(["remove"]); throw new Error("REMOVE_CALLED"); },
    };
    let created = null, err = null;
    // مزامنة الاختبار: نُنفّذ الوعد فوراً ونُجمّع النتيجة في نهاية الدالة
    const promise = createTailoredCV(repo, { base: CV_COACH, ad: JOB_COACH, jobApplicationId: "app_1" })
      .then((r) => { created = r.created; }).catch((e) => { err = String(e); });

    return promise.then(() => {
      add("7a. الأصل لم يتغيّر إطلاقاً", JSON.stringify(CV_COACH) === beforeBase);
      add("7b. create فقط — لا update ولا remove", calls.length === 1 && calls[0][0] === "create", calls.map((c) => c[0]));
      add("7c. النسخة الجديدة tailored ومرتبطة بالأصل", created?.cvType === TAILORED && created?.parentCvId === "cv_coach" && created?.jobApplicationId === "app_1", { cvType: created?.cvType, parentCvId: created?.parentCvId });
      add("7d. بلا خطأ", err === null, err);

      /* 8. استقلال النسخة: تعديلها لا يلمس الأصل */
      {
        const built = buildTailoredPayload({ base: CV_COACH, ad: JOB_DEV });
        built.payload.data.titel = "MUTERAD";
        built.payload.data.erfarenhet[0].roll = "MUTERAD";
        built.payload.layout.main.push("MUTERAD");
        add("8. النسخة مستقلة (نسخ عميق)",
          CV_COACH.data.titel === "Arbetskonsulent och Arbetscoach" &&
          CV_COACH.data.erfarenhet[0].roll === "Arbetskonsulent" &&
          !CV_COACH.layout.main.includes("MUTERAD"));
      }

      /* 9. رفض بناء نسخة من نسخة مخصّصة أو من أساس غير صالح */
      add("9a. لا تخصيص انطلاقاً من tailored", buildTailoredPayload({ base: CV_EXISTING_TAILORED, ad: JOB_COACH }).error === "BASE_MUST_BE_MASTER");
      add("9b. أساس غير صالح يُرفض", buildTailoredPayload({ base: { id: "x" }, ad: JOB_COACH }).error === "BASE_CV_INVALID");

      /* 10. المطابقة بلا نموذج لغوي: لا أثر لأي استدعاء ذكاء اصطناعي في الكود */
      {
        const src = [localMatchScore, matchDetails, cvKeywords, rankBaseCVs, pickBestBaseCV, buildTailoredPayload, createTailoredCV].map(String).join("\n");
        const forbidden = ["InvokeLLM", "integrations", "fetch(", "base44", "await base44", "agents"];
        const hit = forbidden.filter((f) => src.includes(f));
        add("10. صفر نموذج لغوي/شبكة في مسار المطابقة", hit.length === 0, hit);
      }

      /* 11. المطابقة لا تقرأ السيرة كاملة: حقول محدودة تكفي */
      {
        const partial = { titel: CV_COACH.data.titel, fardigheter: CV_COACH.data.fardigheter, erfarenhet: CV_COACH.data.erfarenhet.map((e) => ({ roll: e.roll })), profil: CV_COACH.data.profil, utbildning: CV_COACH.data.utbildning };
        const full = localMatchScore(CV_COACH.data, JOB_COACH);
        const light = localMatchScore(partial, JOB_COACH);
        add("11. الدرجة تُحتسب من ملخّص الحقول لا من السيرة الكاملة", full === light, { full, light });
      }

      /* 12. الثقة: تعادل ⇒ weak */
      {
        const twin = { ...CV_COACH, id: "cv_twin", updated_date: "2026-08-14" };
        const r = pickBestBaseCV([CV_COACH, twin], JOB_COACH);
        add("12a. التعادل يُعطي ثقة weak", r.confidence === "weak" && r.margin === 0, { conf: r.confidence, margin: r.margin });
        add("12b. كسر التعادل بالأحدث تحديثاً", r.best?.id === "cv_twin", r.best?.id);
        const strong = pickBestBaseCV(ALL, JOB_DEV);
        add("12c. فارق واضح يُعطي ثقة strong", strong.confidence === "strong", { margin: strong.margin });
      }

      /* 13. لا مرشّحين ⇒ none بلا انفجار */
      {
        const r = pickBestBaseCV([CV_EXISTING_TAILORED], JOB_COACH);
        add("13. لا نسخة أساس ⇒ confidence=none", r.best === null && r.confidence === "none");
      }

      /* 14. أبناء نسخة أساس */
      add("14. تتبّع النسخ المشتقّة", tailoredChildrenOf(ALL, "cv_coach").map((c) => c.id).join() === "cv_t1");

      const passed = results.filter((r) => r.pass).length;
      return { passed, total: results.length, allPassed: passed === results.length, results };
    });
  }
}

export default runCvProfilesTests;