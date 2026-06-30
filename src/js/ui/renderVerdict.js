export function renderVerdict(verdict) {
  const verdictEl = document.getElementById("verdict");
  if (!verdictEl) return;

  const { level, headline, sub, count, eventCapacity, baselineTraffic, dataQuality } = verdict;
  const unknownCapacityCount = dataQuality?.unknownCapacityCount || 0;
  const ignoredUnknownCapacityCount = dataQuality?.ignoredUnknownCapacityCount || 0;
  const providerIssues = dataQuality?.providerIssues || [];
  const eventLine = count > 0
    ? buildEventLine(count, eventCapacity, unknownCapacityCount)
    : "";
  const baselineLine = baselineTraffic?.impact > 0
    ? `${baselineTraffic.label} - ${baselineTraffic.city} baseline traffic`
    : "";
  const capacityLine = unknownCapacityCount > 0
    ? `${unknownCapacityCount} traffic-relevant event${unknownCapacityCount !== 1 ? "s" : ""} missing capacity - verdict may understate traffic`
    : "";
  const ignoredCapacityLine = ignoredUnknownCapacityCount > 0
    ? `${ignoredUnknownCapacityCount} smaller event${ignoredUnknownCapacityCount !== 1 ? "s" : ""} with unknown capacity treated as low impact`
    : "";
  const providerLines = providerIssues.map((provider) => {
    return provider.message || `${provider.source || "A data source"} could not be loaded.`;
  });
  const explanationLines = [
    eventLine,
    baselineLine,
    capacityLine,
    ignoredCapacityLine,
    ...providerLines,
  ].filter(Boolean);

  if (explanationLines.length === 0) {
    explanationLines.push("No matching major events or rush-hour pressure found for this search.");
  }

  const dot = (hex, glowHex, active) => `
    <div class="relative w-3 h-3 shrink-0">
      ${active ? `<div class="absolute inset-0 rounded-full animate-ping opacity-40" style="background:${glowHex}"></div>` : ""}
      <div class="relative w-3 h-3 rounded-full transition-all duration-300"
        style="background:${hex};${active ? `box-shadow:0 0 10px 3px ${glowHex};` : "opacity:0.15;"}">
      </div>
    </div>`;

  verdictEl.innerHTML = `
    <div class="fade-in flex items-center gap-4 rounded-xl border border-[#1E2D45] bg-[#0A0F1C] px-5 py-4">
      <div class="flex flex-col gap-1.5 shrink-0">
        ${dot("#EF4444", "#EF4444", level === "red")}
        ${dot("#EAB308", "#EAB308", level === "amber")}
        ${dot("#22C55E", "#22C55E", level === "green")}
      </div>
      <div>
        <p class="font-display font-bold text-2xl text-white uppercase tracking-wide leading-none">${headline}</p>
        <p class="text-slate-400 text-xs mt-1">${escapeHtml(sub)}</p>
        <details class="why-verdict mt-3 rounded-lg border border-[#1E2D45] bg-[#0D1526]">
          <summary class="flex items-center justify-between px-3 py-2 cursor-pointer select-none">
            <span class="font-display text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Why this verdict</span>
            <svg class="why-verdict-chevron w-3 h-3 text-slate-500 shrink-0 transition-transform" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </summary>
          <div class="space-y-1 px-3 pb-2">
            ${explanationLines.map((line) => `
              <p class="text-slate-400 text-xs">${escapeHtml(line)}</p>
            `).join("")}
          </div>
        </details>
      </div>
    </div>`;
}

function buildEventLine(count, eventCapacity, unknownCapacityCount) {
  const label = `${count} event${count !== 1 ? "s" : ""}`;
  if (eventCapacity > 0) return `${label} - ~${eventCapacity.toLocaleString()} people counted`;
  if (unknownCapacityCount > 0) return `${label} - capacity unknown`;
  return `${label} - no major venue capacity counted`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}
