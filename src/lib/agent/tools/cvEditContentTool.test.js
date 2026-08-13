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
/* 3 — header صار محتوى قابلاً للتعديل (وليس قسماً قابلاً للنقل) */ {
  const d = BASE();
  const r = runCvEditContent({ section: "header", operation: "replace_field", itemRef: "header_main", field: "namn", value: "Anna B. Svensson", expectedValue: "Anna Svensson" }, d);
  check("3 header content editable", r.success && r.newData.namn === "Anna B. Svensson");
}
/* 4 — kontakt صار محتوى قابلاً للتعديل */ {
  const d = BASE();
  const r = runCvEditContent({ section: "kontakt", operation: "replace_field", itemRef: "contact_main", field: "telefon", value: "0701234567", expectedValue: "070-123 45 67" }, d);
  check("4 kontakt content editable", r.success && r.newData.kontakt.telefon === "0701234567");
}
/* 4b — القسم غير الموجود ما زال مرفوضاً */ {
  const r = runCvEditContent({ section: "metadata", operation: "replace_field", itemRef: "x", field: "y", value: "z", expectedValue: "w" }, BASE());
  check("4b unknown section rejected", r.errorCode === "SECTION_FORBIDDEN");
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
  const r = runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "roll", value: "   ", expectedValue: "Frontendutvecklare" }, d);
  check("40 empty required string value rejected", r.errorCode === "VALUE_EMPTY");
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

/* ===== header + kontakt (محتوى السيرة الكامل) ===== */
const H = { section: "header", operation: "replace_field", itemRef: "header_main" };
const K = { section: "kontakt", operation: "replace_field", itemRef: "contact_main" };

/* 45 */ {
  const d = BASE();
  const r = runCvEditContent({ ...H, field: "namn", value: "Anna Karlsson", expectedValue: "Anna Svensson" }, d);
  check("45 edit namn via header_main", r.success && r.newData.namn === "Anna Karlsson" && r.newItemRef === "header_main");
}
/* 46 */ {
  const d = BASE();
  const r = runCvEditContent({ ...H, field: "titel", value: "Business Systems Consultant", expectedValue: "Frontendutvecklare" }, d);
  check("46 edit titel via header_main", r.success && r.newData.titel === "Business Systems Consultant");
}
/* 47 */ {
  const d = BASE();
  const r = runCvEditContent({ ...K, field: "telefon", value: "0701234567", expectedValue: "070-123 45 67" }, d);
  check("47 edit telefon via contact_main", r.success && r.newData.kontakt.telefon === "0701234567");
}
/* 48 */ {
  const d = BASE();
  const r = runCvEditContent({ ...K, field: "epost", value: "anna.svensson@företag.se", expectedValue: "anna@example.se" }, d);
  check("48 edit epost via contact_main", r.success && r.newData.kontakt.epost === "anna.svensson@företag.se");
}
/* 49 */ {
  const d = BASE();
  const r = runCvEditContent({ ...K, field: "adress", value: "Göteborg", expectedValue: "Stockholm" }, d);
  check("49 edit adress", r.success && r.newData.kontakt.adress === "Göteborg");
}
/* 50 */ {
  const d = BASE();
  const r = runCvEditContent({ ...K, field: "linkedin", value: "linkedin.com/in/anna", expectedValue: "" }, d);
  check("50 edit linkedin (empty before)", r.success && r.newData.kontakt.linkedin === "linkedin.com/in/anna");
}
/* 51 */ {
  const r = runCvEditContent({ section: "header", operation: "replace_field", itemRef: "header_x", field: "namn", value: "X", expectedValue: "Anna Svensson" }, BASE());
  check("51 wrong header itemRef rejected", r.errorCode === "ITEM_NOT_FOUND");
}
/* 52 */ {
  const r = runCvEditContent({ section: "kontakt", operation: "replace_field", itemRef: "kontakt_main", field: "telefon", value: "0", expectedValue: "070-123 45 67" }, BASE());
  check("52 wrong contact itemRef rejected", r.errorCode === "ITEM_NOT_FOUND");
}
/* 53 */ {
  const r = runCvEditContent({ ...H, field: "personnummer", value: "x", expectedValue: "y" }, BASE());
  check("53 unknown header field rejected", r.errorCode === "FIELD_NOT_FOUND");
}
/* 54 */ {
  const r = runCvEditContent({ ...K, field: "fax", value: "x", expectedValue: "y" }, BASE());
  check("54 unknown kontakt field rejected", r.errorCode === "FIELD_NOT_FOUND");
}
/* 55 */ {
  const r = runCvEditContent({ ...K, field: "kontakt", value: "x", expectedValue: "y" }, BASE());
  check("55 editing kontakt as a whole object rejected", r.errorCode === "FIELD_NOT_FOUND");
}
/* 56 */ {
  const r = runCvEditContent({ ...H, field: "header", value: "x", expectedValue: "y" }, BASE());
  check("56 editing header as a whole object rejected", r.errorCode === "FIELD_NOT_FOUND");
}
/* 57 */ {
  const d = BASE();
  const r = runCvEditContent({ ...K, field: "phone", value: "0709999999", expectedValue: "070-123 45 67" }, d);
  check("57 correct expectedValue for phone (role alias)", r.success && r.field === "telefon");
}
/* 58 */ {
  const r = runCvEditContent({ ...K, field: "telefon", value: "0709999999", expectedValue: "0700000000" }, BASE());
  check("58 wrong phone expectedValue → STALE_VALUE", r.errorCode === "STALE_VALUE");
}
/* 59 */ {
  const r = runCvEditContent({ ...K, field: "epost", value: "ny@example.se", expectedValue: "fel@example.se" }, BASE());
  check("59 wrong email expectedValue → STALE_VALUE", r.errorCode === "STALE_VALUE");
}
/* 60 */ {
  const r = runCvEditContent({ ...K, field: "epost", value: "anna(at)example", expectedValue: "anna@example.se" }, BASE());
  check("60 invalid email → VALUE_FORMAT_INVALID", r.errorCode === "VALUE_FORMAT_INVALID");
}
/* 61 */ {
  const r = runCvEditContent({ ...K, field: "telefon", value: "  ", expectedValue: "070-123 45 67" }, BASE());
  check("61 empty phone → VALUE_EMPTY", r.errorCode === "VALUE_EMPTY");
}
/* 62 */ {
  const r = runCvEditContent({ ...H, field: "namn", value: "", expectedValue: "Anna Svensson" }, BASE());
  check("62 empty namn → VALUE_EMPTY", r.errorCode === "VALUE_EMPTY");
}
/* 63 */ {
  const r = runCvEditContent({ ...H, field: "titel", value: "   ", expectedValue: "Frontendutvecklare" }, BASE());
  check("63 empty titel → VALUE_EMPTY", r.errorCode === "VALUE_EMPTY");
}
/* 64 */ {
  const d = { ...BASE(), layout: { main: ["profil"], sidebar: [] } };
  const r = runCvEditContent({ ...H, field: "namn", value: "Ny Namn", expectedValue: "Anna Svensson" }, d);
  check("64 layout in cvData stays untouched", r.success && JSON.stringify(r.newData.layout) === JSON.stringify(d.layout));
}
/* 65 */ {
  const d = { ...BASE(), templateId: "stockholm" };
  const r = runCvEditContent({ ...K, field: "adress", value: "Malmö", expectedValue: "Stockholm" }, d);
  check("65 templateId in cvData stays untouched", r.success && r.newData.templateId === "stockholm");
}
/* 66 */ {
  const d = BASE();
  const r = runCvEditContent({ ...H, field: "titel", value: "Systemutvecklare", expectedValue: "Frontendutvecklare" }, d);
  const same = ["namn", "kontakt", "profil", "erfarenhet", "utbildning", "fardigheter", "sprak"].every((k) => JSON.stringify(r.newData[k]) === JSON.stringify(d[k]));
  check("66 rest of CV unchanged after header edit", r.success && same);
}
/* 67 */ {
  const d = BASE();
  const r = runCvEditContent({ ...H, field: "namn", value: "Anna S.", expectedValue: "Anna Svensson" }, d);
  check("67 header edit touches no other section", r.success && r.newData.titel === d.titel && JSON.stringify(r.newData.kontakt) === JSON.stringify(d.kontakt));
}
/* 68 */ {
  const d = BASE();
  const r = runCvEditContent({ ...K, field: "epost", value: "ny@example.se", expectedValue: "anna@example.se" }, d);
  const otherKontakt = r.success && r.newData.kontakt.telefon === d.kontakt.telefon && r.newData.kontakt.adress === d.kontakt.adress && r.newData.kontakt.linkedin === d.kontakt.linkedin;
  check("68 kontakt edit touches no other field/section", otherKontakt && r.newData.namn === d.namn && JSON.stringify(r.newData.erfarenhet) === JSON.stringify(d.erfarenhet));
}
/* 69 */ {
  const r = runCvEditContent({ section: "header", operation: "add_item", item: { namn: "X", titel: "Y" } }, BASE());
  check("69 add_item on header rejected", r.errorCode === "OPERATION_NOT_ALLOWED_FOR_SECTION");
}
/* 70 */ {
  const r = runCvEditContent({ section: "kontakt", operation: "add_item", item: { telefon: "070" } }, BASE());
  check("70 add_item on kontakt rejected", r.errorCode === "OPERATION_NOT_ALLOWED_FOR_SECTION");
}
/* 71 */ {
  const r = runCvEditContent({ section: "profil", operation: "add_item", item: { profil: "x" } }, BASE());
  check("71 add_item on profil rejected", r.errorCode === "OPERATION_NOT_ALLOWED_FOR_SECTION");
}
/* 72 */ {
  const r = runCvEditContent({ section: "header", operation: "remove_item", itemRef: "header_main" }, BASE());
  check("72 remove_item on header rejected", r.errorCode === "OPERATION_NOT_ALLOWED_FOR_SECTION");
}
/* 73 */ {
  const r = runCvEditContent({ section: "kontakt", operation: "remove_item", itemRef: "contact_main" }, BASE());
  check("73 remove_item on kontakt rejected", r.errorCode === "OPERATION_NOT_ALLOWED_FOR_SECTION");
}
/* 74 */ {
  const r = runCvEditContent({ section: "profil", operation: "remove_item", itemRef: "profile_main" }, BASE());
  check("74 remove_item on profil rejected", r.errorCode === "OPERATION_NOT_ALLOWED_FOR_SECTION");
}
/* 75 — الحقول التي يجوز تفريغها فعلاً */ {
  const d = BASE(); const ref = refOf(d, "erfarenhet", 0);
  const rb = runCvEditContent({ section: "erfarenhet", operation: "replace_field", itemRef: ref, field: "beskrivning", value: "", expectedValue: "Byggde gränssnitt." }, d);
  const ra = runCvEditContent({ ...K, field: "adress", value: "", expectedValue: "Stockholm" }, BASE());
  check("75 optional fields may be emptied", rb.success && rb.newData.erfarenhet[0].beskrivning === "" && ra.success && ra.newData.kontakt.adress === "");
}
/* 76 — لا تغيير للمدخل الأصلي في header/kontakt، نجاحاً أو فشلاً */ {
  const d = BASE(); const before = JSON.stringify(d);
  const ops = [
    runCvEditContent({ ...H, field: "namn", value: "Ny", expectedValue: "Anna Svensson" }, d),
    runCvEditContent({ ...K, field: "epost", value: "bad-email", expectedValue: "anna@example.se" }, d),
    runCvEditContent({ ...K, field: "telefon", value: "070", expectedValue: "fel" }, d)
  ];
  check("76 original cvData untouched in header/kontakt ops", ops[0].success && !ops[1].success && !ops[2].success && JSON.stringify(d) === before);
}
/* 77 — Stable IDs لأقسام العنصر الواحد لا تتغير */ {
  const d = BASE();
  const r = runCvEditContent({ ...H, field: "namn", value: "Helt Nytt Namn", expectedValue: "Anna Svensson" }, d);
  const idx = buildCVIndex(r.newData).sections;
  const ids = ["header_main", "contact_main", "profile_main"].every((id) => idx.some((s) => s.items.some((i) => i.id === id)));
  check("77 single-section stable IDs unchanged", r.success && r.itemRef === "header_main" && r.newItemRef === "header_main" && ids);
}

check("levels list matches cvModel guidance", SPRAK_LEVELS.length === 4);

export const CV_EDIT_CONTENT_TEST_RESULTS = results;
export const ALL_PASSED = results.every((r) => r.pass);