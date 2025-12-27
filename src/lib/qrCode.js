import QRCode from "qrcode";

export async function makeQrDataUrl(value, size = 200) {
  const text = String(value || "");
  if (!text) return "";
  return QRCode.toDataURL(text, { width: size, margin: 1 });
}
