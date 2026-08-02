import { useContext } from "react";
import { ServicesContext } from "@/providers/ServicesProvider";

/**
 * useServices — returns the full DI bundle.
 * useService(name) — returns a single service by its port name.
 */
export function useServices() {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error("useServices must be used inside <ServicesProvider>");
  }
  return services;
}

export function useService(name) {
  return useServices()[name];
}