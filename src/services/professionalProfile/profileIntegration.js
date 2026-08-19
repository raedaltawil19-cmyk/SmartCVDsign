/**
 * profileIntegration — orchestration layer that bridges:
 *   cvDiff (pure diff)  +  professionalEvidence (pure extraction)  →  ProfessionalProfileService (persistence)
 *
 * Two public entry points:
 *
 *   processProfileFromVersions(masterVersions, svcDeps?)
 *     Called fire-and-forget after a repositioning analysis completes successfully.
 *     Processes each master CV version against the previous one (oldest→newest),
 *     skipping versions whose fingerprint already has a "ready" run.
 *
 *   processTailoredCvForProfile(tailoredRecord, cvGetFn, svcDeps?)
 *     Called fire-and-forget after a tailored CV is saved.
 *     Extracts only genuine new professional facts (not in the source master).
 *
 * Both functions:
 *   - Are safe to call repeatedly (idempotent via ProfessionalProfileRun fingerprints).
 *   - Never throw to the caller — internal errors are recorded in the run record.
 *   - Never modify CV records, repositioning state, or agent contracts.
 *   - Accept optional svcDeps for deterministic testing without Base44.
 *
 * AI career conclusions belong to RepositioningAnalysis, NOT here.
 */

import { cvContentFingerprint, diffCvData, diffMasterToMaster, diffTailoredToSourceMaster } from "@/lib/repositioning/cvDiff";
import { extractEvidence } from "@/lib/repositioning/professionalEvidence";
import { isTailored } from "@/lib/cvProfiles";
import { createProfessionalProfileService } from "./service";

// ─── Two-level identity ───────────────────────────────────────────────────────
//
// factId        = hash(category | field | itemKey | stableStringify(value))
//                 Content-addressable: same professional fact in any CV = same factId.
//                 Enables Phase 3B to group observations across many versions.
//
// observationId = factId | sourceCvId | changeType
//                 Source-specific: same fact from same CV = same observationId.
//                 Used for deduplication before insert.

function computeFactId(item) {
  const valueStr = _stableStringify(item.value);
  const key = item.key ?? "";
  return `${item.category}|${item.field}|${key}|${_hash(valueStr)}`;
}

function enrichItem(item) {
  const factId = computeFactId(item);
  const observationId = `${factId}|${item.sourceCvId}|${item.changeType}`;
  return {
    ...item,
    factId,
    observationId,
    itemKey: item.key ?? "",
  };
}

// ─── Master CV processing ─────────────────────────────────────────────────────

/**
 * Process a window of master CV versions for the professional profile.
 *
 * @param {object[]} masterVersions
 *   Sorted newest-first (as returned by useCareerRepositioning / latestMasterVersions).
 *   Must all be Master CVs — callers must filter before passing.
 * @param {object|null} [svcDeps]
 *   Optional entity mocks for testing: { profile, evidence, runs }.
 */
export async function processProfileFromVersions(masterVersions, svcDeps = null) {
  // Reverse to oldest-first so each version diffs against its predecessor.
  const versions = Array.isArray(masterVersions) ? [...masterVersions].reverse() : [];
  if (!versions.length) return;

  const svc = createProfessionalProfileService(svcDeps);

  // Get or create the profile record.
  let profile = await svc.getCurrentProfile();
  if (!profile) {
    profile = await svc.createProfile();
  }

  let newEvidenceCount = 0;

  for (let i = 0; i < versions.length; i++) {
    const curr = versions[i];
    if (!curr?.id || !curr?.data) continue;

    const fingerprint = cvContentFingerprint(curr.data);

    // Idempotency — skip if already processed or currently running.
    const existingRun = await svc.getRunByFingerprint(profile.id, fingerprint);
    if (existingRun?.status === "ready" || existingRun?.status === "running") continue;

    let run = null;
    try {
      run = await svc.createRun({
        profileId:     profile.id,
        cvId:          curr.id,
        cvFingerprint: fingerprint,
        sourceType:    "master",
        status:        "running",
        evidenceCount: 0,
      });

      // Compute diff against the previous version.
      // For the very first version (i === 0), diff against null so every fact
      // in the initial CV is recorded as FACT_ADDITION.
      const prev = i > 0 ? versions[i - 1] : null;
      const diffResult = prev
        ? diffMasterToMaster(prev, curr)
        : diffCvData(null, curr.data);

      const rawItems = extractEvidence(diffResult, {
        cvId:            curr.id,
        sourceType:      "master",
        sourceMasterCvId: null,
        data:            curr.data,
      });

      let runEvidenceCount = 0;
      for (const rawItem of rawItems) {
        const enriched = enrichItem(rawItem);
        const result = await svc.addEvidence(profile.id, enriched);
        if (result.created) {
          runEvidenceCount++;
          newEvidenceCount++;
        }
      }

      await svc.updateRun(run.id, { status: "ready", evidenceCount: runEvidenceCount });
    } catch (err) {
      if (run) {
        await svc.updateRun(run.id, {
          status: "failed",
          error:  String(err?.message || err),
        }).catch(() => {});
      }
    }
  }

  // Mark profile as initialized and update the denormalized count.
  if (newEvidenceCount > 0 || !profile.isInitialized) {
    await svc.updateProfile(profile.id, {
      isInitialized:      true,
      totalEvidenceCount: (profile.totalEvidenceCount || 0) + newEvidenceCount,
    });
  }
}

// ─── Tailored CV processing ───────────────────────────────────────────────────

/**
 * Process a tailored CV for professional evidence.
 *
 * Only persists evidence for genuine new facts that are NOT present in the
 * source master (as determined by diffTailoredToSourceMaster). Pure rewording
 * that cvDiff classifies as CONTENT_REWRITE on the same item key is still
 * persisted (changeType is preserved) but is NOT promoted to FACT_ADDITION.
 *
 * @param {object}   tailoredRecord  - the saved tailored CV record (must have .id, .data, .cvType)
 * @param {Function} cvGetFn         - async (id) => record — used to resolve the source master
 * @param {object|null} [svcDeps]    - optional entity mocks for testing
 */
export async function processTailoredCvForProfile(tailoredRecord, cvGetFn, svcDeps = null) {
  if (!tailoredRecord?.id || !tailoredRecord?.data) return;
  if (!isTailored(tailoredRecord)) return;

  const sourceMasterCvId = tailoredRecord.sourceMasterCvId || tailoredRecord.parentCvId;
  if (!sourceMasterCvId) return; // no lineage → cannot safely compute diff

  const svc = createProfessionalProfileService(svcDeps);

  // There must be an existing profile to add evidence to.
  // Tailored CVs never create a profile on their own.
  const profile = await svc.getCurrentProfile();
  if (!profile) return;

  const fingerprint = cvContentFingerprint(tailoredRecord.data);

  // Idempotency
  const existingRun = await svc.getRunByFingerprint(profile.id, fingerprint);
  if (existingRun?.status === "ready" || existingRun?.status === "running") return;

  let run = null;
  try {
    run = await svc.createRun({
      profileId:     profile.id,
      cvId:          tailoredRecord.id,
      cvFingerprint: fingerprint,
      sourceType:    "tailored",
      status:        "running",
      evidenceCount: 0,
    });

    // Resolve source master (best-effort; diff handles null gracefully).
    let sourceMasterRecord = null;
    try {
      sourceMasterRecord = await cvGetFn(sourceMasterCvId);
    } catch {}

    const diffResult = diffTailoredToSourceMaster(tailoredRecord, sourceMasterRecord);

    // No professional change (or unresolvable lineage) → mark skipped/ready with 0 evidence.
    if (diffResult.status !== "resolved" || !diffResult.hasProfessionalChange) {
      await svc.updateRun(run.id, {
        status:        diffResult.status === "unresolved" ? "skipped" : "ready",
        evidenceCount: 0,
      });
      return;
    }

    const rawItems = extractEvidence(diffResult, {
      cvId:            tailoredRecord.id,
      sourceType:      "tailored",
      sourceMasterCvId,
      data:            tailoredRecord.data,
    });

    let evidenceCount = 0;
    for (const rawItem of rawItems) {
      const enriched = enrichItem(rawItem);
      const result = await svc.addEvidence(profile.id, enriched);
      if (result.created) evidenceCount++;
    }

    await svc.updateRun(run.id, { status: "ready", evidenceCount });

    if (evidenceCount > 0) {
      await svc.updateProfile(profile.id, {
        totalEvidenceCount: (profile.totalEvidenceCount || 0) + evidenceCount,
      });
    }
  } catch (err) {
    if (run) {
      await svc.updateRun(run.id, {
        status: "failed",
        error:  String(err?.message || err),
      }).catch(() => {});
    }
  }
}

// ─── Private hash helpers (same algorithm as cvDiff / professionalEvidence) ──

function _stableStringify(value) {
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) return `[${value.map(_stableStringify).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${_stableStringify(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function _hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
