/**
 * سجل أدوات تعديل السيرة — المرحلة الأولى من الأدوات.
 * الـLLM يختار الأداة والوسائط فقط؛ الأداة وحدها تعدّل cvModel.
 * كل أداة نقية: تأخذ state ({data, layout}) وتعيد state جديدًا + وصف العملية.
 * كل الاستهداف بالمعرّفات الثابتة — لا اعتماد على ترتيب العناصر.
 */
import { locateItem, resolveField, isListSection, ToolError } from "./locate";
import { SECTION_META, ALL_SECTION_KEYS } from "@/lib/agent/cvIndex";
import { moveSectionTool } from "./moveSection";

const cloneData = (d) => JSON.parse(JSON.stringify(d));

const setItemField = (data, section, index, field, value) => {
  const next = cloneData(data);
  if (section === "profil") next.profil = value;
  else if (section === "header") next[field] = value;
  else if (section === "kontakt") next.kontakt = { ...next.kontakt, [field]: value };
  else next[section][index] = { ...next[section][index], [field]: value };
  return next;
};

const getItemField = (data, section, index, field) => {
  if (section === "profil") return data.profil || "";
  if (section === "header") return data[field] ?? "";
  if (section === "kontakt") return data.kontakt?.[field] ?? "";
  return data[section]?.[index]?.[field] ?? "";
};

export const TOOLS = {
  /** تعديل نص حقل بالكامل بقيمة جديدة يقدّمها المستخدم أو الوكيل بناءً على طلبه */
  edit_text: {
    description: "Skriv nytt värde i ett textfält på ett element (targetId + field + value).",
    args: ["targetId", "field", "value"],
    run(state, { targetId, field, value }) {
      if (typeof value !== "string") throw new ToolError("النص الجديد مفقود.", "missing_value");
      const loc = locateItem(state.data, targetId);
      const f = resolveField(loc.section, field);
      const before = getItemField(state.data, loc.section, loc.index, f);
      return {
        state: { ...state, data: setItemField(state.data, loc.section, loc.index, f, value) },
        operation: { targetId: loc.item.id, field: f, before, after: value },
        summary: `تم تحديث ${f} في «${loc.label || loc.sectionLabel}».`
      };
    }
  },

  /** حذف نص محدد من داخل حقل، دون حذف العنصر */
  delete_text: {
    description: "Ta bort en specifik textbit inuti ett fält, utan att radera elementet.",
    args: ["targetId", "field", "text"],
    run(state, { targetId, field, text }) {
      if (!text) throw new ToolError("لم يحدد المستخدم النص المطلوب حذفه.", "missing_text");
      const loc = locateItem(state.data, targetId);
      const f = resolveField(loc.section, field);
      const before = String(getItemField(state.data, loc.section, loc.index, f) || "");
      if (!before.includes(text)) throw new ToolError(`النص "${text}" غير موجود في هذا الحقل.`, "text_not_found");
      const after = before.split(text).join("").replace(/[ \t]{2,}/g, " ").replace(/\s+([,.،؛])/g, "$1").trim();
      return {
        state: { ...state, data: setItemField(state.data, loc.section, loc.index, f, after) },
        operation: { targetId: loc.item.id, field: f, before, after },
        summary: `تم حذف «${text}» من ${f}.`
      };
    }
  },

  /** حذف عنصر كامل من قسم قائمة */
  delete_item: {
    description: "Radera ett helt element (en erfarenhet, utbildning, färdighet eller språk) via targetId.",
    args: ["targetId"],
    run(state, { targetId }) {
      const loc = locateItem(state.data, targetId);
      if (!isListSection(loc.section)) throw new ToolError("قسم الملف الشخصي ليس قائمة عناصر.", "not_a_list");
      const next = cloneData(state.data);
      const before = next[loc.section];
      next[loc.section] = before.filter((_, i) => i !== loc.index);
      return {
        state: { ...state, data: next },
        operation: { targetId: loc.item.id, field: null, before, after: next[loc.section] },
        summary: `تم حذف «${loc.label || "العنصر"}» من ${loc.sectionLabel}.`
      };
    }
  },

  /** نقل عنصر داخل قسمه: قبل/بعد عنصر آخر، أو إلى الأول/الأخير */
  move_item: {
    description: "Flytta ett element inom sin sektion: beforeId, afterId eller position ('first' | 'last').",
    args: ["targetId", "beforeId", "afterId", "position"],
    run(state, { targetId, beforeId, afterId, position }) {
      const loc = locateItem(state.data, targetId);
      if (!isListSection(loc.section)) throw new ToolError("لا يمكن نقل الملف الشخصي.", "not_a_list");
      const next = cloneData(state.data);
      const before = next[loc.section];
      const arr = [...before];
      const [moved] = arr.splice(loc.index, 1);

      let to;
      if (beforeId || afterId) {
        const anchor = locateItem(state.data, beforeId || afterId);
        if (anchor.section !== loc.section) throw new ToolError("لا يمكن النقل بين قسمين مختلفين.", "cross_section");
        const anchorIdx = arr.findIndex((_, i) => i === (anchor.index > loc.index ? anchor.index - 1 : anchor.index));
        to = beforeId ? anchorIdx : anchorIdx + 1;
      } else if (position === "first") to = 0;
      else if (position === "last") to = arr.length;
      else throw new ToolError("لم يتضح المكان الجديد للعنصر.", "missing_position");

      arr.splice(Math.max(0, Math.min(arr.length, to)), 0, moved);
      next[loc.section] = arr;
      return {
        state: { ...state, data: next },
        operation: { targetId: loc.item.id, field: null, before, after: arr },
        summary: `تم نقل «${loc.label || "العنصر"}» داخل ${loc.sectionLabel}.`
      };
    }
  },

  /** حذف قسم كامل: تفريغ محتواه وإزالته من هيكل الأعمدة */
  delete_section: {
    description: "Radera en hel sektion: header | kontakt | profil | erfarenhet | utbildning | fardigheter | sprak.",
    args: ["section"],
    run(state, { section }) {
      if (!ALL_SECTION_KEYS.includes(section)) throw new ToolError(`القسم "${section}" غير معروف.`, "unknown_section");
      const next = cloneData(state.data);
      const readSection = (d) => {
        if (section === "profil") return d.profil;
        if (section === "kontakt") return d.kontakt;
        if (section === "header") return { namn: d.namn, titel: d.titel };
        return d[section];
      };
      const before = { data: readSection(next), layout: state.layout };
      if (section === "profil") next.profil = "";
      else if (section === "kontakt") next.kontakt = { telefon: "", epost: "", adress: "", linkedin: "" };
      else if (section === "header") { next.namn = ""; next.titel = ""; }
      else next[section] = [];
      const layout = state.layout
        ? { main: state.layout.main.filter((k) => k !== section), sidebar: state.layout.sidebar.filter((k) => k !== section) }
        : state.layout;
      return {
        state: { data: next, layout },
        operation: { targetId: section, field: null, before, after: { data: readSection(next), layout } },
        summary: `تم حذف قسم ${SECTION_META[section].labelAr}.`
      };
    }
  },

  /** نقل قسم كامل بين أعمدة القالب أو داخل عموده — يعدّل الـlayout فقط */
  move_section: moveSectionTool
};

export const TOOL_NAMES = Object.keys(TOOLS);