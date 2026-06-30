export function renderVerdict(verdict) {
  const verdictEl = document.getElementById("verdict");
  if (!verdictEl) return;

  const { level, headline, sub, count, eventCapacity, baselineTraffic, dataQuality } = verdict;
  const unknownCapacityCount = dataQuality?.unknownCapacityCount || 0;
  const providerIssues = dataQuality?.providerIssues || [];
  const eventLine = count > 0
    ? `${count} event${count !== 1 ? "s" : ""} - ${eventCapacity > 0 ? `~${eventCapacity.toLocaleString()} people counted` : "capacity unknown"}`
    : "";
  const baselineLine = baselineTraffic?.impact > 0
    ? `${baselineTraffic.label} - ${baselineTraffic.city} baseline traffic`
    : "";
  const capacityLine = unknownCapacityCount > 0
    ? `${unknownCapacityCount} event${unknownCapacityCount !== 1 ? "s" : ""} missing capacity - verdict may understate traffic`
    : "";
  const providerLines = providerIssues.map((provider) => {
    return provider.message || `${provider.source || "A data source"} could not be loaded.`;
  });

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
        ${eventLine ? `<p class="text-slate-600 text-xs mt-0.5">${escapeHtml(eventLine)}</p>` : ""}
        ${baselineLine ? `<p class="text-slate-600 text-xs mt-0.5">${escapeHtml(baselineLine)}</p>` : ""}
        ${capacityLine ? `<p class="text-amber-300/80 text-xs mt-0.5">${escapeHtml(capacityLine)}</p>` : ""}
        ${providerLines.map((line) => `
          <p class="text-amber-300/80 text-xs mt-0.5">${escapeHtml(line)}</p>
        `).join("")}
      </div>
    </div>`;
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
