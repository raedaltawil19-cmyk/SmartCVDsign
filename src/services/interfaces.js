/**
 * Lightweight Dependency-Injection contracts.
 * Each "Interface" is a frozen spec describing the methods a service MUST expose.
 * Concrete implementations are validated against their spec at provider assembly,
 * so a consumer never gets a half-implemented service in production.
 */

export const PORT = {
  LLM: "llm",
  CV_REPOSITORY: "cvRepository",
  JOBS: "jobs",
  AUTH: "auth",
  EXPORT: "export",
  APPLICATIONS: "applications",
};

export function defineInterface(name, methods) {
  return { name, methods: Object.freeze([...methods]) };
}

export function assertImplements(impl, spec) {
  if (!impl || impl.name !== spec.name) {
    throw new Error(`Service name mismatch: expected "${spec.name}" got "${impl?.name}"`);
  }
  const missing = spec.methods.filter((m) => typeof impl[m] !== "function");
  if (missing.length) {
    throw new Error(`Service "${spec.name}" missing methods: ${missing.join(", ")}`);
  }
}

export const LLM_INTERFACE = defineInterface(PORT.LLM, [
  "completeJson",
  "processCV",
  "transformCV",
  "regenerateCV",
  "atsAnalyze",
  "optimizeAchievements",
  "generateGapExplanation",
  "generateInterviewPrep",
]);

export const CV_REPOSITORY_INTERFACE = defineInterface(PORT.CV_REPOSITORY, [
  "list",
  "get",
  "create",
  "update",
  "remove",
]);

export const JOBS_INTERFACE = defineInterface(PORT.JOBS, ["search", "rank"]);

export const AUTH_INTERFACE = defineInterface(PORT.AUTH, [
  "isAuthenticated",
  "redirectToLogin",
  "logout",
  "persistDraft",
  "restoreDraft",
  "clearDraft",
  "requireAuth",
]);

export const EXPORT_INTERFACE = defineInterface(PORT.EXPORT, ["print", "exportPNG"]);

export const APPLICATIONS_INTERFACE = defineInterface(PORT.APPLICATIONS, [
  "list",
  "create",
  "update",
  "remove",
]);