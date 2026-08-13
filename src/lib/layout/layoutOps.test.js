/**
 * اختبارات بسيطة لطبقة layoutOps — نقية بالكامل، بلا React ولا DOM.
 * استدعِ runLayoutTests() في أي بيئة (Console / صفحة تشخيص) للحصول على النتائج.
 */
import { moveSection, reorderSection, validateLayout, normalizeLayout, LayoutError } from "./layoutOps";
import { getTemplateSchema } from "@/lib/templateLayoutSchema";

const L = (main, sidebar = []) => ({ main: [...main], sidebar: [...sidebar] });
const STOCKHOLM = () => L(["profil", "erfarenhet", "utbildning"], ["fardigheter", "sprak"]);
const TECHPRO = () => L(["profil", "erfarenhet", "utbildning"], ["fardigheter", "sprak"]);
const SINGLE = () => L(["profil", "erfarenhet", "utbildning", "fardigheter", "sprak"], []);

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** مقارنة لا تتأثر بترتيب مفاتيح الكائن — الترتيب المهم هو ترتيب الأقسام داخل كل عمود */
const eqLayout = (a, b) => eq(a?.main || [], b?.main || []) && eq(a?.sidebar || [], b?.sidebar || []);

function expectThrows(fn) {
  try {
    fn();
    return { pass: false, note: "لم يُرفض كما هو متوقع" };
  } catch (e) {
    if (!(e instanceof LayoutError)) return { pass: false, note: `نوع خطأ غير متوقع: ${e.message}` };
    return { pass: true, note: `${e.code}: ${e.message}` };
  }
}

export function runLayoutTests() {
  const results = [];
  const add = (name, pass, note) => results.push({ name, pass, note });

  // 1) نقل utbildning إلى sidebar في Stockholm
  {
    const before = STOCKHOLM();
    const after = moveSection(before, "utbildning", "sidebar", { templateId: "stockholm", before: "sprak" });
    add(
      "1. Stockholm: utbildning → sidebar (فوق sprak)",
      eqLayout(after, L(["profil", "erfarenhet"], ["fardigheter", "utbildning", "sprak"])) && eq(before, STOCKHOLM()),
      JSON.stringify(after)
    );
  }

  // 2) نقل utbildning إلى "العمود الأيمن" في Tech Pro (= sidebar)
  {
    const after = moveSection(TECHPRO(), "utbildning", "العمود الأيمن", { templateId: "techpro" });
    add(
      "2. Tech Pro: utbildning → «العمود الأيمن» = sidebar",
      eqLayout(after, L(["profil", "erfarenhet"], ["fardigheter", "sprak", "utbildning"])),
      JSON.stringify(after)
    );
  }

  // 2b) نفس العبارة في Stockholm يجب أن تعني main (العمود الأيمن هناك)
  {
    const after = moveSection(STOCKHOLM(), "fardigheter", "العمود الأيمن", { templateId: "stockholm" });
    add(
      "2b. Stockholm: «العمود الأيمن» = main",
      eqLayout(after, L(["profil", "erfarenhet", "utbildning", "fardigheter"], ["sprak"])),
      JSON.stringify(after)
    );
  }

  // 3) نقل إلى sidebar في Executive → مرفوض
  {
    const r = expectThrows(() => moveSection(SINGLE(), "utbildning", "sidebar", { templateId: "executive" }));
    add("3. Executive: نقل إلى sidebar مرفوض", r.pass, r.note);
  }

  // 4) تفريغ sidebar في Stockholm → مرفوض
  {
    const one = L(["profil", "erfarenhet", "utbildning", "fardigheter"], ["sprak"]);
    const r = expectThrows(() => moveSection(one, "sprak", "main", { templateId: "stockholm" }));
    add("4. Stockholm: تفريغ sidebar مرفوض", r.pass, r.note);
  }

  // 4b) تفريغ sidebar في Tech Pro → مسموح
  {
    const one = L(["profil", "erfarenhet", "utbildning", "fardigheter"], ["sprak"]);
    const after = moveSection(one, "sprak", "main", { templateId: "techpro" });
    add("4b. Tech Pro: تفريغ sidebar مسموح", eq(after.sidebar, []), JSON.stringify(after));
  }

  // 5) تكرار قسم → مرفوض
  {
    const dup = L(["profil", "erfarenhet", "utbildning", "sprak"], ["fardigheter", "sprak"]);
    const v = validateLayout(dup, getTemplateSchema("stockholm"));
    const fixed = normalizeLayout(dup, getTemplateSchema("stockholm"));
    add(
      "5. تكرار قسم يُرفض في التحقق ويُصحَّح في التطبيع",
      !v.ok && fixed.main.filter((s) => s === "sprak").length + fixed.sidebar.filter((s) => s === "sprak").length === 1,
      `${v.errors[0]} → ${JSON.stringify(fixed)}`
    );
  }

  // 6) فقدان قسم → مرفوض في التحقق، ويُعاد في التطبيع
  {
    const missing = L(["profil", "erfarenhet"], ["fardigheter"]);
    const v = validateLayout(missing, getTemplateSchema("stockholm"));
    const fixed = normalizeLayout(missing, getTemplateSchema("stockholm"));
    const all = [...fixed.main, ...fixed.sidebar].sort().join(",");
    add(
      "6. فقدان قسم يُرفض ويُستعاد في التطبيع",
      !v.ok && all === "erfarenhet,fardigheter,profil,sprak,utbildning",
      `${v.errors[0]} → ${JSON.stringify(fixed)}`
    );
  }

  // 7) إعادة ترتيب داخل Executive → تنجح
  {
    const after = reorderSection(SINGLE(), "utbildning", { templateId: "executive", before: "erfarenhet" });
    add(
      "7. Executive: إعادة الترتيب داخل العمود تنجح",
      eq(after.main, ["profil", "utbildning", "erfarenhet", "fardigheter", "sprak"]),
      JSON.stringify(after.main)
    );
  }

  // 8) العملية لا تلمس بيانات السيرة ولا الـlayout الأصلي
  {
    const cv = { namn: "Anna", utbildning: [{ examen: "Kandidat" }], fardigheter: [{ namn: "React", niva: 80 }] };
    const snapshot = JSON.stringify(cv);
    const before = STOCKHOLM();
    moveSection(before, "utbildning", "sidebar", { templateId: "stockholm" });
    add(
      "8. بيانات السيرة والـlayout الأصلي بلا تغيير",
      JSON.stringify(cv) === snapshot && eq(before, STOCKHOLM()),
      "لا تغيير"
    );
  }

  const passed = results.filter((r) => r.pass).length;
  return { passed, total: results.length, results };
}