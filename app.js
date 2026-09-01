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

  let editingProjectId = null;

  init();

  function init() {
    LOCATIONS.forEach((loc) => fieldLocation.add(new Option(loc, loc)));
    DELIVERY_METHODS.forEach((dm) => fieldDelivery.add(new Option(dm, dm)));

    document.getElementById("newProjectBtn").addEventListener("click", openNewProjectDialog);
    document.getElementById("cancelProjectBtn").addEventListener("click", () => dialog.close());
    projectForm.addEventListener("submit", handleProjectFormSubmit);

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
        <span class="phase-title">${escapeHtml(phase.name)}</span>
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

    phase.items.forEach((item) => {
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

    return wrap;
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
