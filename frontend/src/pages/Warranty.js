/**
 * Warranty page
 */

import { warrantyInfo } from "../data/content.js";
import { escapeHtml } from "../utils.js";

export async function renderWarranty() {
  return `
    <section class="section">
      <div class="shell">
        <h1 class="section-title">Гарантия</h1>

        <div class="section-card">
          <div style="display:flex;gap:40px;flex-wrap:wrap;margin-bottom:28px;">
            <div class="badge badge--stock" style="font-size:18px;padding:10px 22px;">
              ${escapeHtml(warrantyInfo.short1)}
            </div>
            <div class="badge" style="font-size:18px;padding:10px 22px;background:#ffd6e8;color:#8a0038;border-color:#ff6b9d;">
              ${escapeHtml(warrantyInfo.short2)}
            </div>
          </div>

          <p style="font-size:18px;line-height:1.6;">${escapeHtml(warrantyInfo.full)}</p>
        </div>
      </div>
    </section>
  `;
}
