/**
 * اختبارات معزولة لأداة cv_move_section — نقية بالكامل.
 * لا تعتمد على Smart CV Assistant ولا على أي واجهة أو وكيل.
 * استدعِ runCvMoveSectionTests() في أي بيئة (Console / صفحة تشخيص).
 */
import { runCvMoveSection } from "./cvMoveSectionTool";

const L = (main, sidebar = []) => ({ main: [...main], sidebar: [...sidebar] });
const TWO_COL = () => L(["profil", "erfarenhet", "utbildning"], ["fardigheter", "sprak"]);
const SINGLE = () => L(["profil", "erfarenhet", "utbildning", "fardigheter", "sprak"], []);
const CV = () => ({
  namn: "Anna Svensson",
  titel: "Utvecklare",
  kontakt: { telefon: "070", epost: "a@b.se", adress: "Stockholm", linkedin: "" },
  profil: "Kort text",
  erfarenhet: [{ roll: "Dev", foretag: "Acme", period: "2020 – Nu", beskrivning: "x" }],
  utbildning: [{ examen: "Kandidat", skola: "KTH", period: "2016 – 2019", beskrivning: "" }],
  fardigheter: [{ namn: "React", niva: 85 }],
  sprak: [{ sprak: "Svenska", niva: "Flytande" }]
});

const ALL = ["profil", "erfarenhet", "utbildning", "fardigheter", "sprak"];
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** مقارنة layout لا تتأثر بترتيب مفاتيح الكائن */
const eqLayout = (a, b) => eq(a?.main || [], b?.main || []) && eq(a?.sidebar || [], b?.sidebar || []);
const slotsOf = (l) => [...(l.main || []), ...(l.sidebar || [])];
const uniqueAll = (l) => {
  const arr = slotsOf(l);
  return arr.length === ALL.length && ALL.every((s) => arr.filter((x) => x === s).length === 1);
};

export function runCvMoveSectionTests() {
  const results = [];
  const add = (name, pass, note) => results.push({ name, pass, note: typeof note === "string" ? note : JSON.stringify(note) });

  // 1) Stockholm: utbildning → «right» = main
  {
    const before = TWO_COL();
    const r = runCvMoveSection({ templateId: "stockholm", section: "utbildning", targetSlot: "right" }, before);
    add("1. Stockholm: utbildning → right/main", r.success && r.toSlot === "main" && uniqueAll(r.newLayout), r.summary || r.message);
  }

  // 2) Stockholm: utbildning → «العمود الأيسر» = sidebar قبل sprak
  {
    const r = runCvMoveSection({ templateId: "stockholm", section: "utbildning", targetSlot: "العمود الأيسر", before: "sprak" }, TWO_COL());
    add(
      "2. Stockholm: utbildning → sidebar قبل sprak",
      r.success && eqLayout(r.newLayout, L(["profil", "erfarenhet"], ["fardigheter", "utbildning", "sprak"])),
      r.newLayout || r.message
    );
  }

  // 3) Tech Pro: utbildning → «right» = sidebar
  {
    const r = runCvMoveSection({ templateId: "techpro", section: "utbildning", targetSlot: "right" }, TWO_COL());
    add("3. Tech Pro: utbildning → right/sidebar", r.success && r.toSlot === "sidebar" && uniqueAll(r.newLayout), r.newLayout || r.message);
  }

  // 4) Creative Edge: utbildning → «höger» = sidebar
  {
    const r = runCvMoveSection({ templateId: "creative", section: "utbildning", targetSlot: "höger" }, TWO_COL());
    add("4. Creative: utbildning → höger/sidebar", r.success && r.toSlot === "sidebar" && uniqueAll(r.newLayout), r.newLayout || r.message);
  }

  // 5) Executive: نقل إلى sidebar → مرفوض
  {
    const r = runCvMoveSection({ templateId: "executive", section: "utbildning", targetSlot: "sidebar" }, SINGLE());
    add("5. Executive: نقل إلى sidebar مرفوض", r.success === false, `${r.errorCode}: ${r.message}`);
  }

  // 6) Nordic: نقل إلى عمود آخر → مرفوض
  {
    const r = runCvMoveSection({ templateId: "nordic", section: "utbildning", targetSlot: "العمود الأيمن" }, SINGLE());
    add("6. Nordic: نقل إلى عمود آخر مرفوض", r.success === false, `${r.errorCode}: ${r.message}`);
  }

  // 7) Stockholm: تفريغ sidebar → مرفوض
  {
    const r = runCvMoveSection({ templateId: "stockholm", section: "sprak", targetSlot: "main" }, L(["profil", "erfarenhet", "utbildning", "fardigheter"], ["sprak"]));
    add("7. Stockholm: تفريغ sidebar مرفوض", r.success === false && r.errorCode === "SOURCE_SLOT_MIN_ITEMS", `${r.errorCode}: ${r.message}`);
  }

  // 8) إعادة ترتيب: utbildning قبل erfarenhet داخل نفس السلوت
  {
    const r = runCvMoveSection({ templateId: "stockholm", section: "utbildning", before: "erfarenhet" }, TWO_COL());
    add("8. إعادة ترتيب: utbildning قبل erfarenhet", r.success && eq(r.newLayout.main, ["profil", "utbildning", "erfarenhet"]), r.newLayout || r.message);
  }

  // 9) إعادة ترتيب: erfarenhet بعد utbildning
  {
    const r = runCvMoveSection({ templateId: "stockholm", section: "erfarenhet", after: "utbildning" }, TWO_COL());
    add("9. إعادة ترتيب: erfarenhet بعد utbildning", r.success && eq(r.newLayout.main, ["profil", "utbildning", "erfarenhet"]), r.newLayout || r.message);
  }

  // 10) kontakt → مرفوض
  {
    const r = runCvMoveSection({ templateId: "stockholm", section: "kontakt", targetSlot: "main" }, TWO_COL());
    add("10. kontakt غير قابل للنقل", r.success === false && r.errorCode === "SECTION_FIXED", `${r.errorCode}: ${r.message}`);
  }

  // 11) header → مرفوض
  {
    const r = runCvMoveSection({ templateId: "stockholm", section: "header", targetSlot: "sidebar" }, TWO_COL());
    add("11. header غير قابل للنقل", r.success === false && r.errorCode === "SECTION_FIXED", `${r.errorCode}: ${r.message}`);
  }

  // 12) قسم غير معروف → مرفوض
  {
    const r = runCvMoveSection({ templateId: "stockholm", section: "hobbies", targetSlot: "sidebar" }, TWO_COL());
    add("12. قسم غير معروف مرفوض", r.success === false && r.errorCode === "SECTION_NOT_ALLOWED", `${r.errorCode}: ${r.message}`);
  }

  // 13) قالب غير معروف → مرفوض (بلا سلوك احتياطي)
  {
    const r = runCvMoveSection({ templateId: "malmo", section: "utbildning", targetSlot: "sidebar" }, TWO_COL());
    add("13. قالب غير معروف مرفوض", r.success === false && r.errorCode === "TEMPLATE_UNKNOWN", `${r.errorCode}: ${r.message}`);
  }

  // 14) سلوت غير موجود → مرفوض
  {
    const r = runCvMoveSection({ templateId: "stockholm", section: "utbildning", targetSlot: "footer" }, TWO_COL());
    add("14. سلوت غير موجود مرفوض", r.success === false, `${r.errorCode}: ${r.message}`);
  }

  // 15) مرجع ترتيب في سلوت خاطئ → مرفوض
  {
    const r = runCvMoveSection({ templateId: "stockholm", section: "utbildning", targetSlot: "main", before: "sprak" }, TWO_COL());
    add("15. مرجع ترتيب خارج السلوت مرفوض", r.success === false && r.errorCode === "ANCHOR_NOT_IN_SLOT", `${r.errorCode}: ${r.message}`);
  }

  // 16) بيانات السيرة بلا تغيير
  {
    const cv = CV();
    const snap = JSON.stringify(cv);
    const r = runCvMoveSection({ templateId: "stockholm", section: "utbildning", targetSlot: "sidebar" }, TWO_COL(), cv);
    add("16. بيانات السيرة بلا تغيير", r.success && JSON.stringify(cv) === snap, "identical");
  }

  // 17) الـlayout الأصلي غير مُعدَّل
  {
    const before = TWO_COL();
    const snap = JSON.stringify(before);
    const r = runCvMoveSection({ templateId: "stockholm", section: "utbildning", targetSlot: "sidebar" }, before);
    add("17. الـlayout الأصلي غير مُعدَّل", r.success && JSON.stringify(before) === snap, snap);
  }

  // 18) كل قسم قابل للنقل مرة واحدة فقط في كل نتيجة ناجحة
  {
    const ok = [
      runCvMoveSection({ templateId: "stockholm", section: "utbildning", targetSlot: "sidebar" }, TWO_COL()),
      runCvMoveSection({ templateId: "techpro", section: "profil", targetSlot: "sidebar" }, TWO_COL()),
      runCvMoveSection({ templateId: "executive", section: "sprak", before: "profil" }, SINGLE())
    ];
    add("18. كل قسم مرة واحدة فقط", ok.every((r) => r.success && uniqueAll(r.newLayout)), ok.map((r) => r.newLayout));
  }

  // 19) قوالب العمود الواحد تسمح بإعادة الترتيب داخل main
  {
    const a = runCvMoveSection({ templateId: "executive", section: "utbildning", before: "erfarenhet" }, SINGLE());
    const b = runCvMoveSection({ templateId: "nordic", section: "sprak", index: 0 }, SINGLE());
    add(
      "19. عمود واحد: إعادة الترتيب مسموحة",
      a.success && eq(a.newLayout.main, ["profil", "utbildning", "erfarenhet", "fardigheter", "sprak"]) &&
        b.success && b.newLayout.main[0] === "sprak",
      [a.newLayout?.main, b.newLayout?.main]
    );
  }

  // 20) يمين/يسار تُحلّ حسب القالب
  {
    const sR = runCvMoveSection({ templateId: "stockholm", section: "fardigheter", targetSlot: "يمين" }, TWO_COL());
    const sL = runCvMoveSection({ templateId: "stockholm", section: "utbildning", targetSlot: "يسار" }, TWO_COL());
    const tR = runCvMoveSection({ templateId: "techpro", section: "utbildning", targetSlot: "يمين" }, TWO_COL());
    const tL = runCvMoveSection({ templateId: "techpro", section: "fardigheter", targetSlot: "يسار" }, TWO_COL());
    const cR = runCvMoveSection({ templateId: "creative", section: "utbildning", targetSlot: "right" }, TWO_COL());
    const cL = runCvMoveSection({ templateId: "creative", section: "fardigheter", targetSlot: "vänster" }, TWO_COL());
    add(
      "20. حل يمين/يسار حسب القالب",
      sR.toSlot === "main" && sL.toSlot === "sidebar" &&
        tR.toSlot === "sidebar" && tL.toSlot === "main" &&
        cR.toSlot === "sidebar" && cL.toSlot === "main",
      [sR.toSlot, sL.toSlot, tR.toSlot, tL.toSlot, cR.toSlot, cL.toSlot]
    );
  }

  const passed = results.filter((r) => r.pass).length;
  return { passed, total: results.length, results };
}

export default runCvMoveSectionTests;