/**
 * اختبارات مركّزة على سباق البث (streaming) في تنفيذ إجراءات Smart CV Assistant.
 * تحاكي نفس بوابة الحماية المستخدمة في SmartCVAssistantPanel:
 *   - doneRef: يوسم الرسالة فقط بعد ظهور إجراء ومعالجته → لا تنفيذ مزدوج.
 *   - seenContentRef: يمنع إعادة الفحص إلا عند تغيّر نص الرسالة → لا معالجة لا نهائية للنص العادي.
 * لا تلمس هذه الاختبارات cv_move_section ولا layoutOps.
 */
import { executeAssistantAction } from "@/lib/agent/smartAssistantAction";

/** محرّك بوابة مطابق لمنطق البانل */
function createProcessor({ onApply } = {}) {
  const done = new Set();
  const seen = new Map();
  const calls = [];
  return {
    done,
    seen,
    calls,
    /** يحاكي وصول تحديث بثّ لرسالة وكيل واحدة */
    update({ key, content, templateId, layout, data }) {
      if (done.has(key)) return { skipped: "already-done" };
      if (seen.get(key) === content) return { skipped: "unchanged" };
      seen.set(key, content);
      calls.push({ key, content });
      const res = executeAssistantAction({ content, templateId, layout, data });
      if (res.status === "none") return { status: "none", markedDone: false };
      done.add(key);
      if (res.status === "applied" && onApply) onApply(res.newLayout);
      return { ...res, markedDone: true };
    }
  };
}

const TPL = "stockholm";
const LAYOUT = { main: ["profil", "erfarenhet", "utbildning"], sidebar: ["fardigheter", "sprak"] };
const CV = { namn: "Anna", erfarenhet: [], utbildning: [], fardigheter: [], sprak: [] };
const ACTION = (args) => `<<<CV_ACTION ${JSON.stringify({ action: "cv_move_section", arguments: args })} CV_ACTION>>>`;
const MOVE_LEFT = ACTION({ templateId: TPL, section: "utbildning", targetSlot: "العمود الأيسر" });

const results = [];
const check = (name, cond, extra) => results.push({ name, pass: !!cond, ...(extra ? { extra } : {}) });

/* 1 + 2: جزء مبثوث بلا إجراء لا يُوسم، والتحديث التالي الحامل للإجراء يُنفَّذ */
{
  let applied = null;
  const p = createProcessor({ onApply: (l) => (applied = l) });
  const r1 = p.update({ key: "m1", content: "سأنقل قسم التعليم", templateId: TPL, layout: LAYOUT, data: CV });
  check("1) partial without action is not marked done", r1.status === "none" && r1.markedDone === false && !p.done.has("m1"));

  const r2 = p.update({ key: "m1", content: `سأنقل قسم التعليم.\n\n${MOVE_LEFT}`, templateId: TPL, layout: LAYOUT, data: CV });
  check("2) completed update with CV_ACTION executes", r2.status === "applied" && !!applied, r2.message);
  check("2b) newLayout moves utbildning to sidebar",
    applied && applied.main.join() === "profil,erfarenhet" && applied.sidebar.includes("utbildning"), applied);

  /* 3: نفس الإجراء يعود في تحديث لاحق → لا تنفيذ ثانٍ */
  const before = p.calls.length;
  const r3 = p.update({ key: "m1", content: `سأنقل قسم التعليم.\n\n${MOVE_LEFT}\n`, templateId: TPL, layout: LAYOUT, data: CV });
  check("3) repeated action does not execute twice", r3.skipped === "already-done" && p.calls.length === before);
}

/* 4: رسالة نصية فقط — تُفحص مرة لكل نص، ولا تُعاد معالجتها إلى ما لا نهاية */
{
  const p = createProcessor();
  const txt = "لا أستطيع تعديل محتوى السيرة.";
  const a = p.update({ key: "m2", content: txt, templateId: TPL, layout: LAYOUT, data: CV });
  const b = p.update({ key: "m2", content: txt, templateId: TPL, layout: LAYOUT, data: CV });
  const c = p.update({ key: "m2", content: txt, templateId: TPL, layout: LAYOUT, data: CV });
  check("4) text-only message processed once per content, no loop",
    a.status === "none" && b.skipped === "unchanged" && c.skipped === "unchanged" && p.calls.length === 1);
}

/* 5: إجراء فاشل — يُستدعى مرة واحدة، يُعرض الفشل، ولا يُعاد تلقائياً */
{
  const p = createProcessor();
  const bad = ACTION({ templateId: TPL, section: "utbildning", before: "sprak" }); // sprak في عمود آخر
  const r = p.update({ key: "m3", content: `تم.\n\n${bad}`, templateId: TPL, layout: LAYOUT, data: CV });
  const again = p.update({ key: "m3", content: `تم.\n\n${bad}\n`, templateId: TPL, layout: LAYOUT, data: CV });
  check("5) failed action: called once, failure surfaced, no auto-retry",
    r.status === "failed" && !!r.message && again.skipped === "already-done" && p.calls.length === 1, r.message);
}

/* 6: قالب غير مطابق للقالب النشط → مرفوض شكلياً بلا استدعاء الأداة */
{
  const p = createProcessor();
  const r = p.update({ key: "m4", content: ACTION({ templateId: "techpro", section: "utbildning", targetSlot: "sidebar" }), templateId: TPL, layout: LAYOUT, data: CV });
  check("6) template mismatch rejected as invalid", r.status === "invalid", r.message);
}

/* 7: أمر سياقي متسلسل (نقل ثم إعادة ترتيب) يعمل على layout المحدَّث */
{
  let layout = LAYOUT;
  const p = createProcessor({ onApply: (l) => (layout = l) });
  p.update({ key: "c1", content: MOVE_LEFT, templateId: TPL, layout, data: CV });
  const r = p.update({ key: "c2", content: ACTION({ templateId: TPL, section: "utbildning", before: "fardigheter" }), templateId: TPL, layout, data: CV });
  check("7) contextual follow-up reorder works on updated layout",
    r.status === "applied" && layout.sidebar.indexOf("utbildning") < layout.sidebar.indexOf("fardigheter"), layout);
}

export const STREAMING_TEST_RESULTS = results;
export const ALL_PASSED = results.every((r) => r.pass);