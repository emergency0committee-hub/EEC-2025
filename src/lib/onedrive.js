// src/lib/onedrive.js
// Very lightweight helpers to turn common OneDrive share links into embeddable URLs
// Works for typical links like:
//  - https://1drv.ms/u/s!ABC123?e=xyz
//  - https://onedrive.live.com/?cid=...&id=...&authkey=...
//  - Full iframe src from OneDrive "Embed"

export function toOneDriveEmbedUrl(input) {
  if (!input) return "";
  try {
    const url = String(input).trim();
    // OneDrive for Business / SharePoint links (my.sharepoint.com)
    if (/\.sharepoint\.com\//i.test(url)) {
      // Try to force web view; many SharePoint links render if web=1 is set
      // Note: Depending on tenant settings, embedding may still be blocked by X-Frame-Options.
      return url.includes('?') ? `${url}&web=1` : `${url}?web=1`;
    }
    // If already an embed iframe src
    if (/onedrive\.live\.com\/embed/i.test(url)) return url;

    // If it's a redir link, swap redir -> embed
    // e.g. https://onedrive.live.com/redir?resid=... => /embed?resid=...
    if (/onedrive\.live\.com\/redir/i.test(url)) {
      return url.replace(/\/redir/i, "/embed");
    }

    // If it's a base onedrive.live.com link with query, try to force embed path
    if (/onedrive\.live\.com\//i.test(url)) {
      if (url.includes("?")) {
        return url.replace(/onedrive\.live\.com\/[^?]+/i, "onedrive.live.com/embed");
      }
      return url.replace(/onedrive\.live\.com\//i, "onedrive.live.com/embed?");
    }

    // 1drv.ms short links often accept ?embed=1
    if (/^https:\/\/1drv\.ms\//i.test(url)) {
      return url.includes("?") ? `${url}&embed=1` : `${url}?embed=1`;
    }

    // Otherwise, just append ?embed=1 as a best-effort
    return url.includes("?") ? `${url}&embed=1` : `${url}?embed=1`;
  } catch {
    return "";
  }
}
