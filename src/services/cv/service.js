import { base44 } from "@/api/base44Client";
import { CV_REPOSITORY_INTERFACE, assertImplements } from "@/services/interfaces";

/**
 * CVRepository — persistence boundary for saved CVs (SavedCV entity).
 * Pages never touch the entity SDK directly; they go through this port,
 * so persistence (entity, localStorage, external) is swappable.
 */
export function createCVRepository() {
  const repo = base44.entities.SavedCV;

  const service = {
    name: "cvRepository",
    list: (sort) => repo.list(sort),
    get: (id) => repo.get(id),
    create: (payload) => repo.create(payload),
    update: (id, payload) => repo.update(id, payload),
    remove: (id) => repo.delete(id),
  };

  assertImplements(service, CV_REPOSITORY_INTERFACE);
  return service;
}