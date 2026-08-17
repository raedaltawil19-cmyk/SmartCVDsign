import { exportCVPNG } from "@/lib/exportImage";
import { EXPORT_INTERFACE, assertImplements } from "@/services/interfaces";

/**
 * ExportService — produces output artifacts (PDF via an isolated print document, PNG image).
 * The isolated print document prevents browser/Base44 page branding or the app URL
 * from becoming part of the printable CV footer/header.
 */
export function createExportService() {
  const service = {
    name: "export",
    print: () => {
      const source = document.querySelector(".cv-print-area");
      if (!source) {
        window.print();
        return;
      }

      // Open synchronously from the user's click so Safari does not block printing.
      const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=1200");
      if (!printWindow) {
        window.print();
        return;
      }

      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((node) => node.outerHTML)
        .join("\n");

      printWindow.document.open();
      printWindow.document.write(`<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CV</title>
${styles}
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body { width: 210mm; }
  .cv-print-area { width: 210mm !important; box-shadow: none !important; margin: 0 !important; }
  .no-print { display: none !important; }
  a[href*="base44"], a[href*="pass44"] { display: none !important; }
</style>
</head>
<body></body>
</html>`);
      printWindow.document.close();

      const clone = source.cloneNode(true);
      clone.classList.add("cv-print-area");
      printWindow.document.body.replaceChildren(clone);

      const print = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.addEventListener("afterprint", () => printWindow.close(), { once: true });
      };

      if (printWindow.document.fonts?.ready) {
        printWindow.document.fonts.ready.then(() => setTimeout(print, 50));
      } else {
        setTimeout(print, 100);
      }
    },
    exportPNG: (filename = "cv.png") => exportCVPNG(filename),
  };

  assertImplements(service, EXPORT_INTERFACE);
  return service;
}
