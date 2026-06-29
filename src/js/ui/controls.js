import { formatLocalDateInputValue, parseTimeString } from "../utils/timeUtils.js";

export function setupControls(onSearch) {
  const dateInput = document.getElementById("dateInput");
  const timeInput = document.getElementById("timeInput");
  const today = formatLocalDateInputValue(new Date());
  dateInput.value = today;

  setupDateChips(dateInput, today);
  setupTimeChips(timeInput);

  document.getElementById("inputButton").addEventListener("click", onSearch);
}

export function getSearchInputs() {
  const city = document.getElementById("citySelect").value;
  const date = document.getElementById("dateInput").value;
  const timeInput = document.getElementById("timeInput");

  return {
    city,
    date,
    userTimeInMins: timeInput?.value ? parseTimeString(timeInput.value) : undefined,
  };
}

function setupDateChips(dateInput, today) {
  const chipDates = {
    today,
    tomorrow: offsetDate(1),
    sat: nextWeekday(6),
    sun: nextWeekday(0),
  };

  function syncDateChips() {
    const current = dateInput.value;
    document.querySelectorAll(".date-chip").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.value === current);
    });
  }

  document.querySelectorAll(".date-chip").forEach((btn) => {
    btn.dataset.value = chipDates[btn.dataset.key];
    btn.addEventListener("click", () => {
      dateInput.value = btn.dataset.value;
      syncDateChips();
    });
  });

  dateInput.addEventListener("change", syncDateChips);
  syncDateChips();
}

function setupTimeChips(timeInput) {
  function setActiveTimeChip(activeBtn) {
    document.querySelectorAll(".time-chip").forEach((btn) => btn.classList.remove("active"));
    if (activeBtn) activeBtn.classList.add("active");
  }

  function syncTimeChipsToValue() {
    const current = timeInput.value;
    const match = [...document.querySelectorAll(".time-chip")].find((btn) => {
      return btn.dataset.time !== "now" && btn.dataset.time === current;
    });
    setActiveTimeChip(match || null);
  }

  document.querySelectorAll(".time-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.time === "now") {
        const now = new Date();
        timeInput.value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      } else {
        timeInput.value = btn.dataset.time;
      }
      setActiveTimeChip(btn);
    });
  });

  timeInput.addEventListener("change", syncTimeChipsToValue);
  syncTimeChipsToValue();
}

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatLocalDateInputValue(d);
}

function nextWeekday(targetDay) {
  const now = new Date();
  const diff = (targetDay - now.getDay() + 7) % 7;
  const d = new Date();
  d.setDate(now.getDate() + diff);
  return formatLocalDateInputValue(d);
}
