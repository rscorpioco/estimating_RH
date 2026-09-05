(function () {
  "use strict";

  const STORAGE_KEY = "scorpio_precon_tracker_v1";

  /** @type {{projects: Array<Object>, activeProjectId: string|null, expandedPhases: Object}} */
  let state = loadState();

  const projectListEl = document.getElementById("projectList");
  const emptyStateEl = document.getElementById("emptyState");
  const projectDetailEl = document.getElementById("projectDetail");
  const dialog = document.getElementById("projectDialog");
  const projectForm = document.getElementById("projectForm");
  const dialogTitle = document.getElementById("projectDialogTitle");
  const fieldName = document.getElementById("fieldName");
  const fieldLocation = document.getElementById("fieldLocation");
  const fieldDelivery = document.getElementById("fieldDelivery");
  const fieldTeamLead = document.getElementById("fieldTeamLead");
  const fieldActivateDate = document.getElementById("fieldActivateDate");
  const fieldBidDueDate = document.getElementById("fieldBidDueDate");

  const scheduleDialog = document.getElementById("scheduleDialog");
  const scheduleProjectName = document.getElementById("scheduleProjectName");
  const scheduleBody = document.getElementById("scheduleBody");

  const opportunityDialog = document.getElementById("opportunityDialog");
  const opportunityFormBody = document.getElementById("opportunityFormBody");
  const opportunityProjectName = document.getElementById("opportunityProjectName");
  const opportunityProgress = document.getElementById("opportunityProgress");

  const kickoffDialog = document.getElementById("kickoffDialog");
  const kickoffDialogTitle = document.getElementById("kickoffDialogTitle");
  const kickoffProjectName = document.getElementById("kickoffProjectName");
  const kickoffBody = document.getElementById("kickoffBody");
  const kickoffProgress = document.getElementById("kickoffProgress");

  const kickoffZoomDialog = document.getElementById("kickoffZoomDialog");
  const kickoffZoomPageLabel = document.getElementById("kickoffZoomPageLabel");
  const kickoffZoomSelect = document.getElementById("kickoffZoomSelect");
  const kickoffZoomCanvas = document.getElementById("kickoffZoomCanvas");

  const nofDocViewerDialog = document.getElementById("nofDocViewerDialog");
  const nofDocViewerLabel = document.getElementById("nofDocViewerLabel");
  const nofDocViewerCanvas = document.getElementById("nofDocViewerCanvas");

  let editingProjectId = null;
  let opportunityProjectId = null;
  let kickoffProjectId = null;
  // The conformed drawing set, its rendered page thumbnails, each page's tagged category, and
  // the parsed pdf.js document (kept around so the zoom view can re-render any page on demand)
  // are held in memory only (not persisted to localStorage — a drawing set can be many MB),
  // keyed by projectId. Re-attach and re-tag after a reload.
  const kickoffConformedFiles = new Map();
  const kickoffPageThumbnails = new Map();
  const kickoffPageAssignments = new Map();
  const kickoffPdfDocs = new Map();
  let kickoffZoomState = { projectId: null, pageIndex: 0 };

  // The drawing/contract PDFs uploaded on the New Opportunity Form, same in-memory-only
  // treatment as the Kickoff conformed set — not persisted, only the field values they
  // produce are saved. Keyed by projectId.
  const nofDrawingDocs = new Map();
  const nofContractDocs = new Map();
  let nofDocViewerState = { projectId: null, kind: null, pageIndex: 0 };

  // Fields whose values already live elsewhere in the app (the project record). They stay
  // "linked" — recomputed fresh every time the form opens — until the user types into them
  // here, at which point their override wins and the link is dropped for that field.
  // Must be declared before init() runs: rendering an already-active project on page load
  // calls into this synchronously, before the script would otherwise reach this line.
  const NOF_LINKED_FIELDS = {
    officeLocation: (project) => NOF_OFFICE_CODES[project.location] || "",
    deliveryMethodNOF: (project) => (project.deliveryMethod === "Hard Bid" ? "Hard Bid" : project.deliveryMethod ? "CM" : ""),
    pcPoManager: (project) => (NOF_STAFF_OPTIONS.includes(project.teamLead) ? project.teamLead : ""),
    bidDate: (project) => project.bidDueDate || "",
  };

  // Fields we attempt to pull out of an uploaded drawing/contract PDF via a best-effort text
  // scan (label-matching, not real comprehension) — see extractNofFieldsFromText below.
  // Declared here for the same reason as NOF_LINKED_FIELDS above.
  const NOF_EXTRACTION_RULES = [
    { fieldId: "jobsiteAddress", labels: ["Project Address", "Site Address", "Property Address", "Project Location"] },
    { fieldId: "ownerCompany", labels: ["Owner", "Client"] },
    { fieldId: "architectCo", labels: ["Architect", "Architect of Record"] },
    { fieldId: "civilEngineerCo", labels: ["Civil Engineer"] },
    { fieldId: "structuralEngineerCo", labels: ["Structural Engineer"] },
    { fieldId: "mepfpEngineerCo", labels: ["MEP Engineer", "MEPFP Engineer", "Mechanical Engineer"] },
    { fieldId: "landscapeArchitectCo", labels: ["Landscape Architect"] },
    { fieldId: "estStartDate", labels: ["Date of Commencement", "Commencement Date", "Start Date"], type: "date" },
    { fieldId: "estCompletionDate", labels: ["Date of Substantial Completion", "Substantial Completion Date", "Completion Date"], type: "date" },
    { fieldId: "bidDate", labels: ["Bid Date", "Date of Bid"], type: "date" },
    { fieldId: "estProjectValue", labels: ["Contract Sum", "Contract Price", "Guaranteed Maximum Price", "GMP Amount", "Total Contract Amount", "Not To Exceed Amount"], type: "currency" },
  ];
  const NOF_EXTRACTABLE_FIELD_IDS = new Set([...NOF_EXTRACTION_RULES.map((r) => r.fieldId), "contractType"]);

  init();

  // All dialogs are native <dialog> elements shown via showModal(), which does NOT close
  // any other already-open dialog — without this, opening a second one stacks on top of the
  // first, and closing the top one leaves the other sitting there looking "stuck" open.
  function closeAllDialogs(except) {
    [dialog, opportunityDialog, scheduleDialog, kickoffDialog, kickoffZoomDialog, nofDocViewerDialog].forEach((d) => {
      if (d && d !== except && d.open) d.close();
    });
  }

  function init() {
    LOCATIONS.forEach((loc) => fieldLocation.add(new Option(loc, loc)));
    DELIVERY_METHODS.forEach((dm) => fieldDelivery.add(new Option(dm, dm)));
    fieldTeamLead.add(new Option("—", ""));
    TEAM_LEAD_OPTIONS.forEach((name) => fieldTeamLead.add(new Option(name, name)));

    document.getElementById("newProjectBtn").addEventListener("click", openNewProjectDialog);
    document.getElementById("cancelProjectBtn").addEventListener("click", () => dialog.close());
    projectForm.addEventListener("submit", handleProjectFormSubmit);

    document.getElementById("closeScheduleBtn").addEventListener("click", () => scheduleDialog.close());
    document.getElementById("closeScheduleBtn2").addEventListener("click", () => scheduleDialog.close());

    document.getElementById("closeKickoffBtn").addEventListener("click", () => kickoffDialog.close());
    document.getElementById("exportKickoffBtn").addEventListener("click", handleExportKickoff);
    kickoffDialog.addEventListener("close", () => {
      renderProjectList();
      renderActiveProject();
    });

    document.getElementById("closeKickoffZoomBtn").addEventListener("click", () => kickoffZoomDialog.close());
    document.getElementById("kickoffZoomPrev").addEventListener("click", () => stepKickoffZoom(-1));
    document.getElementById("kickoffZoomNext").addEventListener("click", () => stepKickoffZoom(1));
    kickoffZoomSelect.addEventListener("change", () => {
      const assignments = kickoffPageAssignments.get(kickoffZoomState.projectId) || [];
      assignments[kickoffZoomState.pageIndex] = kickoffZoomSelect.value;
      kickoffPageAssignments.set(kickoffZoomState.projectId, assignments);
      const project = state.projects.find((p) => p.id === kickoffZoomState.projectId);
      if (project) {
        updateKickoffProgressLabel(project);
        const grid = document.getElementById("kickoffThumbGrid");
        const cell = grid && grid.children[kickoffZoomState.pageIndex];
        if (cell) {
          cell.classList.toggle("tagged", !!kickoffZoomSelect.value);
          const cellSelect = cell.querySelector(".kickoff-thumb-select");
          if (cellSelect) cellSelect.value = kickoffZoomSelect.value;
        }
      }
    });

    document.getElementById("closeOpportunityBtn").addEventListener("click", () => opportunityDialog.close());
    document.getElementById("saveOpportunityBtn").addEventListener("click", () => opportunityDialog.close());
    document.getElementById("exportOpportunityBtn").addEventListener("click", handleExportOpportunity);
    opportunityDialog.addEventListener("close", () => {
      renderProjectList();
      renderActiveProject();
    });

    document.getElementById("closeNofDocViewerBtn").addEventListener("click", () => nofDocViewerDialog.close());
    document.getElementById("nofDocViewerPrev").addEventListener("click", () => stepNofDocViewer(-1));
    document.getElementById("nofDocViewerNext").addEventListener("click", () => stepNofDocViewer(1));

    renderProjectList();
    renderActiveProject();
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to load saved state", e);
    }
    return { projects: [], activeProjectId: null, expandedPhases: {} };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Failed to save state", e);
    }
  }

  // ---------- Project CRUD ----------

  function openNewProjectDialog() {
    closeAllDialogs(dialog);
    editingProjectId = null;
    dialogTitle.textContent = "New Project";
    projectForm.reset();
    fieldActivateDate.value = todayIso();
    dialog.showModal();
  }

  function openEditProjectDialog(project) {
    closeAllDialogs(dialog);
    editingProjectId = project.id;
    dialogTitle.textContent = "Edit Project";
    fieldName.value = project.name;
    fieldLocation.value = project.location;
    fieldDelivery.value = project.deliveryMethod;
    fieldTeamLead.value = project.teamLead || "";
    fieldActivateDate.value = project.activateDate;
    fieldBidDueDate.value = project.bidDueDate || "";
    dialog.showModal();
  }

  function handleProjectFormSubmit(e) {
    if (!fieldName.value.trim() || !fieldActivateDate.value) return;

    if (editingProjectId) {
      const project = state.projects.find((p) => p.id === editingProjectId);
      project.name = fieldName.value.trim();
      project.location = fieldLocation.value;
      project.deliveryMethod = fieldDelivery.value;
      project.teamLead = fieldTeamLead.value.trim();
      project.activateDate = fieldActivateDate.value;
      project.bidDueDate = fieldBidDueDate.value || "";
    } else {
      const project = {
        id: "proj_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: fieldName.value.trim(),
        location: fieldLocation.value,
        deliveryMethod: fieldDelivery.value,
        teamLead: fieldTeamLead.value.trim(),
        activateDate: fieldActivateDate.value,
        bidDueDate: fieldBidDueDate.value || "",
        checked: {},
        opportunity: {},
        createdAt: new Date().toISOString(),
      };
      state.projects.unshift(project);
      state.activeProjectId = project.id;
    }

    saveState();
    renderProjectList();
    renderActiveProject();
  }

  function deleteProject(projectId) {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return;
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    state.projects = state.projects.filter((p) => p.id !== projectId);
    if (state.activeProjectId === projectId) {
      state.activeProjectId = state.projects.length ? state.projects[0].id : null;
    }
    saveState();
    renderProjectList();
    renderActiveProject();
  }

  function selectProject(projectId) {
    state.activeProjectId = projectId;
    saveState();
    renderProjectList();
    renderActiveProject();
  }

  // ---------- Progress helpers ----------

  // "If needed" items are a judgment call and always shown; CM/Hard-Bid-only items are
  // hidden (and excluded from progress counts) when they don't apply to this project.
  function itemApplies(item, project) {
    if (item.condition === "CM") return project.deliveryMethod === "CM at Risk (Interview)";
    if (item.condition === "HardBid") return project.deliveryMethod === "Hard Bid";
    return true;
  }

  function applicableItems(phase, project) {
    return phase.items.filter((item) => itemApplies(item, project));
  }

  function countPhaseItems(phase, project) {
    return applicableItems(phase, project).length;
  }

  function countPhaseChecked(phase, checked, project) {
    return applicableItems(phase, project).filter((item) => checked[item.id]).length;
  }

  function computeOverallProgress(project) {
    let total = 0;
    let done = 0;
    CHECKLIST_PHASES.forEach((phase) => {
      total += countPhaseItems(phase, project);
      done += countPhaseChecked(phase, project.checked || {}, project);
    });
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function addDays(dateStr, days) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d;
  }

  function formatDate(d) {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function phaseDueStatus(project, phase) {
    const dueDate = addDays(project.activateDate, phase.dueOffsetDays);
    const checkedCount = countPhaseChecked(phase, project.checked || {}, project);
    const total = countPhaseItems(phase, project);
    const complete = total > 0 && checkedCount === total;

    if (complete) return { dueDate, cls: "complete", label: "Complete" };

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const msPerDay = 86400000;
    const daysUntil = Math.round((dueDate - now) / msPerDay);

    if (daysUntil < 0) return { dueDate, cls: "overdue", label: `Overdue — was due ${formatDate(dueDate)}` };
    if (daysUntil <= 2) return { dueDate, cls: "due-soon", label: `Due ${formatDate(dueDate)}` };
    return { dueDate, cls: "", label: `Due ${formatDate(dueDate)}` };
  }

  // ---------- Rendering ----------

  function renderProjectList() {
    projectListEl.innerHTML = "";
    if (!state.projects.length) {
      const p = document.createElement("p");
      p.style.cssText = "color:#b7c4d6;font-size:12.5px;";
      p.textContent = "No projects yet.";
      projectListEl.appendChild(p);
      return;
    }

    state.projects.forEach((project) => {
      const progress = computeOverallProgress(project);
      const card = document.createElement("div");
      card.className = "project-card" + (project.id === state.activeProjectId ? " active" : "");
      card.innerHTML = `
        <div class="pname">${escapeHtml(project.name)}</div>
        <div class="pmeta"><span>${escapeHtml(project.location)}</span><span>${progress.pct}%</span></div>
        <div class="pprogress"><div class="pprogress-fill" style="width:${progress.pct}%"></div></div>
      `;
      card.addEventListener("click", () => selectProject(project.id));
      projectListEl.appendChild(card);
    });
  }

  function renderActiveProject() {
    const project = state.projects.find((p) => p.id === state.activeProjectId);
    if (!project) {
      emptyStateEl.hidden = false;
      projectDetailEl.hidden = true;
      projectDetailEl.innerHTML = "";
      return;
    }

    emptyStateEl.hidden = true;
    projectDetailEl.hidden = false;

    const overall = computeOverallProgress(project);

    projectDetailEl.innerHTML = "";

    const header = document.createElement("div");
    header.className = "project-detail-header";
    header.innerHTML = `
      <div>
        <h2>${escapeHtml(project.name)}</h2>
        <div class="project-meta-line">
          <span><strong>${escapeHtml(project.location)}</strong></span>
          <span>${escapeHtml(project.deliveryMethod)}</span>
          <span>Team Lead: <strong>${escapeHtml(project.teamLead || "—")}</strong></span>
          <span>Activated: <strong>${formatDate(new Date(project.activateDate + "T00:00:00"))}</strong></span>
          ${project.bidDueDate ? `<span>Bid Due: <strong>${formatDate(new Date(project.bidDueDate + "T00:00:00"))}</strong></span>` : ""}
        </div>
      </div>
      <div class="header-actions">
        <button class="btn" id="editProjectBtn">Edit</button>
        <button class="btn btn-danger" id="deleteProjectBtn">Delete</button>
      </div>
    `;
    projectDetailEl.appendChild(header);
    header.querySelector("#editProjectBtn").addEventListener("click", () => openEditProjectDialog(project));
    header.querySelector("#deleteProjectBtn").addEventListener("click", () => deleteProject(project.id));

    const dayZeroEl = document.createElement("div");
    dayZeroEl.className = "day-zero-banner";
    dayZeroEl.innerHTML = `<strong>${escapeHtml(DAY_ZERO_LABEL.split(" — ")[0])}</strong> — ${escapeHtml(DAY_ZERO_LABEL.split(" — ")[1])}: ${escapeHtml(formatDate(new Date(project.activateDate + "T00:00:00")))}`;
    projectDetailEl.appendChild(dayZeroEl);

    const overallEl = document.createElement("div");
    overallEl.className = "overall-progress";
    overallEl.innerHTML = `
      <div class="overall-progress-top">
        <span>Overall progress</span>
        <span>${overall.done} / ${overall.total} items — ${overall.pct}%</span>
      </div>
      <div class="overall-progress-bar"><div class="overall-progress-fill" style="width:${overall.pct}%"></div></div>
    `;
    projectDetailEl.appendChild(overallEl);

    CHECKLIST_PHASES.forEach((phase) => {
      projectDetailEl.appendChild(renderPhase(project, phase));
    });
  }

  function renderPhase(project, phase) {
    const checked = project.checked || {};
    const total = countPhaseItems(phase, project);
    const done = countPhaseChecked(phase, checked, project);
    const status = phaseDueStatus(project, phase);
    const expandKey = project.id + ":" + phase.id;
    const isExpanded = state.expandedPhases[expandKey] !== false; // default expanded

    const phaseEl = document.createElement("div");
    phaseEl.className = "phase";

    const headerEl = document.createElement("div");
    headerEl.className = "phase-header";
    headerEl.innerHTML = `
      <div class="phase-header-left">
        <span class="phase-day-chip">${escapeHtml(phase.deadlineLabel)}</span>
        <div>
          <div class="phase-title">${escapeHtml(phase.name)}</div>
          ${phase.activity ? `<div class="phase-activity">${escapeHtml(phase.activity)}</div>` : ""}
        </div>
        <span class="phase-due ${status.cls}">${escapeHtml(status.label)}</span>
      </div>
      <div>
        <span class="phase-count">${done}/${total}</span>
        <span class="phase-toggle">${isExpanded ? "▲" : "▼"}</span>
      </div>
    `;
    headerEl.addEventListener("click", () => {
      state.expandedPhases[expandKey] = !isExpanded;
      saveState();
      renderActiveProject();
    });
    phaseEl.appendChild(headerEl);

    if (phase.id === "activate") {
      phaseEl.appendChild(renderScheduleAffordance(project));
    }

    const bodyEl = document.createElement("div");
    bodyEl.className = "phase-body";
    bodyEl.hidden = !isExpanded;

    let lastGroup = undefined;
    applicableItems(phase, project).forEach((item) => {
      if (item.group && item.group !== lastGroup) {
        const groupEl = document.createElement("div");
        groupEl.className = "item-group-header";
        groupEl.textContent = item.group;
        bodyEl.appendChild(groupEl);
      }
      lastGroup = item.group;
      bodyEl.appendChild(renderItem(project, item, checked));
    });

    phaseEl.appendChild(bodyEl);
    return phaseEl;
  }

  function renderItem(project, item, checked) {
    const wrap = document.createElement("div");
    wrap.className = "checklist-item";

    const row = document.createElement("div");
    row.className = "item-row";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = "cb_" + item.id;
    cb.checked = !!checked[item.id];
    cb.addEventListener("change", () => {
      project.checked = project.checked || {};
      if (cb.checked) project.checked[item.id] = true;
      else delete project.checked[item.id];
      saveState();
      renderProjectList();
      renderActiveProject();
    });

    const label = document.createElement("label");
    label.htmlFor = cb.id;
    label.className = cb.checked ? "checked" : "";
    label.textContent = item.text;
    if (item.link) {
      const a = document.createElement("a");
      a.href = item.link;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "item-link";
      a.textContent = "(link)";
      label.appendChild(a);
    }

    row.appendChild(cb);
    row.appendChild(label);
    wrap.appendChild(row);

    if (item.sub && item.sub.length) {
      wrap.appendChild(renderSubList(item.sub));
    }

    if (item.id === "act-1") {
      wrap.appendChild(renderOpportunityFormAffordance(project));
    }

    if (item.id === "act-kickoff") {
      wrap.appendChild(renderKickoffAffordance(project));
    }

    return wrap;
  }

  // ---------- Meeting & Task Schedule ----------

  function computeSchedule(project) {
    return SCHEDULE_RULES.filter((rule) => itemApplies(rule, project)).map((rule) => {
      const anchorDate = rule.anchor === "activate" ? project.activateDate : project.bidDueDate;
      if (!anchorDate) {
        return { rule, date: null, dateLabel: "— set a Bid Due Date to compute" };
      }
      const date = addDays(anchorDate, rule.offsetDays);
      const timeLabel = rule.time
        ? new Date("2000-01-01T" + rule.time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
        : rule.allDay
        ? "All day"
        : "—";
      return { rule, date, dateLabel: formatDate(date), timeLabel };
    });
  }

  // Builds an Outlook Web "compose event" deep link, pre-filled with subject/date/time/body.
  // This opens Outlook in a new tab with the invite ready to review — nothing is sent until
  // the user clicks Send there. A static page can't complete a real Graph/OAuth sign-in on its
  // own, so a prefilled compose link is the honest, no-backend way to hand this off to Outlook.
  function buildOutlookDeepLink(rule, date, label) {
    if (!date) return null;
    const pad = (n) => String(n).padStart(2, "0");
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const dateStr = `${y}-${m}-${d}`;

    let startdt, enddt, allday;
    if (rule.time) {
      const [hh, mm] = rule.time.split(":").map(Number);
      startdt = `${dateStr}T${pad(hh)}:${pad(mm)}:00`;
      let endH = hh, endM = mm + 30;
      if (endM >= 60) { endM -= 60; endH += 1; }
      enddt = `${dateStr}T${pad(endH)}:${pad(endM)}:00`;
      allday = "false";
    } else {
      startdt = dateStr;
      enddt = dateStr;
      allday = "true";
    }

    const params = new URLSearchParams({
      subject: label,
      startdt,
      enddt,
      allday,
      body: rule.note || "",
    });
    if (rule.to && rule.to.length) params.set("to", rule.to.join(";"));

    return "https://outlook.office.com/calendar/0/deeplink/compose?" + params.toString();
  }

  function renderScheduleAffordance(project) {
    const wrap = document.createElement("div");
    wrap.className = "phase-schedule-bar";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm";
    btn.textContent = "View Computed Meeting Schedule";
    btn.addEventListener("click", () => openScheduleDialog(project));

    const hint = document.createElement("span");
    hint.className = "nof-progress-inline";
    hint.textContent = project.bidDueDate ? "Bid due " + formatDate(new Date(project.bidDueDate + "T00:00:00")) : "Add a Bid Due Date to compute";

    wrap.appendChild(btn);
    wrap.appendChild(hint);
    return wrap;
  }

  function openScheduleDialog(project) {
    closeAllDialogs(scheduleDialog);
    scheduleProjectName.textContent = `${project.name} — ${project.location}`;
    scheduleBody.innerHTML = "";

    const levelOrBid = project.deliveryMethod === "Hard Bid" ? "Bid Day" : "Level Day";

    const table = document.createElement("table");
    table.className = "schedule-table";
    table.innerHTML = `
      <thead>
        <tr><th>Item</th><th>Date</th><th>Time</th><th>Type</th><th>Note</th><th></th></tr>
      </thead>
    `;
    const tbody = document.createElement("tbody");

    computeSchedule(project).forEach(({ rule, date, dateLabel, timeLabel }) => {
      const tr = document.createElement("tr");
      const label = rule.id === "bidLevelDay" ? rule.label.replace("Level Day / Bid Day", levelOrBid) : rule.label;
      const typeChip = rule.type === "external" ? '<span class="type-chip external">Sends to others</span>' : '<span class="type-chip self">Self task</span>';
      tr.innerHTML = `
        <td>${escapeHtml(label)}</td>
        <td class="mono-cell">${escapeHtml(dateLabel)}</td>
        <td class="mono-cell">${escapeHtml(timeLabel || "—")}</td>
        <td>${typeChip}</td>
        <td class="note-cell">${escapeHtml(rule.note || "")}</td>
        <td></td>
      `;
      const link = buildOutlookDeepLink(rule, date, label);
      if (link) {
        const a = document.createElement("a");
        a.href = link;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "btn btn-sm outlook-add-btn";
        a.textContent = "+ Outlook";
        tr.lastElementChild.appendChild(a);
      }
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    scheduleBody.appendChild(table);

    const note = document.createElement("p");
    note.className = "schedule-note";
    note.textContent = "\"+ Outlook\" opens a prefilled event in Outlook Web on this date/time — review it and click Send/Save there; nothing goes out until you do. Attendees are only filled in where an email is already known (e.g. Aaron Rogers) — add the rest yourself.";
    scheduleBody.appendChild(note);

    scheduleDialog.showModal();
  }

  // ---------- Kickoff / Bid Day Package ----------
  // A single conformed drawing set is uploaded once; pdf.js renders a thumbnail of every
  // page in-browser, and each page is tagged with which of the 6 categories it belongs to.
  // Export pulls the tagged pages back out of that one file per category.

  function waitForPdfJs(timeoutMs) {
    return new Promise((resolve) => {
      if (window.pdfjsLib) return resolve(window.pdfjsLib);
      const start = Date.now();
      (function poll() {
        if (window.pdfjsLib) return resolve(window.pdfjsLib);
        if (Date.now() - start > (timeoutMs || 8000)) return resolve(null);
        setTimeout(poll, 100);
      })();
    });
  }

  function countKickoffProgress(project) {
    const data = project.kickoffPackage || {};
    const fieldsFilled = KICKOFF_FIELDS.filter((f) => {
      const v = data[f.id];
      return v !== undefined && v !== null && String(v).trim() !== "";
    }).length;
    const assignments = kickoffPageAssignments.get(project.id) || [];
    const taggedPages = assignments.filter(Boolean).length;
    const categoriesTagged = new Set(assignments.filter(Boolean)).size;
    return {
      fieldsFilled,
      fieldsTotal: KICKOFF_FIELDS.length,
      hasFile: kickoffConformedFiles.has(project.id),
      totalPages: assignments.length,
      taggedPages,
      categoriesTagged,
      categoriesTotal: KICKOFF_PACKAGE_SECTIONS.length,
    };
  }

  function renderKickoffAffordance(project) {
    const wrap = document.createElement("div");
    wrap.className = "item-inline-actions";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm";
    btn.textContent = "Build Kickoff / Bid Day Package";
    btn.addEventListener("click", () => openKickoffDialog(project));

    const p = countKickoffProgress(project);
    const hint = document.createElement("span");
    hint.className = "nof-progress-inline";
    hint.textContent = p.hasFile
      ? `${p.fieldsFilled}/${p.fieldsTotal} fields, ${p.taggedPages}/${p.totalPages} pages tagged`
      : `${p.fieldsFilled}/${p.fieldsTotal} fields, no drawing set attached`;

    wrap.appendChild(btn);
    wrap.appendChild(hint);
    return wrap;
  }

  function openKickoffDialog(project) {
    closeAllDialogs(kickoffDialog);
    kickoffProjectId = project.id;
    project.kickoffPackage = project.kickoffPackage || {};
    const levelOrBid = project.deliveryMethod === "Hard Bid" ? "Bid Day" : "Level Day";
    kickoffDialogTitle.textContent = levelOrBid + " Package";
    kickoffProjectName.textContent = `${project.name} — ${project.location}`;
    renderKickoffBody(project);
    updateKickoffProgressLabel(project);
    kickoffDialog.showModal();
  }

  function updateKickoffProgressLabel(project) {
    const p = countKickoffProgress(project);
    kickoffProgress.textContent = p.hasFile
      ? `${p.fieldsFilled}/${p.fieldsTotal} fields — ${p.taggedPages}/${p.totalPages} pages tagged across ${p.categoriesTagged}/${p.categoriesTotal} categories (the file isn't saved between visits)`
      : `${p.fieldsFilled}/${p.fieldsTotal} fields — no drawing set attached yet`;
  }

  function renderKickoffBody(project) {
    kickoffBody.innerHTML = "";

    const drawingsTitle = document.createElement("div");
    drawingsTitle.className = "nof-section-title";
    drawingsTitle.textContent = "Conformed Drawing Set";
    kickoffBody.appendChild(drawingsTitle);
    kickoffBody.appendChild(renderKickoffUploadRow(project));

    const grid = document.createElement("div");
    grid.className = "kickoff-thumb-grid";
    grid.id = "kickoffThumbGrid";
    kickoffBody.appendChild(grid);

    const existingFile = kickoffConformedFiles.get(project.id);
    const cachedThumbs = kickoffPageThumbnails.get(project.id);
    if (existingFile && cachedThumbs) {
      renderKickoffThumbnails(project, cachedThumbs);
    }

    const infoTitle = document.createElement("div");
    infoTitle.className = "nof-section-title";
    infoTitle.textContent = "Package Information";
    kickoffBody.appendChild(infoTitle);

    for (let i = 0; i < KICKOFF_FIELDS.length; i += 2) {
      const row = document.createElement("div");
      row.className = "nof-row";
      row.appendChild(renderKickoffField(project, KICKOFF_FIELDS[i]));
      row.appendChild(KICKOFF_FIELDS[i + 1] ? renderKickoffField(project, KICKOFF_FIELDS[i + 1]) : emptyOpportunityField());
      kickoffBody.appendChild(row);
    }
  }

  function renderKickoffUploadRow(project) {
    const existing = kickoffConformedFiles.get(project.id);

    const row = document.createElement("div");
    row.className = "kickoff-upload-row";

    const label = document.createElement("span");
    label.className = "kickoff-upload-label";
    label.textContent = "Drawing Set";

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.id = "kickoff_conformed_file";

    const status = document.createElement("span");
    status.className = "kickoff-upload-status";
    status.textContent = existing ? existing.name : "No file attached";

    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      status.textContent = "Reading " + file.name + "…";
      try {
        await processKickoffConformedSet(project, file);
        status.textContent = file.name;
      } catch (err) {
        status.textContent = "Couldn't read that file";
        alert("Couldn't read that PDF: " + (err && err.message ? err.message : err));
      }
      updateKickoffProgressLabel(project);
      renderProjectList();
    });

    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(status);
    return row;
  }

  async function processKickoffConformedSet(project, file) {
    const pdfjsLib = await waitForPdfJs();
    if (!pdfjsLib) throw new Error("The page-preview library didn't load — check your internet connection");

    kickoffConformedFiles.set(project.id, file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    kickoffPdfDocs.set(project.id, pdf);

    kickoffPageAssignments.set(project.id, new Array(pdf.numPages).fill(""));

    const grid = document.getElementById("kickoffThumbGrid");
    grid.innerHTML = "";
    const thumbs = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.35 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      const dataUrl = canvas.toDataURL("image/png");
      thumbs.push(dataUrl);
      grid.appendChild(renderKickoffThumbCell(project, pageNum - 1, dataUrl));
    }

    kickoffPageThumbnails.set(project.id, thumbs);
  }

  function renderKickoffThumbnails(project, thumbs) {
    const grid = document.getElementById("kickoffThumbGrid");
    grid.innerHTML = "";
    thumbs.forEach((dataUrl, i) => grid.appendChild(renderKickoffThumbCell(project, i, dataUrl)));
  }

  function renderKickoffThumbCell(project, pageIndex, dataUrl) {
    const assignments = kickoffPageAssignments.get(project.id) || [];
    const cell = document.createElement("div");
    cell.className = "kickoff-thumb-cell";

    const img = document.createElement("img");
    img.src = dataUrl;
    img.className = "kickoff-thumb-img";
    img.alt = "Page " + (pageIndex + 1) + " — click to zoom in and read the sheet number";
    img.title = "Click to zoom in";
    img.addEventListener("click", () => openKickoffZoom(project, pageIndex));

    const pageLabel = document.createElement("div");
    pageLabel.className = "kickoff-thumb-page";
    pageLabel.textContent = "Page " + (pageIndex + 1);

    const select = document.createElement("select");
    select.className = "kickoff-thumb-select";
    select.add(new Option("— Unassigned —", ""));
    KICKOFF_PACKAGE_SECTIONS.forEach((section) => select.add(new Option(section, section)));
    select.value = assignments[pageIndex] || "";
    select.addEventListener("change", () => {
      assignments[pageIndex] = select.value;
      kickoffPageAssignments.set(project.id, assignments);
      cell.classList.toggle("tagged", !!select.value);
      updateKickoffProgressLabel(project);
    });

    cell.classList.toggle("tagged", !!select.value);
    cell.appendChild(img);
    cell.appendChild(pageLabel);
    cell.appendChild(select);
    return cell;
  }

  // ---------- Kickoff page zoom ----------
  // Thumbnails are rendered small for the grid; this re-renders the same page at a much
  // higher resolution on demand, so a sheet number in the title block is actually readable.

  async function openKickoffZoom(project, pageIndex) {
    // Deliberately does NOT closeAllDialogs here — the zoom view nests on top of the
    // Kickoff dialog (native <dialog> supports stacked modals), and closing it should
    // return to Kickoff still open, not evict it.
    kickoffZoomState = { projectId: project.id, pageIndex };
    kickoffZoomSelect.innerHTML = "";
    kickoffZoomSelect.add(new Option("— Unassigned —", ""));
    KICKOFF_PACKAGE_SECTIONS.forEach((section) => kickoffZoomSelect.add(new Option(section, section)));
    kickoffZoomDialog.showModal();
    await renderKickoffZoomPage(project);
  }

  function stepKickoffZoom(delta) {
    const project = state.projects.find((p) => p.id === kickoffZoomState.projectId);
    if (!project) return;
    const assignments = kickoffPageAssignments.get(project.id) || [];
    const nextIndex = kickoffZoomState.pageIndex + delta;
    if (nextIndex < 0 || nextIndex >= assignments.length) return;
    kickoffZoomState.pageIndex = nextIndex;
    renderKickoffZoomPage(project);
  }

  async function renderKickoffZoomPage(project) {
    const pdf = kickoffPdfDocs.get(project.id);
    const assignments = kickoffPageAssignments.get(project.id) || [];
    const pageIndex = kickoffZoomState.pageIndex;
    if (!pdf) return;

    kickoffZoomPageLabel.textContent = `Page ${pageIndex + 1} of ${assignments.length}`;
    kickoffZoomSelect.value = assignments[pageIndex] || "";

    document.getElementById("kickoffZoomPrev").disabled = pageIndex <= 0;
    document.getElementById("kickoffZoomNext").disabled = pageIndex >= assignments.length - 1;

    const page = await pdf.getPage(pageIndex + 1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(3, 1100 / baseViewport.width);
    const viewport = page.getViewport({ scale });
    kickoffZoomCanvas.width = viewport.width;
    kickoffZoomCanvas.height = viewport.height;
    await page.render({ canvasContext: kickoffZoomCanvas.getContext("2d"), viewport }).promise;
  }

  function renderKickoffField(project, field) {
    const data = project.kickoffPackage || (project.kickoffPackage = {});
    const wrap = document.createElement("div");
    wrap.className = "nof-field";

    const label = document.createElement("label");
    const labelText = document.createElement("span");
    labelText.textContent = field.label;
    label.appendChild(labelText);

    const input = document.createElement(field.type === "textarea" ? "textarea" : "input");
    if (field.type !== "textarea") input.type = field.type;
    input.value = data[field.id] || "";
    input.id = "kickoff_" + field.id;
    input.addEventListener("input", () => {
      data[field.id] = input.value;
      saveState();
      updateKickoffProgressLabel(project);
    });

    label.appendChild(input);
    wrap.appendChild(label);
    return wrap;
  }

  function wrapPdfText(text, font, size, maxWidth) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const trial = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(trial, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = trial;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  async function handleExportKickoff() {
    const project = state.projects.find((p) => p.id === kickoffProjectId);
    if (!project) return;

    if (typeof PDFLib === "undefined") {
      alert("The PDF library didn't load (check your internet connection) — your entries are still saved in the app.");
      return;
    }

    const exportBtn = document.getElementById("exportKickoffBtn");
    const originalLabel = exportBtn.textContent;
    exportBtn.disabled = true;
    exportBtn.textContent = "Building…";

    try {
      const bytes = await buildKickoffPackagePdf(project);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sanitizeFilename(project.name)}_Kickoff_Package.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      alert("Couldn't build the package: " + (err && err.message ? err.message : err));
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = originalLabel;
    }
  }

  async function buildKickoffPackagePdf(project) {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const data = project.kickoffPackage || {};
    const levelOrBid = project.deliveryMethod === "Hard Bid" ? "BID DAY" : "LEVEL DAY";

    const outDoc = await PDFDocument.create();
    const font = await outDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await outDoc.embedFont(StandardFonts.HelveticaBold);

    const page = outDoc.addPage([612, 792]);
    const marginX = 50;
    let y = 740;

    function heading(text, size) {
      page.drawText(text, { x: marginX, y, size, font: boldFont, color: rgb(0.05, 0.05, 0.05) });
      y -= size + 10;
    }

    function fieldLine(label, value) {
      page.drawText(label, { x: marginX, y, size: 10, font: boldFont, color: rgb(0.15, 0.15, 0.15) });
      page.drawText(String(value || "—"), { x: marginX + 190, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
      y -= 18;
    }

    function wrappedBlock(label, value) {
      page.drawText(label, { x: marginX, y, size: 10, font: boldFont, color: rgb(0.15, 0.15, 0.15) });
      y -= 14;
      const lines = wrapPdfText(value || "—", font, 10, 500);
      lines.forEach((line) => {
        page.drawText(line, { x: marginX + 10, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
        y -= 14;
      });
      y -= 4;
    }

    const bidDayDateLabel = data.bidDayDate ? formatDate(new Date(data.bidDayDate + "T00:00:00")) : "—";
    const bidDayTimeLabel = data.bidDayTime ? formatTimeHHMM(data.bidDayTime) : "";
    heading(`${levelOrBid} | ${bidDayDateLabel}${bidDayTimeLabel ? " at " + bidDayTimeLabel : ""}`, 18);
    heading(project.name, 13);
    heading(data.projectAddress || "—", 11);
    y -= 6;

    fieldLine("RFIs due by:", data.rfiDueBy ? formatDate(new Date(data.rfiDueBy + "T00:00:00")) : "—");
    const subBidsDue = data.subBidsDueDate
      ? formatDate(new Date(data.subBidsDueDate + "T00:00:00")) + (data.subBidsDueTime ? " at " + formatTimeHHMM(data.subBidsDueTime) : "")
      : "—";
    fieldLine("Sub Bids are due:", subBidsDue);
    y -= 10;

    heading("Project Requirements for Subcontractors", 12);
    fieldLine("Bids must be good for:", data.bidsGoodForDays ? data.bidsGoodForDays + " days" : "—");
    fieldLine("Schedule:", data.schedule);
    fieldLine("Liquidated Damages:", data.liquidatedDamages);
    wrappedBlock("Certifications, Background Checks, etc.:", data.certifications);

    heading("Design Team", 12);
    fieldLine("Architect:", data.architect);
    fieldLine("MEP:", data.mep);
    fieldLine("Civil & Landscape:", data.civilLandscape);
    fieldLine("Structural:", data.structural);
    y -= 6;

    wrappedBlock("Alternates:", data.alternates);

    const conformedFile = kickoffConformedFiles.get(project.id);
    const assignments = kickoffPageAssignments.get(project.id) || [];
    if (conformedFile) {
      const srcBytes = new Uint8Array(await conformedFile.arrayBuffer());
      const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });

      for (const section of KICKOFF_PACKAGE_SECTIONS) {
        const pageIndices = assignments
          .map((tag, idx) => (tag === section ? idx : -1))
          .filter((idx) => idx !== -1);
        if (!pageIndices.length) continue;

        const dividerPage = outDoc.addPage([612, 792]);
        dividerPage.drawText(section.toUpperCase(), {
          x: 50,
          y: 396,
          size: 28,
          font: boldFont,
          color: rgb(0.05, 0.05, 0.05),
        });

        const copiedPages = await outDoc.copyPages(srcDoc, pageIndices);
        copiedPages.forEach((p) => outDoc.addPage(p));
      }
    }

    return outDoc.save();
  }

  function formatTimeHHMM(hhmm) {
    const [hh, mm] = hhmm.split(":").map(Number);
    return new Date(2000, 0, 1, hh, mm).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  // ---------- New Opportunity Form ----------

  // ---- Drawing / contract upload: best-effort text extraction ----
  // This is a label-matching heuristic against the PDF's text layer, not real reading
  // comprehension — it can miss things or grab the wrong line entirely. It only ever fills
  // fields that are still blank, and every field it touches gets an "extracted" badge so
  // it's obvious which values came from a scan versus were typed in. Scanned/rasterized
  // drawings have no text layer at all (confirmed against a real Scorpio drawing set), so
  // most drawing uploads will find nothing to extract — that's expected, not a bug.

  async function extractPdfText(pdfDoc) {
    let text = "";
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      text += groupTextItemsIntoLines(content.items).join("\n") + "\n";
    }
    return text;
  }

  // pdf.js hands back individual positioned text fragments, not lines — group fragments that
  // share roughly the same vertical position into a line, left-to-right, so label-matching
  // regexes like /^Owner:\s*(.+)/ have something to match against.
  function groupTextItemsIntoLines(items) {
    const rows = new Map();
    items.forEach((item) => {
      const y = Math.round(item.transform[5] / 2) * 2;
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push({ x: item.transform[4], str: item.str });
    });
    return [...rows.keys()]
      .sort((a, b) => b - a)
      .map((y) => rows.get(y).sort((a, b) => a.x - b.x).map((i) => i.str).join(" ").trim())
      .filter(Boolean);
  }

  function parseFuzzyDate(str) {
    const d = new Date(str.trim());
    if (isNaN(d.getTime())) return null;
    if (d.getFullYear() < 1990 || d.getFullYear() > 2100) return null;
    return d.toISOString().slice(0, 10);
  }

  function parseCurrencyAmount(str) {
    const cleaned = str.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : String(num);
  }

  function matchContractType(fullText) {
    if (/guaranteed maximum price|\bGMP\b/i.test(fullText)) return "GMP";
    if (/lump sum|invitation to bid|\bITB\b/i.test(fullText)) return "Bid";
    if (/statement of qualifications|\bSOQ\b/i.test(fullText)) return "Statement of Qualifications";
    return null;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function extractNofFieldsFromText(text) {
    const lines = text.split("\n");
    const found = {};
    NOF_EXTRACTION_RULES.forEach((rule) => {
      for (const label of rule.labels) {
        const re = new RegExp("^\\s*" + escapeRegex(label) + "\\s*[:\\-]\\s*(.+?)\\s*$", "i");
        let raw = null;
        for (const line of lines) {
          const m = line.match(re);
          if (m && m[1] && m[1].trim()) { raw = m[1].trim(); break; }
        }
        if (raw) {
          let value = raw;
          if (rule.type === "date") value = parseFuzzyDate(value);
          else if (rule.type === "currency") value = parseCurrencyAmount(value);
          if (value) { found[rule.fieldId] = value; break; }
        }
      }
    });
    const contractType = matchContractType(text);
    if (contractType) found.contractType = contractType;
    return found;
  }

  function nofFieldLabelFor(fieldId) {
    const field = NOF_ALL_FIELDS.find((f) => f.id === fieldId);
    return field ? field.label : fieldId;
  }

  async function processNofSourceDoc(project, kind, file) {
    const pdfjsLib = await waitForPdfJs();
    if (!pdfjsLib) throw new Error("The PDF-reading library didn't load — check your internet connection");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
    const text = await extractPdfText(pdfDoc);
    const matches = extractNofFieldsFromText(text);

    const data = project.opportunity || (project.opportunity = {});
    data._extracted = data._extracted || {};
    const matchedFieldIds = [];
    Object.keys(matches).forEach((fieldId) => {
      const current = data[fieldId];
      if (current === undefined || current === null || String(current).trim() === "") {
        data[fieldId] = matches[fieldId];
        data._extracted[fieldId] = kind;
        matchedFieldIds.push(fieldId);
      }
    });

    const map = kind === "drawing" ? nofDrawingDocs : nofContractDocs;
    map.set(project.id, {
      file,
      pdfDoc,
      numPages: pdfDoc.numPages,
      lastExtraction: { matchedFieldIds, hasText: text.trim().length > 0 },
    });

    saveState();
  }

  function renderNofSourceDocRow(project, kind) {
    const map = kind === "drawing" ? nofDrawingDocs : nofContractDocs;
    const doc = map.get(project.id);

    const wrap = document.createElement("div");
    wrap.className = "nof-doc-upload-wrap";

    const row = document.createElement("div");
    row.className = "kickoff-upload-row";

    const label = document.createElement("span");
    label.className = "kickoff-upload-label";
    label.textContent = kind === "drawing" ? "Drawing (PDF)" : "Contract (PDF)";

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";

    const status = document.createElement("span");
    status.className = "kickoff-upload-status";
    status.textContent = doc ? `${doc.file.name} (${doc.numPages} page${doc.numPages === 1 ? "" : "s"})` : "No file attached";

    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      status.textContent = "Reading " + file.name + "…";
      try {
        await processNofSourceDoc(project, kind, file);
      } catch (err) {
        alert("Couldn't read that PDF: " + (err && err.message ? err.message : err));
      }
      renderOpportunityBody(project);
      updateOpportunityProgressLabel(project);
    });

    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(status);

    if (doc) {
      const viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className = "btn btn-sm";
      viewBtn.textContent = "View Pages";
      viewBtn.addEventListener("click", () => openNofDocViewer(project, kind));
      row.appendChild(viewBtn);
    }

    wrap.appendChild(row);

    if (doc && doc.lastExtraction) {
      const { matchedFieldIds, hasText } = doc.lastExtraction;
      const names = matchedFieldIds.map(nofFieldLabelFor);
      const note = document.createElement("div");
      note.className = "nof-doc-note";
      if (names.length > 0) {
        note.textContent = `Pulled ${names.length} field${names.length === 1 ? "" : "s"} from this ` +
          `${kind}: ${names.join(", ")}. Only fields that were still blank got filled in — please verify them.`;
      } else if (!hasText) {
        note.textContent = `No selectable text found in this ${kind} — it's likely a scanned image. ` +
          `Use "View Pages" to read it and fill in fields by hand.`;
      } else {
        note.textContent = `Found text in this ${kind}, but couldn't confidently match it to any fields. ` +
          `Use "View Pages" to read it and fill in by hand.`;
      }
      wrap.appendChild(note);
    }

    return wrap;
  }

  function openNofDocViewer(project, kind) {
    // Deliberately does NOT closeAllDialogs — nests on top of the Opportunity dialog like the
    // Kickoff zoom nests on top of the Kickoff dialog.
    const map = kind === "drawing" ? nofDrawingDocs : nofContractDocs;
    const doc = map.get(project.id);
    if (!doc) return;
    nofDocViewerState = { projectId: project.id, kind, pageIndex: 0 };
    nofDocViewerDialog.showModal();
    renderNofDocViewerPage();
  }

  function stepNofDocViewer(delta) {
    const map = nofDocViewerState.kind === "drawing" ? nofDrawingDocs : nofContractDocs;
    const doc = map.get(nofDocViewerState.projectId);
    if (!doc) return;
    const next = nofDocViewerState.pageIndex + delta;
    if (next < 0 || next >= doc.numPages) return;
    nofDocViewerState.pageIndex = next;
    renderNofDocViewerPage();
  }

  async function renderNofDocViewerPage() {
    const map = nofDocViewerState.kind === "drawing" ? nofDrawingDocs : nofContractDocs;
    const doc = map.get(nofDocViewerState.projectId);
    if (!doc) return;
    const pageIndex = nofDocViewerState.pageIndex;

    nofDocViewerLabel.textContent = `${nofDocViewerState.kind === "drawing" ? "Drawing" : "Contract"} — page ${pageIndex + 1} of ${doc.numPages}`;
    document.getElementById("nofDocViewerPrev").disabled = pageIndex <= 0;
    document.getElementById("nofDocViewerNext").disabled = pageIndex >= doc.numPages - 1;

    const page = await doc.pdfDoc.getPage(pageIndex + 1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(3, 1100 / baseViewport.width);
    const viewport = page.getViewport({ scale });
    nofDocViewerCanvas.width = viewport.width;
    nofDocViewerCanvas.height = viewport.height;
    await page.render({ canvasContext: nofDocViewerCanvas.getContext("2d"), viewport }).promise;
  }

  function countOpportunityFieldsFilled(project) {
    const data = project.opportunity || {};
    const filled = NOF_ALL_FIELDS.filter((f) => {
      const v = data[f.id];
      return v !== undefined && v !== null && String(v).trim() !== "";
    }).length;
    return { filled, total: NOF_ALL_FIELDS.length };
  }

  function countOpportunityLinkedFields(project) {
    const linked = (project.opportunity && project.opportunity._linked) || {};
    return Object.keys(NOF_LINKED_FIELDS).filter((id) => linked[id]).length;
  }

  function renderOpportunityFormAffordance(project) {
    const wrap = document.createElement("div");
    wrap.className = "item-inline-actions";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm";
    btn.textContent = "Fill Out New Opportunity Form";
    btn.addEventListener("click", () => openOpportunityDialog(project));

    const { filled, total } = countOpportunityFieldsFilled(project);
    const linkedCount = countOpportunityLinkedFields(project);
    const progress = document.createElement("span");
    progress.className = "nof-progress-inline";
    progress.textContent = filled > 0
      ? `${filled}/${total} fields filled${linkedCount > 0 ? ` (${linkedCount} auto)` : ""}`
      : `${total} fields — not started`;

    wrap.appendChild(btn);
    wrap.appendChild(progress);
    return wrap;
  }

  function applyOpportunityDefaults(project) {
    project.opportunity = project.opportunity || {};
    const data = project.opportunity;
    data._linked = data._linked || {};

    // Keep linked fields synced with the project record for as long as the user leaves them
    // alone; the moment they edit one here, renderOpportunityField drops its link.
    Object.keys(NOF_LINKED_FIELDS).forEach((id) => {
      if (data[id] === undefined || data._linked[id]) {
        data[id] = NOF_LINKED_FIELDS[id](project);
        data._linked[id] = true;
      }
    });

    if (data.formDate === undefined) data.formDate = todayIso();
    if (data.dateOwnerProject === undefined) {
      data.dateOwnerProject = `${project.activateDate} — [Owner] — ${project.name}`;
    }
  }

  function openOpportunityDialog(project) {
    closeAllDialogs(opportunityDialog);
    opportunityProjectId = project.id;
    applyOpportunityDefaults(project);
    saveState();

    opportunityProjectName.textContent = `${project.name} — ${project.location}`;
    renderOpportunityBody(project);
    updateOpportunityProgressLabel(project);
    opportunityDialog.showModal();
  }

  function updateOpportunityProgressLabel(project) {
    const { filled, total } = countOpportunityFieldsFilled(project);
    const linkedCount = countOpportunityLinkedFields(project);
    opportunityProgress.textContent = linkedCount > 0
      ? `${filled} of ${total} fields filled — ${linkedCount} auto-filled from the project`
      : `${filled} of ${total} fields filled`;
  }

  function renderOpportunityBody(project) {
    opportunityFormBody.innerHTML = "";

    const sourceDocsTitle = document.createElement("div");
    sourceDocsTitle.className = "nof-section-title";
    sourceDocsTitle.textContent = "Source Documents (optional)";
    opportunityFormBody.appendChild(sourceDocsTitle);

    const sourceDocsIntro = document.createElement("p");
    sourceDocsIntro.className = "nof-doc-intro";
    sourceDocsIntro.textContent = "Upload a drawing set or contract PDF and any matching fields " +
      "below that are still blank will be filled in automatically. This is a best-effort text " +
      "scan, not real reading comprehension — always double-check anything pulled in. Scanned " +
      "or image-only drawings usually have no extractable text at all.";
    opportunityFormBody.appendChild(sourceDocsIntro);

    opportunityFormBody.appendChild(renderNofSourceDocRow(project, "drawing"));
    opportunityFormBody.appendChild(renderNofSourceDocRow(project, "contract"));

    const linkedCount = countOpportunityLinkedFields(project);
    if (linkedCount > 0) {
      const banner = document.createElement("div");
      banner.className = "nof-auto-banner";
      banner.textContent = `${linkedCount} field${linkedCount === 1 ? "" : "s"} below ` +
        `(marked Auto) ${linkedCount === 1 ? "is" : "are"} filled in automatically from this ` +
        `project's setup — Office, Delivery Method, PC/PO Manager, Bid Date. Edit any of them ` +
        `to override just this form.`;
      opportunityFormBody.appendChild(banner);
    }

    const generalTitle = document.createElement("div");
    generalTitle.className = "nof-section-title";
    generalTitle.textContent = "General Information";
    opportunityFormBody.appendChild(generalTitle);
    NOF_GENERAL_ROWS.forEach((row) => opportunityFormBody.appendChild(renderOpportunityRow(project, row)));

    const ownerTitle = document.createElement("div");
    ownerTitle.className = "nof-section-title";
    ownerTitle.textContent = "Owner Information  /  AEC Team";
    opportunityFormBody.appendChild(ownerTitle);
    NOF_OWNER_AEC_ROWS.forEach((row) => opportunityFormBody.appendChild(renderOpportunityRow(project, row)));

    const descTitle = document.createElement("div");
    descTitle.className = "nof-section-title";
    descTitle.textContent = "Description";
    opportunityFormBody.appendChild(descTitle);

    const descRow = document.createElement("div");
    descRow.className = "nof-row";
    descRow.style.gridTemplateColumns = "1fr";
    descRow.appendChild(renderOpportunityField(project, NOF_DESCRIPTION_FIELD));
    opportunityFormBody.appendChild(descRow);
  }

  function renderOpportunityRow(project, row) {
    const rowEl = document.createElement("div");
    rowEl.className = "nof-row";
    rowEl.appendChild(row.left ? renderOpportunityField(project, row.left) : emptyOpportunityField());
    rowEl.appendChild(row.right ? renderOpportunityField(project, row.right) : emptyOpportunityField());
    return rowEl;
  }

  function emptyOpportunityField() {
    const div = document.createElement("div");
    div.className = "nof-field empty";
    return div;
  }

  function renderOpportunityField(project, field) {
    const data = project.opportunity || (project.opportunity = {});
    const wrap = document.createElement("div");
    wrap.className = "nof-field";

    const label = document.createElement("label");
    const labelText = document.createElement("span");
    labelText.textContent = field.label;
    label.appendChild(labelText);

    const isLinkable = !!NOF_LINKED_FIELDS[field.id];
    const isExtractable = NOF_EXTRACTABLE_FIELD_IDS.has(field.id);
    let autoBadge = null;
    if (isLinkable || isExtractable) {
      autoBadge = document.createElement("span");
      labelText.appendChild(autoBadge);
    }

    function refreshBadge() {
      if (!autoBadge) return;
      if (data._linked && data._linked[field.id]) {
        autoBadge.className = "nof-auto-badge";
        autoBadge.textContent = "Auto";
        autoBadge.title = "Filled in automatically from this project's details — edit this field to override.";
        autoBadge.hidden = false;
      } else if (data._extracted && data._extracted[field.id]) {
        const source = data._extracted[field.id] === "drawing" ? "Drawing" : "Contract";
        autoBadge.className = "nof-auto-badge nof-extract-badge";
        autoBadge.textContent = "From " + source;
        autoBadge.title = `Pulled from the uploaded ${source.toLowerCase()} — please verify.`;
        autoBadge.hidden = false;
      } else {
        autoBadge.hidden = true;
      }
    }
    refreshBadge();

    let input;
    if (field.type === "select") {
      input = document.createElement("select");
      input.add(new Option("—", ""));
      field.options.forEach((opt) => input.add(new Option(opt, opt)));
      input.value = data[field.id] || "";
    } else if (field.type === "textarea") {
      input = document.createElement("textarea");
      input.value = data[field.id] || "";
    } else {
      input = document.createElement("input");
      input.type = field.type === "date" ? "date" : field.type === "currency" || field.type === "number" ? "number" : "text";
      if (field.type === "currency") input.step = "1";
      input.value = data[field.id] || "";
    }

    function markOverridden() {
      let changed = false;
      if (data._linked && data._linked[field.id]) {
        data._linked[field.id] = false;
        changed = true;
      }
      if (data._extracted && data._extracted[field.id]) {
        delete data._extracted[field.id];
        changed = true;
      }
      if (changed) refreshBadge();
    }

    input.id = "nof_" + field.id;
    input.addEventListener("input", () => {
      data[field.id] = input.value;
      markOverridden();
      saveState();
      updateOpportunityProgressLabel(project);
    });
    if (field.type === "select") {
      input.addEventListener("change", () => {
        data[field.id] = input.value;
        markOverridden();
        saveState();
        updateOpportunityProgressLabel(project);
      });
    }

    label.appendChild(input);
    wrap.appendChild(label);

    if (field.id === "jobsiteAddress") {
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "nof-copy-btn";
      copyBtn.textContent = "Copy from Owner Address";
      copyBtn.addEventListener("click", () => {
        data.jobsiteAddress = data.ownerAddress || "";
        data.jobsiteCityStateZip = data.ownerCityStateZip || "";
        const addrInput = document.getElementById("nof_jobsiteAddress");
        const cszInput = document.getElementById("nof_jobsiteCityStateZip");
        if (addrInput) addrInput.value = data.jobsiteAddress;
        if (cszInput) cszInput.value = data.jobsiteCityStateZip;
        saveState();
        updateOpportunityProgressLabel(project);
      });
      wrap.appendChild(copyBtn);
    }

    return wrap;
  }

  async function handleExportOpportunity() {
    const project = state.projects.find((p) => p.id === opportunityProjectId);
    if (!project) return;

    if (typeof ExcelJS === "undefined") {
      alert("The Excel export library didn't load (check your internet connection) — your entries are still saved in the app.");
      return;
    }

    const exportBtn = document.getElementById("exportOpportunityBtn");
    const originalLabel = exportBtn.textContent;
    exportBtn.disabled = true;
    exportBtn.textContent = "Exporting…";

    try {
      const blob = await buildOpportunityWorkbookBlob(project);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sanitizeFilename(project.name)}_New_Opportunity_Form.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = originalLabel;
    }
  }

  function sanitizeFilename(name) {
    return (name || "Project").replace(/[\\/:*?"<>|]+/g, "").trim().replace(/\s+/g, "_");
  }

  async function buildOpportunityWorkbookBlob(project) {
    const data = project.opportunity || {};
    const DARK = "FF222222";
    const GREY = "FF9EA1A2";
    const THIN = { style: "thin", color: { argb: "FFD9D9D9" } };
    const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

    const wb = new ExcelJS.Workbook();
    wb.creator = "Scorpio Preconstruction — CM Startup Board";
    wb.created = new Date();

    const ws = wb.addWorksheet("New Opportunity Form", { views: [{ showGridLines: false }] });
    ws.columns = [
      { width: 2 }, { width: 32 }, { width: 24 }, { width: 2 },
      { width: 28 }, { width: 24 }, { width: 2 }, { width: 2 },
      { width: 22 }, { width: 4 }, { width: 4 }, { width: 20 },
    ];

    function sectionHeader(range, text) {
      ws.mergeCells(range);
      const cell = ws.getCell(range.split(":")[0]);
      cell.value = text;
      cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK } };
      cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      ws.getRow(Number(range.match(/\d+/)[0])).height = 20;
    }

    function labelCell(coord, text) {
      const cell = ws.getCell(coord);
      cell.value = text;
      cell.font = { bold: true, size: 9.5, color: { argb: "FF1A2230" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREY } };
      cell.alignment = { vertical: "middle", wrapText: true, indent: 1 };
      cell.border = BORDER;
    }

    function valueCell(coord, field) {
      const cell = ws.getCell(coord);
      const raw = data[field.id];
      cell.font = { size: 10 };
      cell.alignment = { vertical: "middle", indent: 1 };
      cell.border = BORDER;
      if (raw === undefined || raw === null || raw === "") {
        cell.value = null;
        return;
      }
      if (field.type === "date") {
        cell.value = new Date(raw + "T00:00:00");
        cell.numFmt = "mm/dd/yyyy";
      } else if (field.type === "currency") {
        const n = Number(raw);
        cell.value = Number.isFinite(n) ? n : raw;
        cell.numFmt = '"$"#,##0';
      } else if (field.type === "number") {
        const n = Number(raw);
        cell.value = Number.isFinite(n) ? n : raw;
        cell.numFmt = "#,##0";
      } else {
        cell.value = raw;
      }
    }

    ws.mergeCells("B1:F1");
    ws.getCell("B1").value = "New Opportunity Form";
    ws.getCell("B1").font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    ws.getCell("B1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK } };
    ws.getCell("B1").alignment = { vertical: "middle", indent: 1 };
    ws.mergeCells("I1:L1");
    ws.getCell("I1").value = "Exported from the CM Startup Board — " + formatDate(new Date());
    ws.getCell("I1").font = { italic: true, size: 9, color: { argb: "FF667085" } };
    ws.getRow(1).height = 22;

    sectionHeader("B3:F3", "General Information");
    NOF_GENERAL_ROWS.forEach((row) => {
      if (row.left) { labelCell(row.left.labelCell, row.left.label); valueCell(row.left.valueCell, row.left); }
      if (row.right) { labelCell(row.right.labelCell, row.right.label); valueCell(row.right.valueCell, row.right); }
    });

    sectionHeader("B14:C14", "Owner Information");
    sectionHeader("E14:F14", "AEC Information");
    NOF_OWNER_AEC_ROWS.forEach((row) => {
      if (row.left) { labelCell(row.left.labelCell, row.left.label); valueCell(row.left.valueCell, row.left); }
      if (row.right) { labelCell(row.right.labelCell, row.right.label); valueCell(row.right.valueCell, row.right); }
    });

    sectionHeader("B28:F28", "Opportunity Description & Notes");
    ws.mergeCells("B29:F32");
    const descCell = ws.getCell("B29");
    descCell.value = data.description || "";
    descCell.font = { size: 10 };
    descCell.alignment = { vertical: "top", horizontal: "left", wrapText: true, indent: 1 };
    descCell.border = BORDER;

    ws.getCell("I10").value = "Finance Team Contacts";
    ws.getCell("I10").font = { bold: true, size: 10 };
    NOF_FINANCE_CONTACTS.forEach((c, i) => {
      const r = 11 + i;
      ws.getCell(`I${r}`).value = c.region;
      ws.getCell(`I${r}`).font = { size: 9.5 };
      ws.getCell(`L${r}`).value = c.name;
      ws.getCell(`L${r}`).font = { size: 9.5 };
    });

    const buffer = await wb.xlsx.writeBuffer();
    return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  function renderSubList(subItems) {
    const ul = document.createElement("ul");
    ul.className = "sub-list";
    subItems.forEach((sub) => {
      const li = document.createElement("li");
      li.textContent = sub.text;
      if (sub.link) {
        li.appendChild(document.createTextNode(" "));
        const a = document.createElement("a");
        a.href = sub.link;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "(link)";
        li.appendChild(a);
      }
      if (sub.sub && sub.sub.length) {
        li.appendChild(renderSubList(sub.sub));
      }
      ul.appendChild(li);
    });
    return ul;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }
})();
