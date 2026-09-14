/* ---------- Smart Waste Collection Scheduler ---------- */
/* Data storage: localStorage, seeded with hardcoded defaults on first run */

const SCHEDULES_KEY = "swcs_schedules";
const REPORTS_KEY = "swcs_reports";

const DEFAULT_SCHEDULES = [
  { id: "s1", zone: "A", area: "Gandhipuram",  type: "Organic",    days: "Mon, Wed, Fri",     time: "07:00" },
  { id: "s2", zone: "A", area: "Gandhipuram",  type: "Recyclable", days: "Tue, Thu",          time: "08:00" },
  { id: "s3", zone: "B", area: "RS Puram",     type: "Organic",    days: "Mon, Wed, Fri",     time: "07:30" },
  { id: "s4", zone: "B", area: "RS Puram",     type: "Hazardous",  days: "1st Saturday",      time: "09:00" },
  { id: "s5", zone: "C", area: "Peelamedu",    type: "Recyclable", days: "Tue, Thu, Sat",     time: "08:30" },
  { id: "s6", zone: "C", area: "Peelamedu",    type: "Organic",    days: "Daily",             time: "06:30" }
];

/* ---------- Storage helpers ---------- */

function seedIfEmpty() {
  if (!localStorage.getItem(SCHEDULES_KEY)) {
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(DEFAULT_SCHEDULES));
  }
  if (!localStorage.getItem(REPORTS_KEY)) {
    localStorage.setItem(REPORTS_KEY, JSON.stringify([]));
  }
}

function getSchedules() {
  return JSON.parse(localStorage.getItem(SCHEDULES_KEY) || "[]");
}

function saveSchedules(list) {
  localStorage.setItem(SCHEDULES_KEY, JSON.stringify(list));
}

function getReports() {
  return JSON.parse(localStorage.getItem(REPORTS_KEY) || "[]");
}

function saveReports(list) {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(list));
}

function uid(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function badgeClass(type) {
  if (type === "Organic") return "badge-organic";
  if (type === "Recyclable") return "badge-recyclable";
  if (type === "Hazardous") return "badge-hazardous";
  return "";
}

function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}

/* ================= DASHBOARD PAGE ================= */

function initDashboard() {
  seedIfEmpty();
  renderStats();
  populateZoneFilter();
  renderSchedule("all");
  renderReports();

  const zoneFilter = document.getElementById("zoneFilter");
  zoneFilter.addEventListener("change", () => renderSchedule(zoneFilter.value));

  document.getElementById("reportForm").addEventListener("submit", handleReportSubmit);
}

function renderStats() {
  const schedules = getSchedules();
  const reports = getReports();
  const zones = new Set(schedules.map((s) => s.zone));

  document.getElementById("zoneCount").textContent = zones.size;
  document.getElementById("scheduleCount").textContent = schedules.length;
  document.getElementById("reportCount").textContent = reports.length;
}

function populateZoneFilter() {
  const schedules = getSchedules();
  const zones = Array.from(new Set(schedules.map((s) => s.zone))).sort();
  const select = document.getElementById("zoneFilter");

  select.innerHTML = '<option value="all">All zones</option>';
  zones.forEach((z) => {
    const opt = document.createElement("option");
    opt.value = z;
    opt.textContent = "Zone " + z;
    select.appendChild(opt);
  });
}

function renderSchedule(filter) {
  const list = document.getElementById("scheduleList");
  const schedules = getSchedules();
  const filtered = filter === "all" ? schedules : schedules.filter((s) => s.zone === filter);

  list.innerHTML = "";

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-state">No schedules for this zone yet.</p>';
    return;
  }

  filtered.forEach((s) => {
    const row = document.createElement("div");
    row.className = "schedule-row";
    row.innerHTML = `
      <div class="info">
        <p class="area">Zone ${escapeHtml(s.zone)} &mdash; ${escapeHtml(s.area)}</p>
        <p class="meta">${escapeHtml(s.days)} &middot; ${escapeHtml(s.time)}</p>
      </div>
      <span class="badge ${badgeClass(s.type)}">${escapeHtml(s.type)}</span>
    `;
    list.appendChild(row);
  });
}

function handleReportSubmit(e) {
  e.preventDefault();
  const zoneInput = document.getElementById("reportZone");
  const noteInput = document.getElementById("reportNote");
  const errorEl = document.getElementById("reportError");

  const zone = zoneInput.value.trim();
  const note = noteInput.value.trim();

  if (!zone || !note) {
    errorEl.textContent = "Please fill in both the zone and a short note.";
    errorEl.style.display = "block";
    return;
  }

  errorEl.style.display = "none";

  const reports = getReports();
  reports.unshift({
    id: uid("r"),
    zone: zone.toUpperCase(),
    note: note,
    date: new Date().toLocaleString()
  });
  saveReports(reports);

  zoneInput.value = "";
  noteInput.value = "";

  renderReports();
  renderStats();
  showToast("Report submitted");
}

function renderReports() {
  const container = document.getElementById("reportsList");
  const reports = getReports();

  if (reports.length === 0) {
    container.innerHTML = '<p class="empty-state">No reports yet.</p>';
    return;
  }

  container.innerHTML = "";
  reports.slice(0, 6).forEach((r) => {
    const item = document.createElement("div");
    item.className = "report-item";
    item.innerHTML = `
      <span class="date">${escapeHtml(r.date)}</span>
      <span class="zone-tag">Zone ${escapeHtml(r.zone)}</span> &mdash; ${escapeHtml(r.note)}
    `;
    container.appendChild(item);
  });
}

/* ================= ADMIN PAGE ================= */

function initAdmin() {
  seedIfEmpty();
  renderAdminTable();

  document.getElementById("addForm").addEventListener("submit", handleAddSchedule);
}

function renderAdminTable() {
  const container = document.getElementById("adminTable");
  const schedules = getSchedules();

  let html = `
    <div class="admin-row header">
      <div>Zone</div><div>Area</div><div>Type</div><div>Days</div><div>Time</div><div></div>
    </div>
  `;

  if (schedules.length === 0) {
    container.innerHTML = html + '<p class="empty-state">No schedules yet. Add one below.</p>';
    return;
  }

  schedules.forEach((s) => {
    html += `
      <div class="admin-row" data-id="${s.id}">
        <div data-label="Zone">${escapeHtml(s.zone)}</div>
        <div data-label="Area">${escapeHtml(s.area)}</div>
        <div data-label="Type"><span class="badge ${badgeClass(s.type)}">${escapeHtml(s.type)}</span></div>
        <div data-label="Days">${escapeHtml(s.days)}</div>
        <div data-label="Time">${escapeHtml(s.time)}</div>
        <div class="admin-actions">
          <button type="button" class="secondary" onclick="editSchedule('${s.id}')">Edit</button>
          <button type="button" class="danger" onclick="deleteSchedule('${s.id}')">Delete</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function handleAddSchedule(e) {
  e.preventDefault();

  const zone = document.getElementById("newZone").value.trim();
  const area = document.getElementById("newArea").value.trim();
  const type = document.getElementById("newType").value;
  const days = document.getElementById("newDays").value.trim();
  const time = document.getElementById("newTime").value;
  const errorEl = document.getElementById("addError");
  const submitBtn = document.getElementById("addSubmitBtn");
  const editingId = submitBtn.dataset.editingId;

  if (!zone || !area || !days || !time) {
    errorEl.textContent = "Please fill in every field before saving.";
    errorEl.style.display = "block";
    return;
  }
  errorEl.style.display = "none";

  const schedules = getSchedules();

  if (editingId) {
    const idx = schedules.findIndex((s) => s.id === editingId);
    if (idx !== -1) {
      schedules[idx] = { ...schedules[idx], zone: zone.toUpperCase(), area, type, days, time };
    }
    delete submitBtn.dataset.editingId;
    submitBtn.textContent = "Add schedule";
    showToast("Schedule updated");
  } else {
    schedules.push({ id: uid("s"), zone: zone.toUpperCase(), area, type, days, time });
    showToast("Schedule added");
  }

  saveSchedules(schedules);
  e.target.reset();
  renderAdminTable();
}

function editSchedule(id) {
  const schedules = getSchedules();
  const s = schedules.find((x) => x.id === id);
  if (!s) return;

  document.getElementById("newZone").value = s.zone;
  document.getElementById("newArea").value = s.area;
  document.getElementById("newType").value = s.type;
  document.getElementById("newDays").value = s.days;
  document.getElementById("newTime").value = s.time;

  const submitBtn = document.getElementById("addSubmitBtn");
  submitBtn.dataset.editingId = id;
  submitBtn.textContent = "Save changes";

  document.getElementById("addForm").scrollIntoView({ behavior: "smooth", block: "center" });
}

function deleteSchedule(id) {
  if (!confirm("Delete this schedule entry?")) return;
  const schedules = getSchedules().filter((s) => s.id !== id);
  saveSchedules(schedules);
  renderAdminTable();
  showToast("Schedule deleted");
}

/* ---------- utils ---------- */

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
