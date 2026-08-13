/**
 * CV Understanding Engine — بانِي السياق.
 * يرسل للوكيل الحد الأدنى الضروري فقط: بنية السيرة، النصوص ذات الصلة،
 * آخر رسائل المحادثة، والعنصر الذي كان المستخدم يتحدث عنه.
 * لا يُرسل HTML ولا CSS ولا معلومات عن القالب.
 */
import { buildCVIndex, summarizeIndex, getByRef } from "./cvIndex";
import { searchCV } from "./cvSearch";

const extractKeywords = (text) =>
  String(text || "")
    .split(/[\s,.;:!؟?"'()\[\]{}«»–—/\\|]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !/^\d+$/.test(w))
    .slice(0, 12);

/**
 * @param {object} p
 * @param {object} p.data       بيانات السيرة (cvModel)
 * @param {string} p.message    رسالة المستخدم الحالية
 * @param {Array}  p.history    [{ role, content }] — سجل المحادثة
 * @param {string} p.lastItemRef معرّف العنصر الذي كان الحديث عنه
 * @param {number} p.historyLimit
 */
export function buildAgentContext({ data, message, history = [], lastItemRef = null, historyLimit = 6 } = {}) {
  const index = buildCVIndex(data);
  const structure = summarizeIndex(index);

  const keywords = extractKeywords(message);
  const seen = new Set();
  const relevant = [];
  for (const kw of keywords) {
    for (const hit of searchCV(index, kw).slice(0, 3)) {
      if (seen.has(hit.ref)) continue;
      seen.add(hit.ref);
      relevant.push({
        ref: hit.ref,
        itemRef: hit.itemRef,
        section: hit.section,
        field: hit.field,
        role: hit.role,
        itemLabel: hit.itemLabel,
        text: hit.snippet
      });
    }
  }

  const lastTargetInfo = (() => {
    if (!lastItemRef) return null;
    const found = getByRef(index, lastItemRef);
    if (!found || !found.item) return null;
    return {
      ref: found.item.id,
      section: found.section.section,
      label: found.item.label,
      fields: found.item.fields.map((f) => ({ field: f.field, role: f.role, value: f.value }))
    };
  })();

  return {
    index,
    context: {
      structure,
      relevant: relevant.slice(0, 10),
      lastTarget: lastTargetInfo,
      conversation: history.slice(-historyLimit).map((m) => ({ role: m.role, content: String(m.content || "").slice(0, 400) }))
    }
  };
}