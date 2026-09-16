/**
 * Pagination component
 */

export function renderPagination({ currentPage = 1, totalPages = 1, baseUrl = "" }) {
  if (totalPages <= 1) return "";

  const pages = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  let html = `<div class="pagination shell">`;

  html += `<a href="${baseUrl}${baseUrl.includes("?") ? "&" : "?"}page=1" class="page-num ${currentPage === 1 ? "disabled" : ""}">«</a>`;

  if (start > 1) {
    pages.unshift("...");
  }

  pages.forEach((p) => {
    if (p === "...") {
      html += `<span class="page-num" style="cursor:default;border:none;background:transparent;">…</span>`;
    } else {
      html += `<a href="${baseUrl}${baseUrl.includes("?") ? "&" : "?"}page=${p}" class="page-num ${p === currentPage ? "active" : ""}">${p}</a>`;
    }
  });

  if (end < totalPages) {
    pages.push("...");
  }

  html += `<a href="${baseUrl}${baseUrl.includes("?") ? "&" : "?"}page=${totalPages}" class="page-num ${currentPage === totalPages ? "disabled" : ""}">»</a>`;
  html += `</div>`;

  return html;
}
