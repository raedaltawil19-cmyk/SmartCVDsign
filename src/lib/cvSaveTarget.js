/**
 * cvSaveTarget — قرار الحفظ في Builder، منطق نقيّ (لا SDK ولا React).
 *
 * قاعدة واحدة لا ثالث لها:
 *   - يوجد currentCvId ⇒ update لهذا السجل وحده.
 *   - لا يوجد        ⇒ create لسجل جديد مستقل.
 * لا قراءة لقائمة السجلات، لا تبنٍّ لأحدثها، ولا حذف/تنظيف تلقائي لأي سجل آخر —
 * فتعدّد الـMasters والنسخ المخصّصة (tailored) مصون.
 */
export function resolveSaveTarget(currentCvId) {
  return typeof currentCvId === "string" && currentCvId
    ? { mode: "update", id: currentCvId, deletes: [] }
    : { mode: "create", id: null, deletes: [] };
}

export default resolveSaveTarget;