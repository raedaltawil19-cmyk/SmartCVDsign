/**
 * professionalEvidence — structured representation of professional evidence
 * extracted from CV diffs.
 *
 * Pure helper: no React, no Base44, no agents, no database writes, no side effects.
 *
 * Professional Evidence is traceable back to its source CV.
 * We must always be able to answer: "Where did this professional fact come from?"
 *
 * Deduplication is deterministic: evidence identity is derived from
 *   category + normalised field content + source lineage.
 *
 * This module does NOT:
 *   - trigger repositioning
 *   - call agents
 *   - persist anything
 *   - make semantic career decisions
 *   - invent new occupations or career paths
 */

import { cvContentFingerprint } from "./cvDiff";

/**
 * @typedef {"erfarenhet"|"utbildning"|"fardigheter"|"sprak"|"titel"|"profil"} EvidenceCategory
 * @typedef {"master"|"tailored"} SourceType
 * @typedef {"FACT_ADDITION"|"REMOVAL"|"CONTENT_REWRITE"} EvidenceChangeType
 */

/**
 * @typedef {Object} ProfessionalEvidenceItem
 * @property {string}             id                — deterministic identity key
 * @property {EvidenceChangeType} changeType
 * @property {EvidenceCategory}   category
 * @property {string}             field             — specific field
 * @property {*}                  value             — current value (null for REMOVAL)
 * @property {*}                  previousValue     — previous value (null for FACT_ADDITION)
 * @property {string}             sourceCvId        — the CV this evidence came from
 * @property {SourceType}         sourceType        — "master" or "tailored"
 * @property {string|null}        sourceMasterCvId  — for tailored, the source master; null otherwise
 * @property {string}             contentFingerprint — fingerprint of the source CV content at extraction time
 */

/**
 * Build a ProfessionalEvidenceItem from a FieldChange and source context.
 *
 * @param {import("./cvDiff").FieldChange} change
 * @param {{cvId: string, sourceType: SourceType, sourceMasterCvId?: string|null, data: object}} source
 * @returns {ProfessionalEvidenceItem}
 */
export function buildEvidenceItem(change, source) {
  const contentFingerprint = cvContentFingerprint(source.data);
  const id = evidenceId({
    category: change.category,
    field: change.field,
    key: change.key,
    value: change.current,
    sourceCvId: source.cvId,
    changeType: change.changeType,
  });
  return {
    id,
    changeType: change.changeType,
    category: change.category,
    field: change.field,
    value: change.current,
    previousValue: change.previous,
    sourceCvId: source.cvId,
    sourceType: source.sourceType,
    sourceMasterCvId: source.sourceMasterCvId || null,
    contentFingerprint,
  };
}

/**
 * Extract ProfessionalEvidenceItems from a CvDiffResult.
 * Only FACT_ADDITION, REMOVAL, and CONTENT_REWRITE changes are extracted —
 * FORMATTING_ONLY and UNCHANGED are silently omitted.
 *
 * @param {import("./cvDiff").CvDiffResult} diffResult
 * @param {{cvId: string, sourceType: SourceType, sourceMasterCvId?: string|null, data: object}} source
 * @returns {ProfessionalEvidenceItem[]}
 */
export function extractEvidence(diffResult, source) {
  if (!diffResult || diffResult.status !== "resolved" || !diffResult.hasProfessionalChange) {
    return [];
  }
  return diffResult.changes
    .filter((c) => c.changeType === "FACT_ADDITION" || c.changeType === "REMOVAL" || c.changeType === "CONTENT_REWRITE")
    .map((c) => buildEvidenceItem(c, source));
}

/**
 * Deduplicate a list of ProfessionalEvidenceItems.
 * Two items are considered duplicates if they share the same deterministic id.
 * First occurrence wins; subsequent duplicates are dropped.
 *
 * NOTE: This is a safe, deterministic deduplication. It does NOT attempt to
 * merge semantically equivalent evidence with different wording — that is the
 * responsibility of the future AI layer (Phase 3B).
 *
 * @param {ProfessionalEvidenceItem[]} items
 * @returns {ProfessionalEvidenceItem[]}
 */
export function deduplicateEvidence(items) {
  const seen = new Set();
  const result = [];
  for (const item of (Array.isArray(items) ? items : [])) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

/**
 * Merge new evidence items into an existing accumulated list.
 * Deduplicates by deterministic id. New items for an existing id are ignored
 * (first-write-wins), preserving source traceability of the original observation.
 *
 * @param {ProfessionalEvidenceItem[]} existing
 * @param {ProfessionalEvidenceItem[]} incoming
 * @returns {ProfessionalEvidenceItem[]}
 */
export function mergeEvidence(existing, incoming) {
  return deduplicateEvidence([...(existing || []), ...(incoming || [])]);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Deterministic evidence identity key.
 * Based on: category + field + item key + current value content + sourceCvId + changeType.
 * We include sourceCvId so that the same fact arriving from two different CV versions
 * is preserved as two separate traceable observations (before semantic deduplication
 * in Phase 3B).
 */
function evidenceId({ category, field, key, value, sourceCvId, changeType }) {
  const valueStr = stableStringify(value);
  return `${category}|${field}|${key || ""}|${changeType}|${sourceCvId}|${hash(valueStr)}`;
}

function stableStringify(value) {
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
