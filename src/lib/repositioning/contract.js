/**
 * عقد نتيجة Career Repositioning Agent — منطق نقيّ (بلا React وبلا شبكة).
 * fail-closed: أي كتلة ناقصة أو مخالفة للعقد تُهمل ولا تُعرض.
 */
const OPEN = "<<<REPOSITIONING_RESULT";
const CLOSE = "REPOSITIONING_RESULT>>>";

const STATUSES = ["ready", "no_results", "insufficient_data"];

/** بصمة نسخ السيرة المعتمدة — تتغيّر إذا تغيّر محتوى أي نسخة أو عددها */
export function repositioningFingerprint({ approvedCvId, versions }) {
  const list = Array.isArray(versions) ? versions : [];
  const parts = list
    .map((v) => `${v.id}:${(v.updated_date || "")}:${JSON.stringify(v.data || {}).length}`)
    .sort();
  return `${approvedCvId || "none"}|${list.length}|${hash(parts.join("~"))}`;
}

function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/** استخراج الكتلة من نص الرسالة. يعيد null إذا لم تكتمل. */
export function extractResultBlock(content) {
  const text = String(content || "");
  const start = text.indexOf(OPEN);
  if (start === -1) return null;
  const end = text.indexOf(CLOSE, start + OPEN.length);
  if (end === -1) return null;
  return text.slice(start + OPEN.length, end).trim();
}

/** يعيد { ready:true, result } أو { ready:false, error } */
export function parseRepositioningResult(content) {
  const raw = extractResultBlock(content);
  if (!raw) return { ready: false, error: "NOT_READY" };
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch {
    return { ready: false, error: "INVALID_JSON" };
  }
  if (!obj || typeof obj !== "object") return { ready: false, error: "INVALID_SHAPE" };
  if (!STATUSES.includes(obj.analysisStatus)) return { ready: false, error: "INVALID_STATUS" };

  const capabilities = safeList(obj.capabilities).filter(
    (c) => c && c.label && safeList(c.evidence).some((e) => e && e.cvId && e.quote)
  );
  const paths = safeList(obj.paths).filter(
    (p) => p && p.label && safeList(p.verifiedTitles).every((t) => t && t.title && t.verifiedBy && t.source)
  );
  const opportunities = safeList(obj.opportunities)
    .filter((o) => o && o.title && o.url && o.mandatoryGatePassed === true)
    .map((o) => ({ ...o, salary: o.salary && o.salary.source ? o.salary : null }));

  return {
    ready: true,
    result: {
      analysisStatus: obj.analysisStatus,
      recommendationStatus: obj.recommendationStatus === "useful" ? "useful" : "not_useful",
      professionalProfile: obj.professionalProfile && typeof obj.professionalProfile === "object" ? obj.professionalProfile : {},
      capabilities,
      paths,
      opportunities,
      searchScope: obj.searchScope && typeof obj.searchScope === "object" ? obj.searchScope : {}
    }
  };
}

/** نتيجة مفيدة فقط عندها يُشعَر المستخدم */
export function isUsefulResult(result) {
  if (!result) return false;
  if (result.analysisStatus !== "ready") return false;
  if (result.recommendationStatus !== "useful") return false;
  return result.paths.length > 0 || result.opportunities.length > 0;
}

function safeList(v) {
  return Array.isArray(v) ? v : [];
}