import React, { createContext, useMemo } from "react";
import { createLLMService } from "@/services/llm/service";
import { createCVRepository } from "@/services/cv/service";
import { createJobsService } from "@/services/jobs/service";
import { createAuthService } from "@/services/auth/service";
import { createExportService } from "@/services/export/service";
import { createApplicationsService } from "@/services/applications/service";
import {
  assertImplements,
  LLM_INTERFACE,
  CV_REPOSITORY_INTERFACE,
  JOBS_INTERFACE,
  AUTH_INTERFACE,
  EXPORT_INTERFACE,
  APPLICATIONS_INTERFACE,
} from "@/services/interfaces";

/**
 * ServicesProvider — the DI container.
 * Assembles concrete implementations once, validates each against its interface,
 * and injects the whole bundle through React Context. Any page/component
 * consumes services via useServices()/useService() and remains agnostic to
 * WHERE a service comes from — making future swaps and tests trivial.
 */
export const ServicesContext = createContext(null);

export function ServicesProvider({ children }) {
  const services = useMemo(() => {
    const llm = createLLMService();
    assertImplements(llm, LLM_INTERFACE);

    const cvRepository = createCVRepository();
    assertImplements(cvRepository, CV_REPOSITORY_INTERFACE);

    const auth = createAuthService();
    assertImplements(auth, AUTH_INTERFACE);

    const exporter = createExportService();
    assertImplements(exporter, EXPORT_INTERFACE);

    // Jobs depends on LLM — injected, not imported.
    const jobs = createJobsService({ llm });
    assertImplements(jobs, JOBS_INTERFACE);

    // Applications depends on auth for the login guard, not imported.
    const applications = createApplicationsService({ auth });
    assertImplements(applications, APPLICATIONS_INTERFACE);

    return { llm, cvRepository, jobs, auth, export: exporter, applications };
  }, []);

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}

export default ServicesProvider;