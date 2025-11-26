// src/lib/exportResults.jsx
// Shared helper to render a submission using the Results component into an A3 PDF.
import { createRoot } from "react-dom/client";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import Results from "../pages/Results.jsx";
import resultsPrintStyles from "../pages/results/printStyles.js";

export async function renderSubmissionToPdfA3(submission, { fromAdmin = false } = {}) {
  return new Promise((resolve, reject) => {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-20000px";
    container.style.top = "0";
    container.style.width = "1000px";
    container.style.padding = "24px";
    container.style.background = "#ffffff";
    container.style.zIndex = "-1";
    container.style.opacity = "1";
    document.body.appendChild(container);

    const style = document.createElement("style");
    style.textContent = `
      ${resultsPrintStyles}
      .no-print { display: none !important; visibility: hidden !important; }
      .card {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .section, .avoid-break, .print-stack {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    `;
    container.appendChild(style);

    const root = createRoot(container);
    root.render(<Results submission={submission} fromAdmin={fromAdmin} onNavigate={() => {}} />);

    const cleanup = () => {
      try { root.unmount(); } catch {}
      try { container.remove(); } catch {}
    };

    const makePdf = async () => {
      try {
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => setTimeout(r, 300));
        const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
        if (!canvas || !canvas.width || !canvas.height) throw new Error("Canvas render failed");

        const pdf = new jsPDF({ unit: "pt", format: "a3" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 20;
        const usableWidth = pageWidth - margin * 2;
        const usableHeight = pdf.internal.pageSize.getHeight() - margin * 2;
        const ratio = usableWidth / canvas.width;
        const pageCanvasHeight = Math.floor(usableHeight / ratio);

        let rendered = 0;
        let pageIndex = 0;
        while (rendered < canvas.height) {
          const sliceHeight = Math.min(pageCanvasHeight, canvas.height - rendered);
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;
          const ctx = pageCanvas.getContext("2d");
          ctx.drawImage(
            canvas,
            0,
            rendered,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
          );
          const imgData = pageCanvas.toDataURL("image/png");
          const imgHeightPt = (sliceHeight * usableWidth) / canvas.width;
          if (pageIndex > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", margin, margin, usableWidth, imgHeightPt, undefined, "FAST");
          rendered += sliceHeight;
          pageIndex += 1;
        }

        const buf = pdf.output("arraybuffer");
        resolve(new Uint8Array(buf));
      } catch (e) {
        reject(e);
      } finally {
        cleanup();
      }
    };

    makePdf();
    setTimeout(() => {
      cleanup();
      reject(new Error("PDF render timeout"));
    }, 30000);
  });
}

export default renderSubmissionToPdfA3;
