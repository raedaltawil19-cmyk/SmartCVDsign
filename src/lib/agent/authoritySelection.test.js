/**
 * اختبارات مسار الجهة المصغّر — نقية: بلا وكيل ولا واجهة ولا شبكة.
 * لا تعمل تلقائياً — استدعِ runAuthoritySelectionTests() في Console أو صفحة تشخيص.
 */
import { authorityOptions, isAuthorityCase, buildAuthorityValue, composeAuthorityValue, OTHER_AUTHORITY } from "./authoritySelection";

const src = (publisher, sourceType, isPrimary) => ({
  title: `${publisher} info`,
  url: `https://x.se/${encodeURIComponent(publisher)}`,
  publisher,
  sourceType,
  isPrimary,
  retrievedContent: "Bedömning av utländsk examen ...",
  retrievalStatus: "fetched"
});

const RESEARCH = {
  status: "ready",
  sources: [
    src("UHR", "official_authority", true),
    src("Socialstyrelsen", "official_authority", false),
    src("Kammarkollegiet", "official_authority", false),
    src("Damascus University", "educational", false),
    src("Nyhetssajt", "secondary", false)
  ]
};

const REQUEST = {
  section: "utbildning",
  itemRef: "utbildning_1",
  field: "beskrivning",
  cvLanguage: { code: "sv", label: "svenska" },
  currentValue: "Juridikstudier vid universitetet",
  research: RESEARCH
};

export function runAuthoritySelectionTests() {
  const results = [];
  const add = (name, pass, note = "") => results.push({ name, pass: !!pass, note: String(note) });
  const AR = /[\u0621-\u064A]/;

  const opts = authorityOptions(RESEARCH).map((o) => o.name);
  add("1. الخيارات جهات رسمية فقط وبالأولية أولاً", JSON.stringify(opts) === JSON.stringify(["UHR", "Socialstyrelsen", "Kammarkollegiet"]), opts);
  add("2. لا اسم جامعة ولا مصدر ثانوي كخيار", !opts.includes("Damascus University") && !opts.includes("Nyhetssajt"));
  add("3. المسار يعمل لسيرة سويدية فقط", isAuthorityCase(REQUEST) && !isAuthorityCase({ ...REQUEST, cvLanguage: { code: "ar" } }));
  add("4. لا بحث ⇒ لا مسار جهة", !isAuthorityCase({ ...REQUEST, research: { status: "no_source", sources: [] } }));

  const built = buildAuthorityValue({ request: REQUEST, selected: "UHR" });
  add("5. القيمة سويدية تُبنى من الاختيار + النصّ الحالي",
    built.ok && built.value === "Juridikstudier vid universitetet. Examen bedömd av UHR." && !AR.test(built.value), built.value);
  add("6. بلا اختيار لا قيمة", buildAuthorityValue({ request: REQUEST, selected: "" }).error === "AUTHORITY_NOT_SELECTED");
  add("7. جهة غير واردة في البحث مرفوضة", buildAuthorityValue({ request: REQUEST, selected: "Migrationsverket" }).ok === false);
  add("8. اسم جهة عربي مرفوض", buildAuthorityValue({ request: REQUEST, selected: OTHER_AUTHORITY, otherName: "جهة" }).error === "VALUE_LANGUAGE_MISMATCH");
  add("9. Annan myndighet باسم سويدي مقبول", buildAuthorityValue({ request: REQUEST, selected: OTHER_AUTHORITY, otherName: "Migrationsverket" }).ok === true);
  add("10. لا نصّ حالي ⇒ جملة واحدة نظيفة", composeAuthorityValue({ authorityName: "UHR", currentValue: "" }) === "Examen bedömd av UHR.");

  const passed = results.filter((x) => x.pass).length;
  return { passed, total: results.length, allPassed: passed === results.length, results };
}

export default runAuthoritySelectionTests;