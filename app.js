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

  const opportunityDialog = document.getElementById("opportunityDialog");
  const opportunityFormBody = document.getElementById("opportunityFormBody");
  const opportunityProjectName = document.getElementById("opportunityProjectName");
  const opportunityProgress = document.getElementById("opportunityProgress");

  let editingProjectId = null;
  let opportunityProjectId = null;

  init();

  function init() {
    LOCATIONS.forEach((loc) => fieldLocation.add(new Option(loc, loc)));
    DELIVERY_METHODS.forEach((dm) => fieldDelivery.add(new Option(dm, dm)));

    document.getElementById("newProjectBtn").addEventListener("click", openNewProjectDialog);
    document.getElementById("cancelProjectBtn").addEventListener("click", () => dialog.close());
    projectForm.addEventListener("submit", handleProjectFormSubmit);

    document.getElementById("closeOpportunityBtn").addEventListener("click", () => opportunityDialog.close());
    document.getElementById("saveOpportunityBtn").addEventListener("click", () => opportunityDialog.close());
    document.getElementById("exportOpportunityBtn").addEventListener("click", handleExportOpportunity);
    opportunityDialog.addEventListener("close", () => {
      renderProjectList();
      renderActiveProject();
    });

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
    editingProjectId = null;
    dialogTitle.textContent = "New Project";
    projectForm.reset();
    fieldActivateDate.value = todayIso();
    dialog.showModal();
  }

  function openEditProjectDialog(project) {
    editingProjectId = project.id;
    dialogTitle.textContent = "Edit Project";
    fieldName.value = project.name;
    fieldLocation.value = project.location;
    fieldDelivery.value = project.deliveryMethod;
    fieldTeamLead.value = project.teamLead || "";
    fieldActivateDate.value = project.activateDate;
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
    } else {
      const project = {
        id: "proj_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: fieldName.value.trim(),
        location: fieldLocation.value,
        deliveryMethod: fieldDelivery.value,
        teamLead: fieldTeamLead.value.trim(),
        activateDate: fieldActivateDate.value,
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

  function countPhaseItems(phase) {
    return phase.items.length;
  }

  function countPhaseChecked(phase, checked) {
    return phase.items.filter((item) => checked[item.id]).length;
  }

  function computeOverallProgress(project) {
    let total = 0;
    let done = 0;
    CHECKLIST_PHASES.forEach((phase) => {
      total += countPhaseItems(phase);
      done += countPhaseChecked(phase, project.checked || {});
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
    const checkedCount = countPhaseChecked(phase, project.checked || {});
    const total = countPhaseItems(phase);
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
    const total = countPhaseItems(phase);
    const done = countPhaseChecked(phase, checked);
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

    const bodyEl = document.createElement("div");
    bodyEl.className = "phase-body";
    bodyEl.hidden = !isExpanded;

    let lastGroup = undefined;
    phase.items.forEach((item) => {
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

    return wrap;
  }

  // ---------- New Opportunity Form ----------

  function countOpportunityFieldsFilled(project) {
    const data = project.opportunity || {};
    const filled = NOF_ALL_FIELDS.filter((f) => {
      const v = data[f.id];
      return v !== undefined && v !== null && String(v).trim() !== "";
    }).length;
    return { filled, total: NOF_ALL_FIELDS.length };
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
    const progress = document.createElement("span");
    progress.className = "nof-progress-inline";
    progress.textContent = filled > 0 ? `${filled}/${total} fields filled` : `${total} fields — not started`;

    wrap.appendChild(btn);
    wrap.appendChild(progress);
    return wrap;
  }

  function applyOpportunityDefaults(project) {
    project.opportunity = project.opportunity || {};
    const data = project.opportunity;
    if (data.formDate === undefined) data.formDate = todayIso();
    if (data.officeLocation === undefined) data.officeLocation = NOF_OFFICE_CODES[project.location] || "";
    if (data.deliveryMethodNOF === undefined) {
      data.deliveryMethodNOF = project.deliveryMethod === "Hard Bid" ? "Hard Bid" : project.deliveryMethod ? "CM" : "";
    }
    if (data.pcPoManager === undefined) {
      data.pcPoManager = NOF_STAFF_OPTIONS.includes(project.teamLead) ? project.teamLead : "";
    }
    if (data.dateOwnerProject === undefined) {
      data.dateOwnerProject = `${project.activateDate} — [Owner] — ${project.name}`;
    }
  }

  function openOpportunityDialog(project) {
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
    opportunityProgress.textContent = `${filled} of ${total} fields filled`;
  }

  function renderOpportunityBody(project) {
    opportunityFormBody.innerHTML = "";

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

    input.id = "nof_" + field.id;
    input.addEventListener("input", () => {
      data[field.id] = input.value;
      saveState();
      updateOpportunityProgressLabel(project);
    });
    if (field.type === "select") {
      input.addEventListener("change", () => {
        data[field.id] = input.value;
        saveState();
        updateOpportunityProgressLabel(project);
      });
    }

    label.appendChild(input);
    wrap.appendChild(label);
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
