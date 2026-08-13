/**
 * اختبارات cv_edit_content — معزولة تماماً: لا تلمس cv_move_section، ولا layout، ولا templateId،
 * ولا أي وكيل أو واجهة. تتحقق من التنفيذ الآمن، الحماية، الأنواع، والمعرّفات الثابتة.
 */
import { runCvEditContent, SPRAK_LEVELS } from "@/lib/agent/tools/cvEditContentTool";
import { buildCVIndex } from "@/lib/agent/cvIndex";

const BASE = () => ({
  namn: "Anna Svensson",
  titel: "Frontendutvecklare",
  kontakt: { telefon: "070-123 45 67", epost: "anna@example.se", adress: "Stockholm", linkedin: "" },
  profil: "Utvecklare med sex års erfarenhet.",
  erfarenhet: [
    { roll: "Frontendutvecklare", foretag: "Acme AB", period: "2021 – Nu", beskrivning: "Byggde gränssnitt." },
    { roll: "Webbutvecklare", foretag: "Can Etab", period: "2018 – 2021", beskrivning: "Underhöll webbplatser." }
  ],
  utbildning: [{ examen: "Kandidatexamen", skola: "KTH", period: "2015 – 2018", beskrivning: "" }],
  fardigheter: [{ namn: "React", niva: 85 }, { namn: "CSS", niva: 75 }],
  sprak: [{ sprak: "Svenska", niva: "Flytande" }, { sprak: "Arabiska", niva: "Modersmål" }]
});

const refOf = (data, section, index) =>
  buildCVIndex(data).sections.find((s) => s.section === section).items.find((i) => i.index === index).id;

const results = [];
const check = (name, cond, info) => results.push({ test: name, pass: !!cond, ...(info !== undefined ? { info } : {}) });

/* 1 */ {
  const d = BASE(); const ref = refOf(d, "erfarenhet", 0);
  const r = runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "beskrivning", value: "Ledde utvecklingen av designsystemet.", expectedValue: "Byggde gränssnitt." }, d);
  check("1 replace beskrivning in erfarenhet", r.success && r.newData.erfarenhet[0].beskrivning === "Ledde utvecklingen av designsystemet.");
}
/* 2 */ {
  const d = BASE();
  const r = runCvEditContent({ section: "profil", operation: "replace_field", itemRef: "profile_main", field: "profil", value: "Ny profiltext.", expectedValue: d.profil }, d);
  check("2 replace profil", r.success && r.newData.profil === "Ny profiltext.");
}
/* 3 */ {
  const r = runCvEditContent({ section: "header", operation: "replace_field", itemRef: "header_main", field: "namn", value: "X", expectedValue: "Anna Svensson" }, BASE());
  check("3 header rejected", r.success === false && r.errorCode === "SECTION_FORBIDDEN");
}
/* 4 */ {
  const r = runCvEditContent({ section: "kontakt", operation: "replace_field", itemRef: "contact_main", field: "telefon", value: "0", expectedValue: "070-123 45 67" }, BASE());
  check("4 kontakt rejected", r.success === false && r.errorCode === "SECTION_FORBIDDEN");
}
/* 5 */ {
  const d = BASE(); const ref = refOf(d, "erfarenhet", 0);
  const r = runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "salary", value: "x", expectedValue: "y" }, d);
  check("5 unknown field rejected", r.success === false && r.errorCode === "FIELD_NOT_FOUND");
}
/* 6 */ {
  const d = BASE(); const ref = refOf(d, "erfarenhet", 1);
  const r = runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "company", value: "Can Etab AB", expectedValue: "Can Etab" }, d);
  check("6 role alias field (company) accepted", r.success && r.field === "foretag" && r.newData.erfarenhet[1].foretag === "Can Etab AB");
}
/* 7 */ {
  const d = BASE(); const ref = refOf(d, "fardigheter", 0);
  const r = runCvEditContent({ section: "fardigheter", operation: "replace_field", itemRef: ref, field: "niva", value: "hög", expectedValue: 85 }, d);
  check("7 fardigheter.niva string rejected", r.success === false && r.errorCode === "VALUE_TYPE_INVALID");
}
/* 8 */ {
  const d = BASE(); const ref = refOf(d, "fardigheter", 0);
  const r = runCvEditContent({ section: "fardigheter", operation: "replace_field", itemRef: ref, field: "niva", value: 90, expectedValue: 85 }, d);
  check("8 fardigheter.niva = 90 accepted", r.success && r.newData.fardigheter[0].niva === 90);
}
/* 9 */ {
  const d = BASE(); const ref = refOf(d, "fardigheter", 0);
  const r = runCvEditContent({ section: "fardigheter", operation: "replace_field", itemRef: ref, field: "niva", value: 140, expectedValue: 85 }, d);
  check("9 niva out of 0–100 rejected", r.success === false && r.errorCode === "VALUE_TYPE_INVALID");
}
/* 10 */ {
  const d = BASE(); const ref = refOf(d, "sprak", 1);
  const r = runCvEditContent({ section: "sprak", operation: "replace_field", itemRef: ref, field: "niva", value: "Flytande", expectedValue: "Modersmål" }, d);
  check("10 sprak.niva = Flytande accepted", r.success && r.newData.sprak[1].niva === "Flytande");
}
/* 11 */ {
  const d = BASE(); const ref = refOf(d, "sprak", 0);
  const r = runCvEditContent({ section: "sprak", operation: "replace_field", itemRef: ref, field: "niva", value: 90, expectedValue: "Flytande" }, d);
  check("11 sprak.niva = 90 rejected", r.success === false && r.errorCode === "VALUE_TYPE_INVALID");
}
/* 12 */ {
  const d = BASE(); const ref = refOf(d, "erfarenhet", 0);
  const r = runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "beskrivning", value: "Nytt", expectedValue: "Gammal text som inte stämmer" }, d);
  check("12 stale expectedValue rejected", r.success === false && r.errorCode === "STALE_VALUE");
}
/* 13 */ {
  const r = runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: "experience_zzzzz", field: "beskrivning", value: "x", expectedValue: "y" }, BASE());
  check("13 unknown itemRef rejected", r.success === false && r.errorCode === "ITEM_NOT_FOUND");
}
/* 14 — عنصران متطابقان في حقول الهوية ⇒ نفس البصمة ⇒ المرجع الأساسي غامض */ {
  const d = BASE();
  d.erfarenhet = [
    { roll: "Utvecklare", foretag: "Acme AB", period: "2021 – Nu", beskrivning: "A" },
    { roll: "Utvecklare", foretag: "Acme AB", period: "2021 – Nu", beskrivning: "B" }
  ];
  const ref = refOf(d, "erfarenhet", 0);
  const dup = { ...d, erfarenhet: [d.erfarenhet[0], { ...d.erfarenhet[1] }] };
  // buildCVIndex يلحق رقماً بالثاني، لذا نجرّب المرجع الأساسي على نسخة يتكرر فيها الـID فعلياً
  const idx = buildCVIndex(dup).sections.find((s) => s.section === "erfarenhet").items.map((i) => i.id);
  const r = runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "beskrivning", value: "C", expectedValue: "A" }, dup);
  check("14 duplicate-identity items resolve deterministically or report ambiguity",
    (r.success && r.newData.erfarenhet[0].beskrivning === "C" && r.newData.erfarenhet[1].beskrivning === "B") || r.errorCode === "ITEM_AMBIGUOUS",
    { ids: idx, code: r.errorCode });
}
/* 15 */ {
  const d = BASE();
  const r = runCvEditContent({ section: "erfarenhet", operation: "add_item", item: { roll: "Praktikant", foretag: "Nordic AB", period: "2017 – 2018", beskrivning: "Praktik." } }, d);
  check("15 add_item erfarenhet", r.success && r.newData.erfarenhet.length === 3 && r.newData.erfarenhet[2].roll === "Praktikant" && !!r.newItemRef);
}
/* 16 */ {
  const d = BASE();
  const r = runCvEditContent({ section: "utbildning", operation: "add_item", item: { examen: "Gymnasieexamen", skola: "Södra Latin", period: "2012 – 2015", beskrivning: "Naturvetenskap." }, index: 0 }, d);
  check("16 add_item utbildning at index 0", r.success && r.newData.utbildning.length === 2 && r.newData.utbildning[0].examen === "Gymnasieexamen" && r.newData.utbildning[0].period === "2012 – 2015");
}
/* 17 */ {
  const d = BASE();
  const r = runCvEditContent({ section: "fardigheter", operation: "add_item", item: { namn: "TypeScript", niva: 80 } }, d);
  check("17 add_item fardigheter", r.success && r.newData.fardigheter.length === 3 && r.newData.fardigheter[2].niva === 80);
}
/* 18 */ {
  const d = BASE();
  const r = runCvEditContent({ section: "sprak", operation: "add_item", item: { sprak: "Engelska", niva: "Goda kunskaper" } }, d);
  check("18 add_item sprak", r.success && r.newData.sprak.length === 3);
}
/* 19 */ {
  const r = runCvEditContent({ section: "profil", operation: "add_item", item: { profil: "x" } }, BASE());
  check("19 add_item on profil rejected", r.success === false && r.errorCode === "OPERATION_NOT_ALLOWED_FOR_SECTION");
}
/* 20 */ {
  const d = BASE(); const ref = refOf(d, "erfarenhet", 1);
  const r = runCvEditContent({ section: "erfarenhet", operation: "remove_item", itemRef: ref }, d);
  check("20 remove_item removes only the target", r.success && r.newData.erfarenhet.length === 1 && r.newData.erfarenhet[0].foretag === "Acme AB");
}
/* 21 */ {
  const d = BASE(); const ref = refOf(d, "utbildning", 0);
  const r = runCvEditContent({ section: "utbildning", operation: "remove_item", itemRef: ref }, d);
  check("21 removing last item rejected", r.success === false && r.errorCode === "SECTION_WOULD_BE_EMPTY");
}
/* 22 */ {
  const d = BASE(); const ref = refOf(d, "erfarenhet", 0);
  const r = runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "beskrivning", value: "x", expectedValue: "Byggde gränssnitt.", templateId: "stockholm" }, d);
  check("22 unknown input key rejected", r.success === false && r.errorCode === "INPUT_UNKNOWN_KEYS");
}
/* 23 */ {
  const d = BASE();
  const r = runCvEditContent({ section: "erfarenhet", operation: "add_item", item: { roll: "X", _uid: "abc" } }, d);
  check("23 unknown item key rejected", r.success === false && r.errorCode === "INPUT_UNKNOWN_KEYS");
}
/* 24 */ {
  const d = BASE(); const before = JSON.stringify(d); const ref = refOf(d, "erfarenhet", 0);
  const r = runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "roll", value: "Senior Frontendutvecklare", expectedValue: "Frontendutvecklare" }, d);
  check("24 original cvData untouched", r.success && JSON.stringify(d) === before);
}
/* 25 */ {
  const d = BASE(); const ref = refOf(d, "erfarenhet", 0);
  const r = runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "beskrivning", value: "Ny text.", expectedValue: "Byggde gränssnitt." }, d);
  const same = ["namn", "titel", "kontakt", "profil", "utbildning", "fardigheter", "sprak"].every((k) => JSON.stringify(r.newData[k]) === JSON.stringify(d[k]));
  check("25 rest of CV unchanged", r.success && same && JSON.stringify(r.newData.erfarenhet[1]) === JSON.stringify(d.erfarenhet[1]));
}
/* 26 */ {
  const d = BASE(); const ref = refOf(d, "sprak", 0);
  const r = runCvEditContent({ section: "sprak", operation: "replace_field", itemRef: ref, field: "niva", value: "Modersmål", expectedValue: "Flytande" }, d);
  const shape = r.success && typeof r.newData.namn === "string" && typeof r.newData.profil === "string" && Array.isArray(r.newData.sprak);
  check("26 validateCV passes after operation (valid shape returned)", shape);
}
/* 27 */ {
  const d = BASE(); const ref = refOf(d, "erfarenhet", 0);
  const r = runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "roll", value: "Lead Frontendutvecklare", expectedValue: "Frontendutvecklare" }, d);
  check("27 identity field returns a different newItemRef", r.success && r.itemRef === ref && r.newItemRef && r.newItemRef !== ref, { itemRef: r.itemRef, newItemRef: r.newItemRef });
}
/* 28 */ {
  const d = BASE(); const ref = refOf(d, "erfarenhet", 0);
  const args = { section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "beskrivning", value: "Uppdaterad text.", expectedValue: "Byggde gränssnitt." };
  const first = runCvEditContent(args, d);
  const second = runCvEditContent(args, first.newData);
  check("28 repeating the same op yields STALE_VALUE", first.success && second.success === false && second.errorCode === "STALE_VALUE");
}
/* 29 */ {
  const d = BASE(); const ref = refOf(d, "erfarenhet", 0);
  const step1 = runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "beskrivning", value: "Steg ett.", expectedValue: "Byggde gränssnitt." }, d);
  const ref2 = refOf(step1.newData, "fardigheter", 1);
  const step2 = runCvEditContent({ section: "fardigheter", operation: "replace_field", itemRef: ref2, field: "niva", value: 95, expectedValue: 75 }, step1.newData);
  check("29 two chained operations accumulate", step1.success && step2.success && step2.newData.erfarenhet[0].beskrivning === "Steg ett." && step2.newData.fardigheter[1].niva === 95);
}
/* 30 */ {
  const d = BASE(); const ref = refOf(d, "erfarenhet", 0);
  const r = runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "beskrivning", value: "x", expectedValue: "Byggde gränssnitt." }, d);
  const noLayout = r.success && !("layout" in r) && !("templateId" in r) && !("layout" in r.newData) && !("templateId" in r.newData);
  const rejectLayout = runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "beskrivning", value: "x", expectedValue: "Byggde gränssnitt.", layout: { main: [] } }, d);
  check("30 layout/templateId neither accepted nor returned", noLayout && rejectLayout.errorCode === "INPUT_UNKNOWN_KEYS");
}

/* ===== إصلاحات جودة البيانات ===== */
const FULL_EXP = { roll: "Praktikant", foretag: "Nordic AB", period: "2017 – 2018", beskrivning: "Praktik." };

/* 31 */ {
  const r = runCvEditContent({ section: "erfarenhet", operation: "add_item", item: {} }, BASE());
  check("31 add_item with empty item rejected", r.errorCode === "ITEM_REQUIRED_FIELDS");
}
/* 32 */ {
  const r = runCvEditContent({ section: "erfarenhet", operation: "add_item", item: { roll: "X", foretag: "Y" } }, BASE());
  check("32 add_item with partial item rejected", r.errorCode === "ITEM_REQUIRED_FIELDS", r.message);
}
/* 33 */ {
  const { roll, ...rest } = FULL_EXP;
  const r = runCvEditContent({ section: "erfarenhet", operation: "add_item", item: rest }, BASE());
  check("33 erfarenhet without roll rejected", r.errorCode === "ITEM_REQUIRED_FIELDS");
}
/* 34 */ {
  const r = runCvEditContent({ section: "utbildning", operation: "add_item", item: { skola: "KTH", period: "2010 – 2013", beskrivning: "" } }, BASE());
  check("34 utbildning without examen rejected", r.errorCode === "ITEM_REQUIRED_FIELDS");
}
/* 35 */ {
  const r = runCvEditContent({ section: "fardigheter", operation: "add_item", item: { niva: 70 } }, BASE());
  check("35 fardigheter without namn rejected", r.errorCode === "ITEM_REQUIRED_FIELDS");
}
/* 36 */ {
  const r = runCvEditContent({ section: "sprak", operation: "add_item", item: { niva: "Flytande" } }, BASE());
  check("36 sprak without sprak rejected", r.errorCode === "ITEM_REQUIRED_FIELDS");
}
/* 37 */ {
  const r = runCvEditContent({ section: "sprak", operation: "add_item", item: { sprak: "Engelska" } }, BASE());
  check("37 sprak without niva rejected", r.errorCode === "ITEM_REQUIRED_FIELDS");
}
/* 38 */ {
  const r = runCvEditContent({ section: "sprak", operation: "add_item", item: { sprak: "Engelska", niva: "Bra" } }, BASE());
  check("38 sprak with invalid niva rejected", r.errorCode === "VALUE_TYPE_INVALID");
}
/* 39 */ {
  const r = runCvEditContent({ section: "erfarenhet", operation: "add_item", item: { ...FULL_EXP, foretag: "   " } }, BASE());
  check("39 empty identity field rejected", r.errorCode === "ITEM_IDENTITY_REQUIRED", r.message);
}
/* 40 */ {
  const d = BASE(); const ref = refOf(d, "erfarenhet", 0);
  const r = runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "beskrivning", value: "", expectedValue: "Byggde gränssnitt." }, d);
  check("40 empty string value rejected", r.errorCode === "VALUE_EMPTY");
}
/* 41 */ {
  const d = BASE(); const ref = refOf(d, "erfarenhet", 0);
  const r = runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "beskrivning", value: "Ny.", expectedValue: "Byggde gränssnitt.", index: 0 }, d);
  check("41 index in replace_field rejected", r.errorCode === "INPUT_UNKNOWN_KEYS");
}
/* 42 */ {
  const r = runCvEditContent({ section: "erfarenhet", operation: "add_item", item: { ...FULL_EXP, plats: "Stockholm" } }, BASE());
  check("42 add_item with unknown item field rejected", r.errorCode === "INPUT_UNKNOWN_KEYS");
}
/* 43 */ {
  const d = BASE(); const ref = refOf(d, "erfarenhet", 0);
  const r = runCvEditContent({ section: "erfarenhet", operation: "remove_item", itemRef: ref, field: "roll" }, d);
  check("43 remove_item with extra field rejected", r.errorCode === "INPUT_UNKNOWN_KEYS");
}
/* 44 */ {
  const d = BASE(); const before = JSON.stringify(d); const ref = refOf(d, "erfarenhet", 0);
  const failures = [
    runCvEditContent({ section: "erfarenhet", operation: "add_item", item: {} }, d),
    runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "roll", value: "", expectedValue: "Frontendutvecklare" }, d),
    runCvEditContent({ section: "sprak", operation: "add_item", item: { sprak: "Engelska", niva: "Bra" } }, d),
    runCvEditContent({ section: "erfarenhet", operation: "remove_item", itemRef: ref, index: 0 }, d)
  ];
  check("44 no failure mutates the original cvData", failures.every((f) => f.success === false) && JSON.stringify(d) === before);
}

check("levels list matches cvModel guidance", SPRAK_LEVELS.length === 4);

export const CV_EDIT_CONTENT_TEST_RESULTS = results;
export const ALL_PASSED = results.every((r) => r.pass);