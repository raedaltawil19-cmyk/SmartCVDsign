import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * تصدير السيرة كـPDF مباشرة (بدون نافذة طباعة المتصفح)،
 * فلا يظهر أي رأس/تذييل يضيفه المتصفح مثل رابط الموقع أو التاريخ.
 */
export async function exportCVPDF(filename = "cv.pdf") {
  const el = document.querySelector(".cv-print-area") || document.querySelector(".cl-print-area");
  if (!el) return;
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  // ارتفاع صفحة A4 مقيساً ببكسلات الصورة (نفس نسبة العرض)
  const pageHpx = Math.floor((canvas.width * pageH) / pageW);
  const pages = Math.max(1, Math.ceil(canvas.height / pageHpx));

  for (let i = 0; i < pages; i++) {
    const sliceH = Math.min(pageHpx, canvas.height - i * pageHpx);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceH;
    const ctx = slice.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, i * pageHpx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
    if (i > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pageW, (sliceH * pageW) / canvas.width);
  }

  pdf.save(filename);
}