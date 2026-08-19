import { base44 } from "@/api/base44Client";

/**
 * ProfessionalProfileService — persistence boundary for ProfessionalProfile,
 * ProfessionalEvidence, and ProfessionalProfileRun entities.
 *
 * Pure persistence: no diff logic, no CV structure awareness, no repositioning.
 * Diff/extraction logic lives in profileIntegration.js.
 *
 * Accepts optional dependency injection ({ profile, evidence, runs }) for testing.
 * Defaults to the real Base44 entities when no deps are supplied.
 *
 * User isolation: Base44 platform-level isolation guarantees that every
 * entity read/write is scoped to the authenticated user. No userId field
 * is stored or queried — this matches all other entities in this project.
 */
export function createProfessionalProfileService(deps = {}) {
  const Profile  = deps.profile  ?? base44.entities.ProfessionalProfile;
  const Evidence = deps.evidence ?? base44.entities.ProfessionalEvidence;
  const Runs     = deps.runs     ?? base44.entities.ProfessionalProfileRun;

  return {
    name: "professionalProfile",

    /**
     * Get the authenticated user's ProfessionalProfile, or null if none exists yet.
     * There should be at most one profile per user.
     */
    async getCurrentProfile() {
      const rows = await Profile.list("-created_date", 1);
      return rows?.[0] ?? null;
    },

    /**
     * Create the user's ProfessionalProfile.
     * Called once when the first Master CV is processed.
     */
    createProfile() {
      return Profile.create({ isInitialized: false, totalEvidenceCount: 0 });
    },

    /**
     * Update profile fields (isInitialized, totalEvidenceCount).
     * @param {string} id - profile record id
     * @param {object} payload
     */
    updateProfile(id, payload) {
      return Profile.update(id, payload);
    },

    /**
     * Get evidence records for a profile (all, not filtered by status here —
     * callers filter by status for their use case).
     * @param {string} profileId
     * @param {number} [limit=1000]
     */
    getEvidence(profileId, limit = 1000) {
      return Evidence.filter({ profileId }, "-created_date", limit);
    },

    /**
     * Add a single ProfessionalEvidence item.
     * Deduplicates by observationId — same observation from the same CV is
     * stored only once (first-write-wins, preserving source traceability).
     *
     * @param {string} profileId
     * @param {object} item - enriched evidence item with factId and observationId
     * @returns {Promise<{created: boolean, record: object|null}>}
     */
    async addEvidence(profileId, item) {
      if (!item?.observationId) return { created: false, record: null };

      const existing = await Evidence.filter(
        { profileId, observationId: item.observationId },
        "-created_date",
        1,
      );
      if (existing?.length > 0) return { created: false, record: existing[0] };

      const record = await Evidence.create({
        profileId,
        factId:             item.factId,
        observationId:      item.observationId,
        changeType:         item.changeType,
        category:           item.category,
        field:              item.field,
        itemKey:            item.itemKey ?? "",
        value:              item.value ?? null,
        previousValue:      item.previousValue ?? null,
        sourceCvId:         item.sourceCvId,
        sourceType:         item.sourceType,
        sourceMasterCvId:   item.sourceMasterCvId ?? null,
        contentFingerprint: item.contentFingerprint,
        // REMOVAL evidence is stored as inactive (historical fact, not current state).
        // FACT_ADDITION and CONTENT_REWRITE are stored as active.
        status: item.changeType === "REMOVAL" ? "inactive" : "active",
      });
      return { created: true, record };
    },

    /**
     * Get the most recent ProfessionalProfileRun for a given CV fingerprint.
     * Returns null if no run exists. Used for idempotency checks.
     * @param {string} profileId
     * @param {string} cvFingerprint
     */
    async getRunByFingerprint(profileId, cvFingerprint) {
      const rows = await Runs.filter(
        { profileId, cvFingerprint },
        "-created_date",
        5,
      );
      return rows?.[0] ?? null;
    },

    /**
     * Create a ProfessionalProfileRun record.
     * @param {object} payload - { profileId, cvId, cvFingerprint, sourceType, status, evidenceCount, error? }
     */
    createRun(payload) {
      return Runs.create(payload);
    },

    /**
     * Update a ProfessionalProfileRun record (e.g. status → "ready" or "failed").
     * @param {string} id
     * @param {object} payload
     */
    updateRun(id, payload) {
      return Runs.update(id, payload);
    },
  };
}
