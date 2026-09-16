/**
 * Skeleton component — placeholder loading states
 */

export function renderSkeleton(type = "text", width = "100%", height = "16px") {
  const variants = {
    text: `<div class="skeleton" style="width:${width};height:${height};border-radius:4px;"></div>`,
    image: `<div class="skeleton" style="width:${width};height:${height};border-radius:12px;"></div>`,
    circle: `<div class="skeleton" style="width:${width};height:${height};border-radius:999px;"></div>`,
    button: `<div class="skeleton" style="width:${width};height:${height};border-radius:14px;"></div>`,
  };

  return variants[type] || variants.text;
}
