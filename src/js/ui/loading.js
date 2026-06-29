export function showLoading() {
  const verdictEl = document.getElementById("verdict");
  const eventsSection = document.getElementById("events-section");
  const eventsContainer = document.getElementById("events");

  if (verdictEl) {
    verdictEl.innerHTML = `
      <div class="flex items-center gap-4 rounded-xl border border-[#1E2D45] bg-[#0A0F1C] px-5 py-4">
        <div class="flex flex-col gap-1.5 shrink-0">
          <div class="w-3 h-3 rounded-full bg-[#1E2D45] animate-pulse"></div>
          <div class="w-3 h-3 rounded-full bg-[#1E2D45] animate-pulse"></div>
          <div class="w-3 h-3 rounded-full bg-[#1E2D45] animate-pulse"></div>
        </div>
        <div class="space-y-2 flex-1">
          <div class="h-6 w-40 rounded-md bg-[#1E2D45] animate-pulse"></div>
          <div class="h-3 w-28 rounded-md bg-[#1E2D45] animate-pulse"></div>
        </div>
      </div>`;
  }

  if (eventsSection) {
    eventsSection.classList.remove("hidden");
    eventsSection.classList.remove("fade-in");
    void eventsSection.offsetWidth;
    eventsSection.classList.add("fade-in");
  }

  if (eventsContainer) {
    eventsContainer.innerHTML = `
      <div class="divide-y divide-[#1E2D45]">
        ${[0, 1, 2].map(() => `
          <div class="py-3">
            <div class="flex items-start justify-between mb-2">
              <div class="h-4 w-44 rounded-md bg-[#1E2D45] animate-pulse"></div>
              <div class="h-4 w-14 rounded-full bg-[#1E2D45] animate-pulse ml-2"></div>
            </div>
            <div class="flex gap-5 ml-5">
              <div class="h-3 w-20 rounded-md bg-[#1E2D45] animate-pulse"></div>
              <div class="h-3 w-14 rounded-md bg-[#1E2D45] animate-pulse"></div>
            </div>
          </div>`).join("")}
      </div>`;
  }
}
