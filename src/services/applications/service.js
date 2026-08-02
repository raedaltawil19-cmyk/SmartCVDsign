import { base44 } from "@/api/base44Client";
import { APPLICATIONS_INTERFACE, assertImplements } from "@/services/interfaces";

/**
 * ApplicationsService — local (no-credit) CRUD for the job-tracker.
 * All access is scoped to the current user via the JobApplication RLS
 * (created_by_id === user.id), so list only ever returns the user's own rows.
 */
export function createApplicationsService({ auth }) {
  const service = {
    name: "applications",

    list() {
      return base44.entities.JobApplication.list("-updated_date", 100);
    },

    create(payload) {
      return base44.entities.JobApplication.create({
        rubrik: payload.rubrik || "",
        arbetsgivare: payload.arbetsgivare || "",
        plats: payload.plats || "",
        url: payload.url || "",
        jobAdId: payload.jobAdId || "",
        status: payload.status || "saved",
        deadline: payload.deadline || "",
        anteckning: payload.anteckning || "",
      });
    },

    update(id, patch) {
      return base44.entities.JobApplication.update(id, patch);
    },

    remove(id) {
      return base44.entities.JobApplication.delete(id);
    },
  };

  assertImplements(service, APPLICATIONS_INTERFACE);
  return service;
}