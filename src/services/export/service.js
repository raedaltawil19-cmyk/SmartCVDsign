import { exportCVPNG } from "@/lib/exportImage";
import { EXPORT_INTERFACE, assertImplements } from "@/services/interfaces";

/**
 * ExportService — produces output artifacts (PDF via print, PNG image).
 * Isolates rendering/export side-effects so the UI only says "export".
 */
export function createExportService() {
  const service = {
    name: "export",
    print: () => window.print(),
    exportPNG: (filename = "cv.png") => exportCVPNG(filename),
  };

  assertImplements(service, EXPORT_INTERFACE);
  return service;
}