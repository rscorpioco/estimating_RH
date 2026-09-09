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
  const fieldClientDueDate = document.getElementById("fieldClientDueDate");

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

  const levelDialog = document.getElementById("levelDialog");
  const levelProjectName = document.getElementById("levelProjectName");
  const levelBody = document.getElementById("levelBody");
  const levelProgress = document.getElementById("levelProgress");

  const teamDialog = document.getElementById("teamDialog");
  const teamBody = document.getElementById("teamBody");

  const pdpoDialog = document.getElementById("pdpoDialog");
  const pdpoProjectName = document.getElementById("pdpoProjectName");
  const pdpoBody = document.getElementById("pdpoBody");
  const pdpoProgress = document.getElementById("pdpoProgress");

  const preconDialog = document.getElementById("preconDialog");
  const preconProjectName = document.getElementById("preconProjectName");
  const preconBody = document.getElementById("preconBody");
  const preconProgress = document.getElementById("preconProgress");

  const bondDialog = document.getElementById("bondDialog");
  const bondProjectName = document.getElementById("bondProjectName");
  const bondBody = document.getElementById("bondBody");
  const bondProgress = document.getElementById("bondProgress");

  const buildersRiskDialog = document.getElementById("buildersRiskDialog");
  const buildersRiskProjectName = document.getElementById("buildersRiskProjectName");
  const buildersRiskBody = document.getElementById("buildersRiskBody");
  const buildersRiskProgress = document.getElementById("buildersRiskProgress");

  const miniDialog = document.getElementById("miniDialog");
  const miniDialogForm = document.getElementById("miniDialogForm");
  const miniDialogMessage = document.getElementById("miniDialogMessage");
  const miniDialogInput = document.getElementById("miniDialogInput");
  const miniDialogCancelBtn = document.getElementById("miniDialogCancelBtn");
  const miniDialogOkBtn = document.getElementById("miniDialogOkBtn");

  // Stand-in for window.alert/confirm/prompt — those are silently no-ops when this page runs
  // inside a sandboxed iframe (no "allow-modals"), which made buttons like "Remove" and
  // "+ Add" across the app look like they were doing nothing. Nests on top of whatever dialog
  // is already open, the same way the doc-viewer dialogs nest on top of theirs.
  function miniDialogAsk({ message, withInput = false, placeholder = "", defaultValue = "", okLabel = "OK", showCancel = true, danger = false }) {
    return new Promise((resolve) => {
      miniDialogMessage.textContent = message;
      miniDialogInput.hidden = !withInput;
      miniDialogInput.placeholder = placeholder;
      miniDialogInput.value = defaultValue;
      miniDialogOkBtn.textContent = okLabel;
      miniDialogOkBtn.classList.toggle("btn-danger", danger);
      miniDialogCancelBtn.hidden = !showCancel;
      miniDialog.returnValue = "";
      miniDialog.showModal();
      if (withInput) { miniDialogInput.focus(); miniDialogInput.select(); }

      function onClose() {
        miniDialog.removeEventListener("close", onClose);
        const ok = miniDialog.returnValue === "ok";
        resolve(ok ? (withInput ? miniDialogInput.value : true) : (withInput ? null : false));
      }
      miniDialog.addEventListener("close", onClose);
    });
  }

  function miniAlert(message) {
    return miniDialogAsk({ message, showCancel: false });
  }
  function miniConfirm(message, { okLabel = "OK", danger = false } = {}) {
    return miniDialogAsk({ message, okLabel, danger });
  }
  function miniPrompt(message, { placeholder = "", defaultValue = "", okLabel = "OK" } = {}) {
    return miniDialogAsk({ message, withInput: true, placeholder, defaultValue, okLabel });
  }

  let editingProjectId = null;
  let opportunityProjectId = null;
  let kickoffProjectId = null;
  let levelProjectId = null;
  let pdpoProjectId = null;
  let preconProjectId = null;
  let bondProjectId = null;
  let buildersRiskProjectId = null;
  // The Kickoff Package's rendered page thumbnails, each page's tagged category, and the parsed
  // pdf.js document (kept around so the zoom view can re-render any page on demand) — generated
  // from the central Drawings upload below, held in memory only (not persisted to localStorage
  // — a drawing set can be many MB), keyed by projectId. Regenerated after a reload once
  // Drawings are re-attached.
  const kickoffPageThumbnails = new Map();
  const kickoffPageAssignments = new Map();
  const kickoffPdfDocs = new Map();
  let kickoffZoomState = { projectId: null, pageIndex: 0 };

  // One shared set of Drawings / Specifications / Contract uploads per project, at the top of
  // the page, ahead of every form that reads from them — same in-memory-only treatment as the
  // Kickoff thumbnails above (not persisted; only the field values pulled from them are saved).
  // Keyed by `${projectId}:${slotId}`.
  const DOCUMENT_SLOTS = [
    { id: "drawings", label: "Drawings" },
    { id: "specifications", label: "Specifications" },
    { id: "contract", label: "Contract" },
  ];
  const projectDocuments = new Map();
  // Drawings and/or Specifications changing re-runs extraction across whichever of the two are
  // currently attached, combined — a company/address block or a "Label: Value" line can live in
  // either one, so both get scanned together rather than treated as separate documents.
  const documentExtractionResults = new Map();
  let nofDocViewerState = { projectId: null, slotId: null, pageIndex: 0 };

  function documentKey(projectId, slotId) {
    return projectId + ":" + slotId;
  }
  function getProjectDocument(project, slotId) {
    return projectDocuments.get(documentKey(project.id, slotId));
  }

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

  function joinCoAndName(co, name) {
    if (co && name) return `${co} (${name})`;
    return co || name || "";
  }

  // The Kickoff / Bid Day Package asks for the same AEC info as the New Opportunity Form's
  // Owner/AEC section, just condensed to one line per discipline — so it's auto-filled from
  // the opportunity data (Rachel's ask: fill it out once, not twice) using the same
  // linked/badge/override pattern as NOF_LINKED_FIELDS above.
  const KICKOFF_LINKED_FIELDS = {
    projectAddress: (project) => {
      const data = project.opportunity || {};
      return [data.jobsiteAddress, data.jobsiteCityStateZip].filter(Boolean).join(", ");
    },
    architect: (project) => {
      const data = project.opportunity || {};
      return joinCoAndName(data.architectCo, data.architectContactName);
    },
    structural: (project) => {
      const data = project.opportunity || {};
      return joinCoAndName(data.structuralEngineerCo, data.structuralEngineerName);
    },
    mep: (project) => {
      const data = project.opportunity || {};
      return joinCoAndName(data.mepfpEngineerCo, data.mepfpEngineerName);
    },
    civilLandscape: (project) => {
      const data = project.opportunity || {};
      const civil = joinCoAndName(data.civilEngineerCo, data.civilEngineerName);
      const landscape = joinCoAndName(data.landscapeArchitectCo, data.landscapeArchitectName);
      if (civil && landscape) return `Civil: ${civil} / Landscape: ${landscape}`;
      return civil || landscape || "";
    },
  };

  // Fields we attempt to pull out of the uploaded conformed set via a best-effort text scan
  // (label-matching, not real comprehension) — see extractNofFieldsFromText below. The same
  // labels are expected to appear regardless of drawing stage (Conceptual, Schematic Design,
  // Design Development, or Construction Documents) — only how much else is on the sheet
  // changes. Declared here for the same reason as NOF_LINKED_FIELDS above.
  const NOF_EXTRACTION_RULES = [
    { fieldId: "jobsiteAddress", labels: ["Project Address", "Site Address", "Property Address", "Project Location"] },
    { fieldId: "projectSqFt", labels: ["Gross Square Footage", "Gross Floor Area", "Building Square Footage", "GSF"], type: "number" },

    { fieldId: "ownerCompany", labels: ["Owner", "Client"] },
    { fieldId: "ownerContactName", labels: ["Owner Contact", "Owner's Contact", "Owner Name"] },
    { fieldId: "ownerAddress", labels: ["Owner Address"] },
    { fieldId: "ownerCityStateZip", labels: ["Owner City, State ZIP", "Owner City State Zip", "Owner City/State/Zip"] },
    { fieldId: "ownerPhone", labels: ["Owner Phone", "Owner Tel", "Owner Telephone"] },
    { fieldId: "ownerEmail", labels: ["Owner Email"] },
    { fieldId: "ownersRepName", labels: ["Owner's Representative", "Owner Representative", "Owner's Rep", "Owner Rep"] },
    { fieldId: "ownersRepPhone", labels: ["Owner's Rep Phone", "Owner Rep Phone", "Owner's Representative Phone"] },
    { fieldId: "ownersRepEmail", labels: ["Owner's Rep Email", "Owner Rep Email", "Owner's Representative Email"] },

    { fieldId: "architectCo", labels: ["Architect", "Architect of Record"] },
    { fieldId: "architectContactName", labels: ["Architect Contact", "Project Architect", "Architect of Record Contact", "Architect Name"] },
    { fieldId: "architectAddress", labels: ["Architect Address"] },
    { fieldId: "architectCityStateZip", labels: ["Architect City, State ZIP", "Architect City State Zip", "Architect City/State/Zip"] },
    { fieldId: "architectPhone", labels: ["Architect Phone", "Architect Tel", "Architect Telephone"] },
    { fieldId: "architectEmail", labels: ["Architect Email"] },

    { fieldId: "civilEngineerCo", labels: ["Civil Engineer"] },
    { fieldId: "civilEngineerName", labels: ["Civil Engineer Contact", "Civil Contact"] },

    { fieldId: "structuralEngineerCo", labels: ["Structural Engineer"] },
    { fieldId: "structuralEngineerName", labels: ["Structural Engineer Contact", "Structural Contact"] },

    { fieldId: "mepfpEngineerCo", labels: ["MEP Engineer", "MEPFP Engineer", "Mechanical Engineer"] },
    { fieldId: "mepfpEngineerName", labels: ["MEP Engineer Contact", "MEPFP Engineer Contact", "Mechanical Engineer Contact"] },

    { fieldId: "landscapeArchitectCo", labels: ["Landscape Architect"] },
    { fieldId: "landscapeArchitectName", labels: ["Landscape Architect Contact", "Landscape Contact"] },

    { fieldId: "interiorDesignerCo", labels: ["Interior Designer"] },
    { fieldId: "interiorDesignerName", labels: ["Interior Designer Contact", "Interior Design Contact"] },

    { fieldId: "estStartDate", labels: ["Date of Commencement", "Commencement Date", "Start Date"], type: "date" },
    { fieldId: "estCompletionDate", labels: ["Date of Substantial Completion", "Substantial Completion Date", "Completion Date"], type: "date" },
    { fieldId: "bidDate", labels: ["Bid Date", "Date of Bid"], type: "date" },
    { fieldId: "estProjectValue", labels: ["Contract Sum", "Contract Price", "Guaranteed Maximum Price", "GMP Amount", "Total Contract Amount", "Not To Exceed Amount"], type: "currency" },
  ];
  // "contractType" is matched separately (a document-wide keyword scan, not a labeled line —
  // see extractNofFieldsFromText) and "dateOwnerProject" gets its Owner name spliced in by
  // processConformedSetUpload rather than matched directly, so both need adding by hand here.
  const NOF_EXTRACTABLE_FIELD_IDS = new Set([...NOF_EXTRACTION_RULES.map((r) => r.fieldId), "contractType", "dateOwnerProject"]);

  init();

  // All dialogs are native <dialog> elements shown via showModal(), which does NOT close
  // any other already-open dialog — without this, opening a second one stacks on top of the
  // first, and closing the top one leaves the other sitting there looking "stuck" open.
  function closeAllDialogs(except) {
    [dialog, opportunityDialog, scheduleDialog, kickoffDialog, kickoffZoomDialog, nofDocViewerDialog, levelDialog, teamDialog, pdpoDialog, preconDialog, bondDialog, buildersRiskDialog].forEach((d) => {
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

    document.getElementById("closeLevelBtn").addEventListener("click", () => levelDialog.close());
    document.getElementById("exportLevelBtn").addEventListener("click", handleExportLevelAssignments);
    levelDialog.addEventListener("close", () => {
      renderProjectList();
      renderActiveProject();
    });

    document.getElementById("teamMembersBtn").addEventListener("click", openTeamDialog);
    document.getElementById("closeTeamBtn").addEventListener("click", () => teamDialog.close());
    document.getElementById("closeTeamBtn2").addEventListener("click", () => teamDialog.close());

    document.getElementById("closePdpoBtn").addEventListener("click", () => pdpoDialog.close());
    document.getElementById("closePdpoBtn2").addEventListener("click", () => pdpoDialog.close());
    pdpoDialog.addEventListener("close", () => {
      renderProjectList();
      renderActiveProject();
    });

    document.getElementById("closePreconBtn").addEventListener("click", () => preconDialog.close());
    document.getElementById("exportPreconBtn").addEventListener("click", handleExportPrecon);
    preconDialog.addEventListener("close", () => {
      renderProjectList();
      renderActiveProject();
    });

    document.getElementById("closeBondBtn").addEventListener("click", () => bondDialog.close());
    document.getElementById("exportBondBtn").addEventListener("click", handleExportBond);
    bondDialog.addEventListener("close", () => {
      renderProjectList();
      renderActiveProject();
    });

    document.getElementById("closeBuildersRiskBtn").addEventListener("click", () => buildersRiskDialog.close());
    document.getElementById("exportBuildersRiskBtn").addEventListener("click", handleExportBuildersRisk);
    buildersRiskDialog.addEventListener("close", () => {
      renderProjectList();
      renderActiveProject();
    });

    renderProjectList();
    renderActiveProject();
  }

  function loadState() {
    let loaded = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to load saved state", e);
    }
    if (!loaded) loaded = { projects: [], activeProjectId: null, expandedPhases: {} };
    if (!loaded.expandedPhases) loaded.expandedPhases = {};
    // Seed the editable team roster on first run, and for anyone loading state saved before
    // this feature existed — a deep copy so edits never mutate the seed constant itself.
    if (!loaded.teamRoster) loaded.teamRoster = JSON.parse(JSON.stringify(TEAM_ROSTER_SEED));
    return loaded;
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
    fieldClientDueDate.value = project.clientDueDate || "";
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
      project.clientDueDate = fieldClientDueDate.value || "";
    } else {
      const project = {
        id: "proj_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: fieldName.value.trim(),
        location: fieldLocation.value,
        deliveryMethod: fieldDelivery.value,
        teamLead: fieldTeamLead.value.trim(),
        activateDate: fieldActivateDate.value,
        bidDueDate: fieldBidDueDate.value || "",
        clientDueDate: fieldClientDueDate.value || "",
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

  async function deleteProject(projectId) {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return;
    const ok = await miniConfirm(`Delete "${project.name}"? This cannot be undone.`, { okLabel: "Delete", danger: true });
    if (!ok) return;
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
    if (item.condition === "HasContract") return !!project.contractUploaded;
    if (item.condition === "NoContract") return !project.contractUploaded;
    if (item.condition === "HasDrawings") return !!getProjectDocument(project, "drawings");
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
    projectDetailEl.appendChild(renderDocumentsSection(project));

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
    projectDetailEl.appendChild(renderFormsSummary(project));

    CHECKLIST_PHASES.forEach((phase) => {
      projectDetailEl.appendChild(renderPhase(project, phase));
    });
  }

  // A one-glance view of every fill-out form on the project, regardless of which phase/day-group
  // it lives in — per Rachel's ask, so a form doesn't get lost in a long checklist and she can
  // jump straight to whichever one needs attention instead of hunting through phases for it.
  function renderFormsSummary(project) {
    const wrap = document.createElement("div");
    wrap.className = "forms-summary";

    const title = document.createElement("div");
    title.className = "forms-summary-title";
    title.textContent = "Forms";
    wrap.appendChild(title);

    const list = document.createElement("div");
    list.className = "forms-summary-list";

    const pdpo = countPdPoFieldsFilled(project);
    const level = countLevelCoverage(project);
    const kickoff = countKickoffProgress(project);
    const levelOrBid = project.deliveryMethod === "Hard Bid" ? "Bid Day" : "Level Day";
    const unlocked = isPrimaryFormStarted(project);

    const entries = [
      { label: "PD/PO Coordination", filled: pdpo.fieldsFilled, total: pdpo.fieldsTotal, onOpen: () => openPdPoDialog(project) },
    ];

    // Whichever of these is the active path for this project (see the "HasContract"/
    // "NoContract" checklist conditions) is the one shown here — not both at once.
    if (project.contractUploaded) {
      const precon = countPreconFieldsFilled(project);
      entries.push({ label: "Precon Start Up Form", filled: precon.filled, total: precon.total, onOpen: () => openPreconDialog(project) });
    } else {
      const nof = countOpportunityFieldsFilled(project);
      entries.push({ label: "New Opportunity Form", filled: nof.filled, total: nof.total, onOpen: () => openOpportunityDialog(project) });
    }

    entries.push(
      { label: `Kickoff / ${levelOrBid} Package`, filled: kickoff.fieldsFilled, total: kickoff.fieldsTotal, onOpen: () => openKickoffDialog(project) },
      { label: "6S Level Assignments & Bid Packages", filled: level.assignedTrades, total: level.totalTrades, onOpen: () => openLevelDialog(project) },
    );

    if (unlocked) {
      const bond = countBondFieldsFilled(project);
      const buildersRisk = countBuildersRiskFieldsFilled(project);
      entries.push(
        { label: "Bond Request", filled: bond.filled, total: bond.total, onOpen: () => openBondDialog(project) },
        { label: "Builder's Risk Request", filled: buildersRisk.filled, total: buildersRisk.total, onOpen: () => openBuildersRiskDialog(project) },
      );
    }

    entries.forEach((entry) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "forms-summary-item";
      const started = entry.filled > 0;
      const complete = entry.total > 0 && entry.filled >= entry.total;
      item.classList.toggle("complete", complete);
      item.classList.toggle("started", started && !complete);
      item.classList.toggle("not-started", !started);
      item.innerHTML = `
        <span class="forms-summary-item-label">${escapeHtml(entry.label)}</span>
        <span class="forms-summary-item-progress">${entry.filled}/${entry.total}</span>
      `;
      item.addEventListener("click", entry.onOpen);
      list.appendChild(item);
    });

    wrap.appendChild(list);

    if (!unlocked) {
      const lockedNote = document.createElement("p");
      lockedNote.className = "pdpo-linked-note";
      lockedNote.textContent = "Bond Request and Builder's Risk Request will show up here once the New Opportunity Form or Precon Start Up Form has been started.";
      wrap.appendChild(lockedNote);
    }

    return wrap;
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

    if (item.id === "act-pdpo-coordination") {
      wrap.appendChild(renderPdPoCoordinationAffordance(project));
    }

    if (item.id === "act-1") {
      wrap.appendChild(renderOpportunityFormAffordance(project));
    }

    if (item.id === "act-1-precon") {
      wrap.appendChild(renderPreconFormAffordance(project));
    }

    if (item.id === "act-6slevel") {
      wrap.appendChild(renderLevelAssignmentsAffordance(project));
    }

    if (item.id === "act-kickoff") {
      wrap.appendChild(renderKickoffAffordance(project));
    }

    if (item.id === "act-bond") {
      wrap.appendChild(renderBondRequestAffordance(project));
    }

    if (item.id === "act-buildersrisk") {
      wrap.appendChild(renderBuildersRiskAffordance(project));
    }

    return wrap;
  }

  // ---------- Meeting & Task Schedule ----------

  // Each rule's `anchor` names which project date it's computed from; `null`/undefined means
  // there's no formula (e.g. a site visit date that depends on the ITB, not a fixed offset) —
  // those rows just carry a reminder instead of a computed date.
  function getScheduleAnchorDate(project, anchor) {
    if (anchor === "activate") return project.activateDate;
    if (anchor === "bidDue") return project.bidDueDate;
    if (anchor === "clientDue") return project.clientDueDate;
    if (anchor === "levelApproved") return (project.levelAssignments && project.levelAssignments.approvedDate) || "";
    return "";
  }

  function scheduleAnchorMissingLabel(rule) {
    if (rule.anchor === "bidDue") return "— set a Bid Due Date to compute";
    if (rule.anchor === "clientDue") return "— set a Client Deliverable Due Date to compute";
    if (rule.anchor === "levelApproved") return "— set the Level Assignments Approved Date to compute (in 6S Level Assignments)";
    if (rule.anchor === "activate") return "— missing Activate Date";
    // No anchor at all — either it's a send-anytime action with no fixed date (email-only rules)
    // or it depends on something the app can't compute (e.g. a site visit date from the ITB).
    if ((rule.actions || ["calendar"]).includes("calendar")) return "— check the ITB, add manually";
    return "— send anytime";
  }

  function computeSchedule(project) {
    return SCHEDULE_RULES.filter((rule) => itemApplies(rule, project)).map((rule) => {
      const anchorDate = getScheduleAnchorDate(project, rule.anchor);
      if (!anchorDate) {
        return { rule, date: null, dateLabel: scheduleAnchorMissingLabel(rule) };
      }
      const date = addDays(anchorDate, rule.offsetDays || 0);
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

  // Same idea as buildOutlookDeepLink but for a plain email (Outlook Web "compose mail") —
  // used for the send-this-form actions (New Opportunity Form, Precon, Bond, Builder's Risk,
  // 6S Leveling) instead of a calendar invite. Nothing can attach the exported file for the
  // user (a static page can't reach into Outlook's compose window that way), so attachHint just
  // reminds them to grab it from the relevant form's Export button first.
  function buildOutlookMailDeepLink(rule, label, project) {
    const bodyParts = [rule.emailBody || rule.note || ""];
    if (rule.attachHint) bodyParts.push(rule.attachHint);
    const params = new URLSearchParams({
      subject: `${rule.emailSubject || label} — ${project.name}`,
      body: bodyParts.filter(Boolean).join("\n\n"),
    });
    if (rule.to && rule.to.length) params.set("to", rule.to.join(";"));
    return "https://outlook.office.com/mail/deeplink/compose?" + params.toString();
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
        <td class="schedule-actions-cell"></td>
      `;
      const actionsCell = tr.lastElementChild;
      const actions = rule.actions || ["calendar"];

      if (actions.includes("calendar")) {
        const link = buildOutlookDeepLink(rule, date, label);
        if (link) {
          const a = document.createElement("a");
          a.href = link;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.className = "btn btn-sm outlook-add-btn";
          a.textContent = "+ Outlook";
          actionsCell.appendChild(a);
        }
      }
      if (actions.includes("email")) {
        const mailLink = buildOutlookMailDeepLink(rule, label, project);
        const a = document.createElement("a");
        a.href = mailLink;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "btn btn-sm outlook-add-btn";
        a.textContent = "Email";
        actionsCell.appendChild(a);
      }
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    scheduleBody.appendChild(table);

    const note = document.createElement("p");
    note.className = "schedule-note";
    note.textContent = "\"+ Outlook\" opens a prefilled calendar event and \"Email\" opens a prefilled message, both in Outlook Web — review either and click Send/Save there; nothing goes out until you do. Attendees are only filled in where an email is already known (e.g. Aaron Rogers) — add the rest yourself. Email actions that reference an attachment (a form or the 6S Leveling export) don't attach anything automatically — export the file first and attach it in Outlook before sending.";
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
      hasFile: !!getProjectDocument(project, "drawings"),
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

  function applyKickoffDefaults(project) {
    project.kickoffPackage = project.kickoffPackage || {};
    const data = project.kickoffPackage;
    data._linked = data._linked || {};
    Object.keys(KICKOFF_LINKED_FIELDS).forEach((id) => {
      if (data[id] === undefined || data._linked[id]) {
        data[id] = KICKOFF_LINKED_FIELDS[id](project);
        data._linked[id] = true;
      }
    });
  }

  function openKickoffDialog(project) {
    closeAllDialogs(kickoffDialog);
    kickoffProjectId = project.id;
    applyKickoffDefaults(project);
    saveState();
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

    const note = document.createElement("p");
    note.className = "nof-doc-intro";
    const drawingsDoc = getProjectDocument(project, "drawings");
    note.textContent = drawingsDoc
      ? `Using the Drawings uploaded at the top of the page (${drawingsDoc.sourceNames.length > 1 ? drawingsDoc.sourceNames.join(" + ") : drawingsDoc.file.name}, ${drawingsDoc.numPages} pages).`
      : "No Drawings uploaded yet — upload them in the Documents section at the top of the page and they'll show up here automatically.";
    kickoffBody.appendChild(note);

    const grid = document.createElement("div");
    grid.className = "kickoff-thumb-grid";
    grid.id = "kickoffThumbGrid";
    kickoffBody.appendChild(grid);

    const cachedThumbs = kickoffPageThumbnails.get(project.id);
    if (drawingsDoc && cachedThumbs) {
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

  // Called once right after Drawings are (re)uploaded in the central Documents section, so the
  // thumbnails are already there by the time the Kickoff dialog is opened.
  async function ensureKickoffThumbnailsFromDrawings(project) {
    const doc = getProjectDocument(project, "drawings");
    if (!doc) return;
    await generateKickoffThumbnails(project, doc.pdfDoc);
  }

  async function generateKickoffThumbnails(project, pdf) {
    kickoffPdfDocs.set(project.id, pdf);
    kickoffPageAssignments.set(project.id, new Array(pdf.numPages).fill(""));

    const grid = document.getElementById("kickoffThumbGrid");
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
      if (grid) grid.appendChild(renderKickoffThumbCell(project, pageNum - 1, dataUrl));
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

    const isLinkable = !!KICKOFF_LINKED_FIELDS[field.id];
    let autoBadge = null;
    if (isLinkable) {
      autoBadge = document.createElement("span");
      labelText.appendChild(autoBadge);
    }

    function refreshBadge() {
      if (!autoBadge) return;
      if (data._linked && data._linked[field.id]) {
        autoBadge.className = "nof-auto-badge";
        autoBadge.textContent = "Auto";
        autoBadge.title = "Filled in from the New Opportunity Form's Owner/AEC section — edit this field to override.";
        autoBadge.hidden = false;
      } else {
        autoBadge.hidden = true;
      }
    }
    refreshBadge();

    const input = document.createElement(field.type === "textarea" ? "textarea" : "input");
    if (field.type !== "textarea") input.type = field.type;
    input.value = data[field.id] || "";
    input.id = "kickoff_" + field.id;
    input.addEventListener("input", () => {
      data[field.id] = input.value;
      if (isLinkable && data._linked && data._linked[field.id]) {
        data._linked[field.id] = false;
        refreshBadge();
      }
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

  // Blob-URL "<a download>" links are the normal browser download mechanism, but a published
  // Artifact's viewer sandbox blocks any download the page starts itself — so this tries the
  // platform's sanctioned `downloads` capability first (declared on this artifact) and only
  // falls back to the plain anchor-click trick when that's unavailable, e.g. running this same
  // file outside claude.ai (the standalone repo copy), where the sandbox doesn't apply.
  async function offerDownload(filename, blob) {
    if (typeof window !== "undefined" && window.claude && typeof window.claude.use === "function") {
      try {
        const downloads = await window.claude.use("downloads");
        if (downloads) {
          try {
            await downloads.save({ filename, data: blob });
          } catch (err) {
            if (!err || err.code !== "declined") {
              await miniAlert("Couldn't save the file: " + (err && err.message ? err.message : err));
            }
          }
          return;
        }
      } catch (e) {
        // downloads capability failed to resolve — fall through to the plain-link path below
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // Turns a raw stored field value into display text for a PDF export, the same way the old
  // xlsx exports formatted dates/currency/numbers — shared by every build*Pdf function below.
  function formatFieldValueForPdf(field, raw) {
    if (raw === undefined || raw === null || raw === "") return "";
    if (field.type === "date") {
      const d = new Date(raw + "T00:00:00");
      return isNaN(d.getTime()) ? String(raw) : formatDate(d);
    }
    if (field.type === "currency") {
      const n = Number(raw);
      return Number.isFinite(n) ? "$" + n.toLocaleString() : String(raw);
    }
    if (field.type === "number") {
      const n = Number(raw);
      return Number.isFinite(n) ? n.toLocaleString() : String(raw);
    }
    return String(raw);
  }

  // Clips text with a trailing "…" once it would no longer fit in maxWidth — used where a value
  // has to stay on one line (a dense two-column row) rather than wrap.
  function truncateToWidth(text, font, size, maxWidth) {
    if (maxWidth <= 0) return "";
    if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
    let result = text;
    while (result.length > 1 && font.widthOfTextAtSize(result + "…", size) > maxWidth) {
      result = result.slice(0, -1);
    }
    return result + "…";
  }

  // Shared layout helper for the form exports (NOF/Precon/Bond/Builder's Risk/Level) — same
  // plain pdf-lib approach as the Kickoff Package export's heading/fieldLine/wrappedBlock, with
  // automatic page-break handling added since these forms run well past one page.
  function createPdfFormBuilder(doc, font, boldFont) {
    const { rgb } = PDFLib;
    const PAGE_W = 612, PAGE_H = 792;
    const marginX = 50, marginTop = 742, bottomLimit = 50;
    const contentWidth = PAGE_W - marginX * 2;
    const ink = rgb(0.12, 0.14, 0.17);
    const muted = rgb(0.4, 0.44, 0.47);
    const navy = rgb(0.07, 0.19, 0.31);
    let page = doc.addPage([PAGE_W, PAGE_H]);
    let y = marginTop;

    function ensureSpace(needed) {
      if (y - needed < bottomLimit) {
        page = doc.addPage([PAGE_W, PAGE_H]);
        y = marginTop;
      }
    }

    function title(text) {
      ensureSpace(24);
      page.drawText(text, { x: marginX, y, size: 16, font: boldFont, color: navy });
      y -= 22;
    }

    function subtitle(text) {
      ensureSpace(16);
      page.drawText(text, { x: marginX, y, size: 10, font, color: muted });
      y -= 18;
    }

    function sectionBar(text) {
      ensureSpace(26);
      const h = 18;
      page.drawRectangle({ x: marginX, y: y - h + 5, width: contentWidth, height: h, color: navy });
      page.drawText(text.toUpperCase(), { x: marginX + 8, y: y - h + 10, size: 9, font: boldFont, color: rgb(1, 1, 1) });
      y -= h + 10;
    }

    function fieldLine(label, value, labelWidth) {
      ensureSpace(15);
      page.drawText(label, { x: marginX, y, size: 9.5, font: boldFont, color: ink });
      // A label longer than the requested column width would otherwise run straight into the
      // value — grow the value's start position to clear it, rather than truncating the label.
      const measuredLabelW = boldFont.widthOfTextAtSize(label, 9.5);
      const lw = Math.min(Math.max(labelWidth || 200, measuredLabelW + 10), contentWidth - 60);
      const valLines = wrapPdfText(value || "—", font, 9.5, contentWidth - lw);
      page.drawText(valLines[0] || "—", { x: marginX + lw, y, size: 9.5, font, color: ink });
      y -= 15;
      for (let i = 1; i < valLines.length; i++) {
        ensureSpace(13);
        page.drawText(valLines[i], { x: marginX + lw, y, size: 9.5, font, color: ink });
        y -= 13;
      }
    }

    function twoCol(leftLabel, leftValue, rightLabel, rightValue) {
      ensureSpace(15);
      const halfW = contentWidth / 2;
      const minGap = 8;
      page.drawText(leftLabel, { x: marginX, y, size: 9, font: boldFont, color: ink });
      const leftLabelW = boldFont.widthOfTextAtSize(leftLabel, 9);
      const leftValueX = marginX + Math.min(Math.max(130, leftLabelW + minGap), halfW - 20);
      const leftAvailWidth = marginX + halfW - leftValueX - 6;
      page.drawText(truncateToWidth(leftValue || "—", font, 9, leftAvailWidth), { x: leftValueX, y, size: 9, font, color: ink });
      if (rightLabel) {
        page.drawText(rightLabel, { x: marginX + halfW, y, size: 9, font: boldFont, color: ink });
        const rightLabelW = boldFont.widthOfTextAtSize(rightLabel, 9);
        const rightValueX = marginX + halfW + Math.min(Math.max(130, rightLabelW + minGap), halfW - 20);
        const rightAvailWidth = marginX + contentWidth - rightValueX;
        page.drawText(truncateToWidth(rightValue || "—", font, 9, rightAvailWidth), { x: rightValueX, y, size: 9, font, color: ink });
      }
      y -= 15;
    }

    function wrappedBlock(label, value, maxWidth) {
      ensureSpace(13);
      if (label) {
        page.drawText(label, { x: marginX, y, size: 9.5, font: boldFont, color: ink });
        y -= 13;
      }
      const lines = wrapPdfText(value || "—", font, 9.5, maxWidth || contentWidth - 10);
      lines.forEach((line) => {
        ensureSpace(13);
        page.drawText(line, { x: marginX + (label ? 10 : 0), y, size: 9.5, font, color: ink });
        y -= 13;
      });
      y -= 4;
    }

    function spacer(amount) { y -= (amount || 8); }

    function tableHeaderRow(cells, colXs) {
      ensureSpace(16);
      cells.forEach((c, i) => {
        page.drawText(c, { x: marginX + colXs[i], y, size: 8.5, font: boldFont, color: muted });
      });
      y -= 3;
      page.drawLine({ start: { x: marginX, y }, end: { x: marginX + contentWidth, y }, thickness: 0.75, color: rgb(0.8, 0.82, 0.85) });
      y -= 12;
    }

    function tableRow(cells, colXs) {
      ensureSpace(14);
      cells.forEach((c, i) => {
        const colEnd = i + 1 < colXs.length ? colXs[i + 1] : contentWidth;
        const availWidth = colEnd - colXs[i] - 6;
        page.drawText(truncateToWidth(String(c || ""), font, 9, availWidth), { x: marginX + colXs[i], y, size: 9, font, color: ink });
      });
      y -= 14;
    }

    return {
      ensureSpace, title, subtitle, sectionBar, fieldLine, twoCol, wrappedBlock, spacer,
      tableHeaderRow, tableRow, marginX, contentWidth,
    };
  }

  async function handleExportKickoff() {
    const project = state.projects.find((p) => p.id === kickoffProjectId);
    if (!project) return;

    if (typeof PDFLib === "undefined") {
      await miniAlert("The PDF library didn't load (check your internet connection) — your entries are still saved in the app.");
      return;
    }

    const exportBtn = document.getElementById("exportKickoffBtn");
    const originalLabel = exportBtn.textContent;
    exportBtn.disabled = true;
    exportBtn.textContent = "Building…";

    try {
      const bytes = await buildKickoffPackagePdf(project);
      const blob = new Blob([bytes], { type: "application/pdf" });
      await offerDownload(`${sanitizeFilename(project.name)}_Kickoff_Package.pdf`, blob);
    } catch (err) {
      await miniAlert("Couldn't build the package: " + (err && err.message ? err.message : err));
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

    const drawingsDoc = getProjectDocument(project, "drawings");
    const conformedFile = drawingsDoc && drawingsDoc.file;
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

  // ---------- Team Roster ----------
  // A company-wide, editable list of people with emails — Precon (everyone on it works every
  // project, regardless of office) plus one roster per office. This is what feeds the Level
  // Assignments Leveler/Captain dropdowns, and is the thing to keep current as people join or
  // leave rather than re-typing names/emails project by project.

  // Precon + the given project's own office roster — the actual pool of people assignable as
  // Leveler/Captain on this project. Falls back to an empty office list defensively; every
  // real LOCATIONS entry has a seeded roster, but a hand-edited/older save might not.
  function getAssignablePeople(project) {
    const roster = state.teamRoster;
    const office = (roster.byOffice && roster.byOffice[project.location]) || [];
    return [...roster.precon, ...office];
  }

  function findRosterPerson(project, name) {
    if (!name) return null;
    return getAssignablePeople(project).find((p) => p.name === name) || null;
  }

  function openTeamDialog() {
    closeAllDialogs(teamDialog);
    renderTeamBody();
    teamDialog.showModal();
  }

  function renderTeamBody() {
    teamBody.innerHTML = "";
    teamBody.appendChild(renderTeamGroupSection("Precon (every project, every office)", state.teamRoster.precon, null));
    LOCATIONS.forEach((loc) => {
      state.teamRoster.byOffice[loc] = state.teamRoster.byOffice[loc] || [];
      teamBody.appendChild(renderTeamGroupSection(loc, state.teamRoster.byOffice[loc], loc));
    });
  }

  // `officeKey` is null for the Precon group (list lives at state.teamRoster.precon) or a
  // LOCATIONS name for an office group (list lives at state.teamRoster.byOffice[officeKey]).
  function renderTeamGroupSection(title, people, officeKey) {
    const fragment = document.createDocumentFragment();

    const header = document.createElement("div");
    header.className = "nof-section-title";
    header.textContent = title;
    fragment.appendChild(header);

    const list = document.createElement("div");
    list.className = "team-person-list";
    people.forEach((person) => list.appendChild(renderTeamPersonRow(people, person, officeKey)));
    fragment.appendChild(list);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn btn-sm";
    addBtn.textContent = "+ Add Person";
    addBtn.addEventListener("click", () => {
      people.push({ name: "", title: "", phone: "", email: "" });
      saveState();
      renderTeamBody();
      const inputs = teamBody.querySelectorAll(".team-person-row:last-child input");
      if (inputs[0]) inputs[0].focus();
    });
    fragment.appendChild(addBtn);

    return fragment;
  }

  function renderTeamPersonRow(people, person, officeKey) {
    const row = document.createElement("div");
    row.className = "team-person-row";

    const fields = [
      { key: "name", placeholder: "Name" },
      { key: "title", placeholder: "Title" },
      { key: "phone", placeholder: "Phone" },
      { key: "email", placeholder: "Email" },
    ];
    fields.forEach((f) => {
      const input = document.createElement("input");
      input.type = f.key === "email" ? "email" : "text";
      input.placeholder = f.placeholder;
      input.value = person[f.key] || "";
      input.addEventListener("input", () => {
        person[f.key] = input.value;
        saveState();
      });
      row.appendChild(input);
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn-danger btn-sm";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", async () => {
      const ok = await miniConfirm(`Remove ${person.name || "this person"} from the roster?`, { okLabel: "Remove", danger: true });
      if (!ok) return;
      const idx = people.indexOf(person);
      if (idx !== -1) people.splice(idx, 1);
      saveState();
      renderTeamBody();
    });
    row.appendChild(removeBtn);

    return row;
  }

  const LEVEL_ADD_PERSON_VALUE = "__add_new__";

  function populateAssigneeOptions(select, project, unassignedLabel) {
    select.add(new Option(unassignedLabel, ""));
    getAssignablePeople(project).forEach((p) => select.add(new Option(p.name, p.name)));
    select.add(new Option("+ Add someone new…", LEVEL_ADD_PERSON_VALUE));
  }

  // Quick-add used from the Level Assignments dropdowns — adds straight to the current
  // project's office roster (or Precon) without leaving the dialog, per Rachel's ask to be
  // able to add someone manually right where she's assigning them.
  async function quickAddRosterPerson(project) {
    const name = await miniPrompt("Name of the new team member:");
    if (!name || !name.trim()) return null;
    const email = (await miniPrompt(`Email for ${name.trim()} (optional — leave blank to skip):`)) || "";
    const targetList = state.teamRoster.byOffice[project.location] || (state.teamRoster.byOffice[project.location] = []);
    const person = { name: name.trim(), title: "", phone: "", email: email.trim() };
    targetList.push(person);
    saveState();
    return person;
  }

  // ---------- PD/PO Coordination ----------

  function getPdPoCoordination(project) {
    project.pdpoCoordination = project.pdpoCoordination || { fields: {}, team: {} };
    project.pdpoCoordination.fields = project.pdpoCoordination.fields || {};
    project.pdpoCoordination.team = project.pdpoCoordination.team || {};
    return project.pdpoCoordination;
  }

  function countPdPoFieldsFilled(project) {
    const data = getPdPoCoordination(project);
    const fieldsFilled = PDPO_FIELDS.filter((f) => {
      const v = data.fields[f.id];
      return v !== undefined && v !== null && String(v).trim() !== "";
    }).length;
    const teamFilled = PDPO_TEAM_ROLES.filter((r) => data.team[r.id]).length;
    return {
      fieldsFilled: fieldsFilled + teamFilled,
      fieldsTotal: PDPO_FIELDS.length + PDPO_TEAM_ROLES.length,
    };
  }

  function renderPdPoCoordinationAffordance(project) {
    const wrap = document.createElement("div");
    wrap.className = "item-inline-actions";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm";
    btn.textContent = "Fill Out PD/PO Coordination";
    btn.addEventListener("click", () => openPdPoDialog(project));

    const { fieldsFilled, fieldsTotal } = countPdPoFieldsFilled(project);
    const hint = document.createElement("span");
    hint.className = "nof-progress-inline";
    hint.textContent = fieldsFilled > 0 ? `${fieldsFilled}/${fieldsTotal} fields filled` : `${fieldsTotal} fields — not started`;

    wrap.appendChild(btn);
    wrap.appendChild(hint);
    return wrap;
  }

  function openPdPoDialog(project) {
    closeAllDialogs(pdpoDialog);
    pdpoProjectId = project.id;
    pdpoProjectName.textContent = `${project.name} — ${project.location}`;
    renderPdPoBody(project);
    updatePdPoProgressLabel(project);
    pdpoDialog.showModal();
  }

  function updatePdPoProgressLabel(project) {
    const { fieldsFilled, fieldsTotal } = countPdPoFieldsFilled(project);
    pdpoProgress.textContent = `${fieldsFilled} of ${fieldsTotal} fields filled`;
  }

  function renderPdPoBody(project) {
    pdpoBody.innerHTML = "";

    let lastSection = null;
    let rowBuffer = [];
    const flushRow = () => {
      if (!rowBuffer.length) return;
      const rowEl = document.createElement("div");
      rowEl.className = "nof-row";
      rowEl.appendChild(rowBuffer[0]);
      rowEl.appendChild(rowBuffer[1] || emptyOpportunityField());
      pdpoBody.appendChild(rowEl);
      rowBuffer = [];
    };
    PDPO_FIELDS.forEach((field) => {
      if (field.section !== lastSection) {
        flushRow();
        const title = document.createElement("div");
        title.className = "nof-section-title";
        title.textContent = field.section;
        pdpoBody.appendChild(title);
        lastSection = field.section;
      }
      rowBuffer.push(renderPdPoField(project, field));
      if (rowBuffer.length === 2) flushRow();
    });
    flushRow();

    pdpoBody.appendChild(renderPdPoContactInfoSection(project));
    pdpoBody.appendChild(renderPdPoTeamSection(project));
  }

  function renderPdPoField(project, field) {
    const data = getPdPoCoordination(project).fields;
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
      input.type = field.type === "date" ? "date" : "text";
      input.value = data[field.id] || "";
    }
    input.id = "pdpo_" + field.id;
    input.addEventListener(field.type === "select" ? "change" : "input", () => {
      data[field.id] = input.value;
      saveState();
      updatePdPoProgressLabel(project);
    });

    label.appendChild(input);
    wrap.appendChild(label);
    return wrap;
  }

  // Architect/Engineer contact info is read straight off the New Opportunity Form's Owner/AEC
  // section (itself pulled from the Drawings/Specifications) rather than re-entered here — one
  // source of truth. Client is different: a drawing's "OWNER" callouts are almost never the
  // actual client party (they're a furnish/install responsibility marker), so Client is read
  // from the signed Contract specifically (runContractClientExtraction) once one's uploaded,
  // falling back to the Drawings/Specifications' Owner name before that.
  function renderPdPoContactInfoSection(project) {
    const wrap = document.createElement("div");

    const title = document.createElement("div");
    title.className = "nof-section-title";
    title.textContent = "Important Contact Information";
    wrap.appendChild(title);

    const opp = project.opportunity || {};
    const contractClient = project.contractClient || null;

    const note = document.createElement("p");
    note.className = "pdpo-linked-note";
    note.textContent = "Architect/Engineer info is pulled from the Drawings/Specifications (via the New Opportunity Form's Owner/AEC section). " +
      (contractClient
        ? "Client info is pulled from the signed Contract."
        : "Client info is pulled from the signed Contract once one's uploaded — until then it falls back to the Owner name found in the Drawings/Specifications.");
    wrap.appendChild(note);

    const clientCo = (contractClient && contractClient.ownerCompany) || opp.ownerCompany;
    const clientName = (contractClient && contractClient.ownerContactName) || opp.ownerContactName;
    const clientPhone = (contractClient && contractClient.ownerPhone) || opp.ownerPhone;
    const clientEmail = (contractClient && contractClient.ownerEmail) || opp.ownerEmail;
    const rows = [
      { label: "Client", co: clientCo, name: clientName, phone: clientPhone, email: clientEmail },
      { label: "Architect", co: opp.architectCo, name: opp.architectContactName, phone: opp.architectPhone, email: opp.architectEmail },
      { label: "Civil Engineer", co: opp.civilEngineerCo, name: opp.civilEngineerName },
      { label: "Structural Engineer", co: opp.structuralEngineerCo, name: opp.structuralEngineerName },
      { label: "MEPFP Engineer", co: opp.mepfpEngineerCo, name: opp.mepfpEngineerName },
    ];

    const list = document.createElement("div");
    list.className = "pdpo-contact-list";
    rows.forEach((r) => {
      const item = document.createElement("div");
      item.className = "pdpo-contact-item";
      const strong = document.createElement("strong");
      strong.textContent = r.label + ": ";
      item.appendChild(strong);
      const parts = [r.co, r.name, r.phone, r.email].filter(Boolean);
      item.appendChild(document.createTextNode(parts.length ? parts.join(" — ") : "Not filled in yet"));
      list.appendChild(item);
    });
    wrap.appendChild(list);
    return wrap;
  }

  // Scorpio team roles pick from the same office roster (Precon + the project's office) that
  // Level Assignments uses, with the same quick-add-a-new-person option, so it's one roster
  // shared everywhere rather than a separate list to maintain.
  function renderPdPoTeamSection(project) {
    const wrap = document.createElement("div");

    const title = document.createElement("div");
    title.className = "nof-section-title";
    title.textContent = "Scorpio Team";
    wrap.appendChild(title);

    const data = getPdPoCoordination(project).team;
    const grid = document.createElement("div");
    grid.className = "pdpo-team-grid";
    PDPO_TEAM_ROLES.forEach((role) => {
      const field = document.createElement("label");
      field.className = "pdpo-team-field";
      const labelText = document.createElement("span");
      labelText.textContent = role.label;
      field.appendChild(labelText);

      const select = document.createElement("select");
      populateAssigneeOptions(select, project, "— Unassigned —");
      select.value = data[role.id] || "";
      select.addEventListener("change", async () => {
        if (select.value === LEVEL_ADD_PERSON_VALUE) {
          const person = await quickAddRosterPerson(project);
          if (person) data[role.id] = person.name;
          else { select.value = data[role.id] || ""; return; }
          renderPdPoBody(project);
          updatePdPoProgressLabel(project);
          return;
        }
        data[role.id] = select.value;
        saveState();
        updatePdPoProgressLabel(project);
      });
      field.appendChild(select);
      grid.appendChild(field);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  // ---------- Precon Start Up Form ----------
  // Fills in for the New Opportunity Form once a signed Contract is uploaded (see the
  // "HasContract"/"NoContract" checklist conditions and itemApplies above).

  function getPrecon(project) {
    project.precon = project.precon || { fields: {}, sov: {} };
    project.precon.fields = project.precon.fields || {};
    project.precon.sov = project.precon.sov || {};
    return project.precon;
  }

  // Same "[Owner]" placeholder-and-swap pattern as the New Opportunity Form's dateOwnerProject
  // — runDocumentExtraction fills in the real owner name once Drawings/Specifications supply one.
  function applyPreconDefaults(project) {
    const data = getPrecon(project);
    if (data.projectIdentifier === undefined) {
      data.projectIdentifier = `[Owner] — ${project.name}`;
    }
    if (data.fields.dateSubmitted === undefined) data.fields.dateSubmitted = todayIso();
  }

  function countPreconFieldsFilled(project) {
    const data = getPrecon(project);
    const flatFilled = PRECON_FIELDS.filter((f) => {
      const v = data.fields[f.id];
      return v !== undefined && v !== null && String(v).trim() !== "";
    }).length;
    const idFilled = data.projectIdentifier && !data.projectIdentifier.includes("[Owner]") ? 1 : 0;
    const sovFilled = PRECON_SOV_MILESTONES.reduce((sum, m) => {
      const row = data.sov[m.id] || {};
      return sum + (row.value ? 1 : 0) + (row.date ? 1 : 0);
    }, 0);
    const total = PRECON_FIELDS.length + 1 + PRECON_SOV_MILESTONES.length * 2;
    return { filled: flatFilled + idFilled + sovFilled, total };
  }

  function renderPreconFormAffordance(project) {
    const wrap = document.createElement("div");
    wrap.className = "item-inline-actions";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm";
    btn.textContent = "Fill Out Precon Start Up Form";
    btn.addEventListener("click", () => openPreconDialog(project));

    const { filled, total } = countPreconFieldsFilled(project);
    const hint = document.createElement("span");
    hint.className = "nof-progress-inline";
    hint.textContent = filled > 0 ? `${filled}/${total} fields filled` : `${total} fields — not started`;

    wrap.appendChild(btn);
    wrap.appendChild(hint);
    return wrap;
  }

  function openPreconDialog(project) {
    closeAllDialogs(preconDialog);
    preconProjectId = project.id;
    applyPreconDefaults(project);
    saveState();
    preconProjectName.textContent = `${project.name} — ${project.location}`;
    renderPreconBody(project);
    updatePreconProgressLabel(project);
    preconDialog.showModal();
  }

  function updatePreconProgressLabel(project) {
    const { filled, total } = countPreconFieldsFilled(project);
    preconProgress.textContent = `${filled} of ${total} fields filled`;
  }

  function renderPreconBody(project) {
    preconBody.innerHTML = "";
    const data = getPrecon(project);

    preconBody.appendChild(renderSourceDocsNote(project));

    const idRow = document.createElement("div");
    idRow.className = "nof-row";
    idRow.style.gridTemplateColumns = "1fr";
    const idField = document.createElement("div");
    idField.className = "nof-field";
    const idLabel = document.createElement("label");
    const idLabelText = document.createElement("span");
    idLabelText.textContent = "Project Number + Owner + Project Name";
    idLabel.appendChild(idLabelText);
    const idInput = document.createElement("input");
    idInput.type = "text";
    idInput.value = data.projectIdentifier || "";
    idInput.id = "precon_projectIdentifier";
    idInput.addEventListener("input", () => {
      data.projectIdentifier = idInput.value;
      saveState();
      updatePreconProgressLabel(project);
    });
    idLabel.appendChild(idInput);
    idField.appendChild(idLabel);
    idRow.appendChild(idField);
    preconBody.appendChild(idRow);

    const genTitle = document.createElement("div");
    genTitle.className = "nof-section-title";
    genTitle.textContent = "General Information";
    preconBody.appendChild(genTitle);

    for (let i = 0; i < PRECON_FIELDS.length; i += 2) {
      const row = document.createElement("div");
      row.className = "nof-row";
      row.appendChild(renderPreconField(project, PRECON_FIELDS[i]));
      row.appendChild(PRECON_FIELDS[i + 1] ? renderPreconField(project, PRECON_FIELDS[i + 1]) : emptyOpportunityField());
      preconBody.appendChild(row);
    }

    const sovTitle = document.createElement("div");
    sovTitle.className = "nof-section-title";
    sovTitle.textContent = "PC Services Billing Schedule of Values";
    preconBody.appendChild(sovTitle);
    preconBody.appendChild(renderPreconSovTable(project));

    const sendTitle = document.createElement("div");
    sendTitle.className = "nof-section-title";
    sendTitle.textContent = "Send To";
    preconBody.appendChild(sendTitle);
    const sendNote = document.createElement("p");
    sendNote.className = "pdpo-linked-note";
    const manager = PRECON_FINANCE_MANAGERS_BY_OFFICE[project.location] || "your Finance Manager";
    sendNote.textContent = `Per the workbook's reference table: email this completed form to ${manager} and Jill Altman.`;
    preconBody.appendChild(sendNote);
  }

  function renderPreconField(project, field) {
    const data = getPrecon(project).fields;
    const wrap = document.createElement("div");
    wrap.className = "nof-field";

    const label = document.createElement("label");
    const labelText = document.createElement("span");
    labelText.textContent = field.label;
    label.appendChild(labelText);

    const input = document.createElement("input");
    input.type = field.type === "date" ? "date" : field.type === "currency" ? "number" : "text";
    input.value = data[field.id] || "";
    input.id = "precon_" + field.id;
    input.addEventListener("input", () => {
      data[field.id] = input.value;
      saveState();
      updatePreconProgressLabel(project);
    });

    label.appendChild(input);
    wrap.appendChild(label);
    return wrap;
  }

  function renderPreconSovTable(project) {
    const data = getPrecon(project).sov;
    const table = document.createElement("table");
    table.className = "level-table";
    const thead = document.createElement("thead");
    thead.innerHTML = "<tr><th>Milestone</th><th>Value</th><th>Date</th></tr>";
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    PRECON_SOV_MILESTONES.forEach((m) => {
      const row = data[m.id] || (data[m.id] = { value: "", date: "" });
      const tr = document.createElement("tr");

      const labelCell = document.createElement("td");
      labelCell.textContent = m.label;
      tr.appendChild(labelCell);

      const valueCell = document.createElement("td");
      const valueInput = document.createElement("input");
      valueInput.type = "text";
      valueInput.placeholder = "$";
      valueInput.value = row.value || "";
      valueInput.addEventListener("input", () => {
        row.value = valueInput.value;
        saveState();
        updatePreconProgressLabel(project);
      });
      valueCell.appendChild(valueInput);
      tr.appendChild(valueCell);

      const dateCell = document.createElement("td");
      const dateInput = document.createElement("input");
      dateInput.type = "date";
      dateInput.value = row.date || "";
      dateInput.addEventListener("input", () => {
        row.date = dateInput.value;
        saveState();
        updatePreconProgressLabel(project);
      });
      dateCell.appendChild(dateInput);
      tr.appendChild(dateCell);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return table;
  }

  async function handleExportPrecon() {
    const project = state.projects.find((p) => p.id === preconProjectId);
    if (!project) return;
    if (typeof PDFLib === "undefined") {
      await miniAlert("The PDF library didn't load (check your internet connection) — your entries are still saved in the app.");
      return;
    }
    const exportBtn = document.getElementById("exportPreconBtn");
    const originalLabel = exportBtn.textContent;
    exportBtn.disabled = true;
    exportBtn.textContent = "Exporting…";
    try {
      const blob = await buildPreconPdf(project);
      await offerDownload(`${sanitizeFilename(project.name)}_Precon_Start_Up_Form.pdf`, blob);
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = originalLabel;
    }
  }

  async function buildPreconPdf(project) {
    const { PDFDocument, StandardFonts } = PDFLib;
    const data = getPrecon(project);
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const b = createPdfFormBuilder(doc, font, boldFont);

    b.title("Precon Start Up Form");
    b.subtitle(`${project.name} — ${project.location}`);
    b.spacer(6);

    b.fieldLine("Project Number + Owner + Project Name", data.projectIdentifier, 220);
    b.spacer(6);

    b.sectionBar("General Information");
    for (let i = 0; i < PRECON_FIELDS.length; i += 2) {
      const left = PRECON_FIELDS[i], right = PRECON_FIELDS[i + 1];
      b.twoCol(
        left.label, formatFieldValueForPdf(left, data.fields[left.id]),
        right ? right.label : null, right ? formatFieldValueForPdf(right, data.fields[right.id]) : null
      );
    }
    b.spacer(10);

    b.sectionBar("PC Services Billing Schedule of Values");
    b.tableHeaderRow(["Milestone", "Value", "Date"], [0, 230, 350]);
    PRECON_SOV_MILESTONES.forEach((m) => {
      const r = data.sov[m.id] || {};
      b.tableRow([m.label, r.value ? "$" + Number(r.value).toLocaleString() : "—", r.date ? formatDate(new Date(r.date + "T00:00:00")) : "—"], [0, 230, 350]);
    });
    b.spacer(10);

    const manager = PRECON_FINANCE_MANAGERS_BY_OFFICE[project.location] || "your Finance Manager";
    b.sectionBar("Send To");
    b.wrappedBlock(null, `Per the workbook's reference table: email this completed form to ${manager} and Jill Altman.`);

    const bytes = await doc.save();
    return new Blob([bytes], { type: "application/pdf" });
  }

  // ---------- Bond Request Form ----------
  // "Request By" and "Contractor" are fixed to Scorpio's own name on the source template
  // (BOND_REQUESTOR_NAME), not fields to fill in — shown in the export but not editable here.

  function getBondRequest(project) {
    project.bondRequest = project.bondRequest || {};
    return project.bondRequest;
  }

  // A once-off seed from whichever of the New Opportunity Form/Precon Start Up Form has data,
  // not a live link — editing a field here doesn't get overwritten later the way NOF's linked
  // fields do, since a bond request is a point-in-time snapshot, not something that should
  // silently drift if the source form changes after the request is sent.
  function applyBondDefaults(project) {
    const data = getBondRequest(project);
    const opp = project.opportunity || {};
    if (data.dateOfRequest === undefined) data.dateOfRequest = todayIso();
    if (data.ownerObligeeNameAddress === undefined) {
      const addressLine = [opp.ownerAddress, opp.ownerCityStateZip].filter(Boolean).join(", ");
      data.ownerObligeeNameAddress = [opp.ownerCompany, addressLine].filter(Boolean).join("\n");
    }
    if (data.architect === undefined) data.architect = opp.architectCo || "";
    if (data.scopeOfWork === undefined) data.scopeOfWork = project.name || "";
    BOND_FIELDS.forEach((f) => {
      if (data[f.id] === undefined) data[f.id] = f.defaultValue || "";
    });
  }

  function countBondFieldsFilled(project) {
    const data = getBondRequest(project);
    const filled = BOND_FIELDS.filter((f) => {
      const v = data[f.id];
      return v !== undefined && v !== null && String(v).trim() !== "";
    }).length;
    return { filled, total: BOND_FIELDS.length };
  }

  function renderBondRequestAffordance(project) {
    const wrap = document.createElement("div");
    wrap.className = "item-inline-actions";

    if (!isPrimaryFormStarted(project)) {
      const hint = document.createElement("span");
      hint.className = "nof-progress-inline";
      hint.textContent = "Fill out the New Opportunity Form or Precon Start Up Form first to unlock this";
      wrap.appendChild(hint);
      return wrap;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm";
    btn.textContent = "Fill Out Bond Request";
    btn.addEventListener("click", () => openBondDialog(project));

    const { filled, total } = countBondFieldsFilled(project);
    const hint = document.createElement("span");
    hint.className = "nof-progress-inline";
    hint.textContent = filled > 0 ? `${filled}/${total} fields filled` : `${total} fields — not started`;

    wrap.appendChild(btn);
    wrap.appendChild(hint);
    return wrap;
  }

  function openBondDialog(project) {
    closeAllDialogs(bondDialog);
    bondProjectId = project.id;
    applyBondDefaults(project);
    saveState();
    bondProjectName.textContent = `${project.name} — ${project.location}`;
    renderBondBody(project);
    updateBondProgressLabel(project);
    bondDialog.showModal();
  }

  function updateBondProgressLabel(project) {
    const { filled, total } = countBondFieldsFilled(project);
    bondProgress.textContent = `${filled} of ${total} fields filled`;
  }

  function renderBondBody(project) {
    bondBody.innerHTML = "";

    const fixedNote = document.createElement("p");
    fixedNote.className = "pdpo-linked-note";
    fixedNote.textContent = `Request By / Contractor: ${BOND_REQUESTOR_NAME} (fixed on the source form).`;
    bondBody.appendChild(fixedNote);

    let lastSection = null;
    let rowBuffer = [];
    const flushRow = () => {
      if (!rowBuffer.length) return;
      const rowEl = document.createElement("div");
      rowEl.className = "nof-row";
      rowEl.appendChild(rowBuffer[0]);
      rowEl.appendChild(rowBuffer[1] || emptyOpportunityField());
      bondBody.appendChild(rowEl);
      rowBuffer = [];
    };

    // Date of Request has no section (renders on its own full-width row up top).
    const dateField = renderBondField(project, BOND_FIELDS[0]);
    const dateRow = document.createElement("div");
    dateRow.className = "nof-row";
    dateRow.appendChild(dateField);
    dateRow.appendChild(emptyOpportunityField());
    bondBody.appendChild(dateRow);

    BOND_FIELDS.slice(1).forEach((field) => {
      if (field.section !== lastSection) {
        flushRow();
        const title = document.createElement("div");
        title.className = "nof-section-title";
        title.textContent = field.section;
        bondBody.appendChild(title);
        lastSection = field.section;
      }
      rowBuffer.push(renderBondField(project, field));
      if (rowBuffer.length === 2) flushRow();
    });
    flushRow();

    if (BOND_FIELDS.some((f) => f.section === "If Request Is for a Performance/Payment Bond")) {
      const attachNote = document.createElement("p");
      attachNote.className = "pdpo-linked-note";
      attachNote.textContent = "Please attach a copy of the contract (it doesn't have to be signed) — the Contract uploaded at the top of the page works for this.";
      bondBody.appendChild(attachNote);
    }
  }

  function renderBondField(project, field) {
    const data = getBondRequest(project);
    const wrap = document.createElement("div");
    wrap.className = "nof-field";

    const label = document.createElement("label");
    const labelText = document.createElement("span");
    labelText.textContent = field.label;
    label.appendChild(labelText);

    let input;
    if (field.type === "textarea") {
      input = document.createElement("textarea");
      input.value = data[field.id] || "";
    } else {
      input = document.createElement("input");
      input.type = field.type === "date" ? "date" : "text";
      input.value = data[field.id] || "";
    }
    input.id = "bond_" + field.id;
    input.addEventListener("input", () => {
      data[field.id] = input.value;
      saveState();
      updateBondProgressLabel(project);
    });

    label.appendChild(input);
    wrap.appendChild(label);
    return wrap;
  }

  async function handleExportBond() {
    const project = state.projects.find((p) => p.id === bondProjectId);
    if (!project) return;
    if (typeof PDFLib === "undefined") {
      await miniAlert("The PDF library didn't load (check your internet connection) — your entries are still saved in the app.");
      return;
    }
    const exportBtn = document.getElementById("exportBondBtn");
    const originalLabel = exportBtn.textContent;
    exportBtn.disabled = true;
    exportBtn.textContent = "Exporting…";
    try {
      const blob = await buildBondPdf(project);
      await offerDownload(`${sanitizeFilename(project.name)}_Bond_Request.pdf`, blob);
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = originalLabel;
    }
  }

  async function buildBondPdf(project) {
    const { PDFDocument, StandardFonts } = PDFLib;
    const data = getBondRequest(project);
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const b = createPdfFormBuilder(doc, font, boldFont);

    b.title("Request for Bond");
    b.subtitle(`${project.name} — ${project.location}`);
    b.spacer(6);

    b.fieldLine("Request By (Company Name)", BOND_REQUESTOR_NAME, 200);
    b.fieldLine("Contractor", BOND_REQUESTOR_NAME, 200);
    b.fieldLine("Project Name", project.name, 200);
    b.spacer(6);

    let lastSection = null;
    BOND_FIELDS.forEach((f) => {
      if (f.section && f.section !== lastSection) {
        b.sectionBar(f.section);
        lastSection = f.section;
      }
      if (f.type === "textarea") b.wrappedBlock(f.label, formatFieldValueForPdf(f, data[f.id]));
      else b.fieldLine(f.label, formatFieldValueForPdf(f, data[f.id]), 220);
    });

    const bytes = await doc.save();
    return new Blob([bytes], { type: "application/pdf" });
  }

  // ---------- Builder's Risk Quote Request ----------
  // A meaningful subset of the real HUB International "Builders Risk Application" (a 124-field
  // fillable PDF) — insurance elections, deductibles, construction materials, and additional
  // interests still have to be filled in on the real form by hand, since none of that is data
  // this app tracks.

  function getBuildersRisk(project) {
    project.buildersRisk = project.buildersRisk || {};
    return project.buildersRisk;
  }

  function applyBuildersRiskDefaults(project) {
    const data = getBuildersRisk(project);
    const opp = project.opportunity || {};
    if (data.insuredName === undefined) data.insuredName = opp.ownerCompany || "";
    if (data.insuredAddress === undefined) data.insuredAddress = opp.ownerAddress || "";
    if (data.insuredCityStateZip === undefined) data.insuredCityStateZip = opp.ownerCityStateZip || "";
    if (data.projectAddress === undefined) data.projectAddress = opp.jobsiteAddress || "";
    if (data.squareFootage === undefined) data.squareFootage = opp.projectSqFt || "";
    if (data.totalCompletedValue === undefined) data.totalCompletedValue = opp.estProjectValue || "";
    if (data.policyEffectiveDate === undefined) data.policyEffectiveDate = project.activateDate || "";
    if (data.expectedCompletionDate === undefined) data.expectedCompletionDate = opp.estCompletionDate || "";
    BUILDERS_RISK_FIELDS.forEach((f) => {
      if (data[f.id] === undefined) data[f.id] = f.defaultValue || "";
    });
  }

  function countBuildersRiskFieldsFilled(project) {
    const data = getBuildersRisk(project);
    const filled = BUILDERS_RISK_FIELDS.filter((f) => {
      const v = data[f.id];
      return v !== undefined && v !== null && String(v).trim() !== "";
    }).length;
    return { filled, total: BUILDERS_RISK_FIELDS.length };
  }

  function renderBuildersRiskAffordance(project) {
    const wrap = document.createElement("div");
    wrap.className = "item-inline-actions";

    if (!isPrimaryFormStarted(project)) {
      const hint = document.createElement("span");
      hint.className = "nof-progress-inline";
      hint.textContent = "Fill out the New Opportunity Form or Precon Start Up Form first to unlock this";
      wrap.appendChild(hint);
      return wrap;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm";
    btn.textContent = "Fill Out Builder's Risk Request";
    btn.addEventListener("click", () => openBuildersRiskDialog(project));

    const { filled, total } = countBuildersRiskFieldsFilled(project);
    const hint = document.createElement("span");
    hint.className = "nof-progress-inline";
    hint.textContent = filled > 0 ? `${filled}/${total} fields filled` : `${total} fields — not started`;

    wrap.appendChild(btn);
    wrap.appendChild(hint);
    return wrap;
  }

  function openBuildersRiskDialog(project) {
    closeAllDialogs(buildersRiskDialog);
    buildersRiskProjectId = project.id;
    applyBuildersRiskDefaults(project);
    saveState();
    buildersRiskProjectName.textContent = `${project.name} — ${project.location}`;
    renderBuildersRiskBody(project);
    updateBuildersRiskProgressLabel(project);
    buildersRiskDialog.showModal();
  }

  function updateBuildersRiskProgressLabel(project) {
    const { filled, total } = countBuildersRiskFieldsFilled(project);
    buildersRiskProgress.textContent = `${filled} of ${total} fields filled — the rest of the official application ` +
      `(materials, coverage elections, deductibles, additional interests) still has to be filled in by hand`;
  }

  function renderBuildersRiskBody(project) {
    buildersRiskBody.innerHTML = "";
    for (let i = 0; i < BUILDERS_RISK_FIELDS.length; i += 2) {
      const row = document.createElement("div");
      row.className = "nof-row";
      row.appendChild(renderBuildersRiskField(project, BUILDERS_RISK_FIELDS[i]));
      row.appendChild(BUILDERS_RISK_FIELDS[i + 1] ? renderBuildersRiskField(project, BUILDERS_RISK_FIELDS[i + 1]) : emptyOpportunityField());
      buildersRiskBody.appendChild(row);
    }
  }

  function renderBuildersRiskField(project, field) {
    const data = getBuildersRisk(project);
    const wrap = document.createElement("div");
    wrap.className = "nof-field";

    const label = document.createElement("label");
    const labelText = document.createElement("span");
    labelText.textContent = field.label;
    label.appendChild(labelText);

    const input = document.createElement("input");
    input.type = field.type === "date" ? "date" : "text";
    input.value = data[field.id] || "";
    input.id = "buildersRisk_" + field.id;
    input.addEventListener("input", () => {
      data[field.id] = input.value;
      saveState();
      updateBuildersRiskProgressLabel(project);
    });

    label.appendChild(input);
    wrap.appendChild(label);
    return wrap;
  }

  async function handleExportBuildersRisk() {
    const project = state.projects.find((p) => p.id === buildersRiskProjectId);
    if (!project) return;
    if (typeof PDFLib === "undefined") {
      await miniAlert("The PDF library didn't load (check your internet connection) — your entries are still saved in the app.");
      return;
    }
    const exportBtn = document.getElementById("exportBuildersRiskBtn");
    const originalLabel = exportBtn.textContent;
    exportBtn.disabled = true;
    exportBtn.textContent = "Exporting…";
    try {
      const blob = await buildBuildersRiskPdf(project);
      await offerDownload(`${sanitizeFilename(project.name)}_Builders_Risk_Quote_Request.pdf`, blob);
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = originalLabel;
    }
  }

  async function buildBuildersRiskPdf(project) {
    const { PDFDocument, StandardFonts } = PDFLib;
    const data = getBuildersRisk(project);
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const b = createPdfFormBuilder(doc, font, boldFont);

    b.title("Builder's Risk Quote Request — Known Fields");
    b.subtitle(`${project.name} — ${project.location}`);
    b.wrappedBlock(null, "The rest of the official HUB International application (materials, coverage " +
      "elections, deductibles, additional interests) still needs to be filled in by hand.");
    b.spacer(6);

    BUILDERS_RISK_FIELDS.forEach((f) => {
      b.fieldLine(f.label, formatFieldValueForPdf(f, data[f.id]), 240);
    });

    const bytes = await doc.save();
    return new Blob([bytes], { type: "application/pdf" });
  }

  // ---------- 6S Level Assignments / Bid Packages ----------
  // A trade (bid package) only "counts" once it has a Leveler assigned — most projects won't
  // use every trade in the master list, so an unassigned row is just left blank rather than
  // needing to be explicitly excluded. Coverage is judged against LEVELING_MIN_BIDDERS.

  function getLevelAssignments(project) {
    project.levelAssignments = project.levelAssignments || { trades: {}, captains: {}, removedBps: [], customTrades: {} };
    project.levelAssignments.removedBps = project.levelAssignments.removedBps || [];
    project.levelAssignments.customTrades = project.levelAssignments.customTrades || {};
    return project.levelAssignments;
  }

  // The master LEVELING_TRADE_GROUPS list (from the Leveling Assignments workbook) is shared
  // across every project — a project customizes it by hiding a default bid package line
  // (removedBps) or adding one of its own (customTrades), never by editing the master list.
  function getGroupTrades(project, group) {
    const la = getLevelAssignments(project);
    const removed = new Set(la.removedBps);
    const defaults = group.trades.filter((t) => !removed.has(t.bp)).map((t) => ({ bp: t.bp, trade: t.trade, custom: false }));
    const custom = (la.customTrades[group.name] || []).map((t) => ({ bp: t.bp, trade: t.trade, custom: true }));
    return [...defaults, ...custom];
  }

  async function addBidPackageLine(project, group) {
    const trade = await miniPrompt(`New bid package / trade name to add under ${group.name}:`);
    if (!trade || !trade.trim()) return;
    const la = getLevelAssignments(project);
    const list = la.customTrades[group.name] || (la.customTrades[group.name] = []);
    const existingBps = new Set([...group.trades.map((t) => t.bp), ...list.map((t) => t.bp)]);
    let n = list.length + 1;
    let bp = `${group.name.slice(0, 1).toUpperCase()}-CUSTOM-${n}`;
    while (existingBps.has(bp)) { n++; bp = `${group.name.slice(0, 1).toUpperCase()}-CUSTOM-${n}`; }
    list.push({ bp, trade: trade.trim() });
    saveState();
    renderLevelBody(project);
    updateLevelProgressLabel(project);
  }

  async function removeBidPackageLine(project, group, t) {
    const ok = await miniConfirm(`Remove "${t.trade}" from ${group.name}? Any leveler/bidder data entered for this line will be cleared.`, { okLabel: "Remove", danger: true });
    if (!ok) return;
    const la = getLevelAssignments(project);
    if (t.custom) {
      const list = la.customTrades[group.name];
      if (list) {
        const idx = list.findIndex((x) => x.bp === t.bp);
        if (idx >= 0) list.splice(idx, 1);
      }
    } else if (!la.removedBps.includes(t.bp)) {
      la.removedBps.push(t.bp);
    }
    delete la.trades[t.bp];
    saveState();
    renderLevelBody(project);
    updateLevelProgressLabel(project);
  }

  function countLevelCoverage(project) {
    const la = getLevelAssignments(project);
    let totalTrades = 0, assignedTrades = 0, coveredTrades = 0;
    LEVELING_TRADE_GROUPS.forEach((group) => {
      getGroupTrades(project, group).forEach((t) => {
        totalTrades++;
        const row = la.trades[t.bp];
        if (row && row.leveler) {
          assignedTrades++;
          if ((row.confirmedBidders || 0) >= LEVELING_MIN_BIDDERS) coveredTrades++;
        }
      });
    });
    return { totalTrades, assignedTrades, coveredTrades };
  }

  // The people assigned across every trade (as Leveler) and group (as Captain) are, per
  // Rachel's workflow, the same team that runs the Kickoff Meeting, subcontractor status
  // correspondence, and Bid/Level Day — so this list doubles as the project's 6S team roster.
  function getLevelTeam(project) {
    const la = getLevelAssignments(project);
    const byName = new Map();
    function addRole(name, role) {
      if (!name) return;
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(role);
    }
    LEVELING_TRADE_GROUPS.forEach((group) => {
      const captain = la.captains[group.name];
      if (captain) addRole(captain, `Captain — ${group.name}`);
      getGroupTrades(project, group).forEach((t) => {
        const row = la.trades[t.bp];
        if (row && row.leveler) addRole(row.leveler, `Leveler — ${t.trade}`);
      });
    });
    return [...byName.entries()]
      .map(([name, roles]) => ({ name, roles }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function renderLevelAssignmentsAffordance(project) {
    const wrap = document.createElement("div");
    wrap.className = "item-inline-actions";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm";
    btn.textContent = "Build Level Assignments";
    btn.addEventListener("click", () => openLevelDialog(project));

    const { assignedTrades, coveredTrades } = countLevelCoverage(project);
    const hint = document.createElement("span");
    hint.className = "nof-progress-inline";
    hint.textContent = assignedTrades > 0
      ? `${assignedTrades} trade${assignedTrades === 1 ? "" : "s"} assigned, ${coveredTrades}/${assignedTrades} at ${LEVELING_MIN_BIDDERS}+ bidders`
      : "No trades assigned yet";

    wrap.appendChild(btn);
    wrap.appendChild(hint);
    return wrap;
  }

  function openLevelDialog(project) {
    closeAllDialogs(levelDialog);
    levelProjectId = project.id;
    levelProjectName.textContent = `${project.name} — ${project.location}`;
    renderLevelBody(project);
    updateLevelProgressLabel(project);
    levelDialog.showModal();
  }

  function updateLevelProgressLabel(project) {
    const { totalTrades, assignedTrades, coveredTrades } = countLevelCoverage(project);
    levelProgress.textContent = `${assignedTrades} of ${totalTrades} trades assigned — ` +
      `${coveredTrades} at ${LEVELING_MIN_BIDDERS}+ confirmed bidders`;
  }

  function renderLevelBody(project) {
    levelBody.innerHTML = "";
    levelBody.appendChild(renderLevelTeamSummary(project));
    LEVELING_TRADE_GROUPS.forEach((group) => {
      levelBody.appendChild(renderLevelGroupSection(project, group));
    });
  }

  function renderLevelTeamSummary(project) {
    const wrap = document.createElement("div");
    wrap.className = "level-team-summary";

    const la = getLevelAssignments(project);
    const approvedRow = document.createElement("label");
    approvedRow.className = "level-approved-row";
    approvedRow.appendChild(document.createTextNode("Level Assignments Approved Date "));
    const approvedHint = document.createElement("span");
    approvedHint.className = "hint";
    approvedHint.textContent = "(optional — set this once assignments are locked in; it drives the Complete Kick Off Mtg date in the Meeting & Task Schedule)";
    approvedRow.appendChild(approvedHint);
    const approvedInput = document.createElement("input");
    approvedInput.type = "date";
    approvedInput.value = la.approvedDate || "";
    approvedInput.addEventListener("change", () => {
      la.approvedDate = approvedInput.value || "";
      saveState();
    });
    approvedRow.appendChild(approvedInput);
    wrap.appendChild(approvedRow);

    const heading = document.createElement("h4");
    heading.textContent = "Project 6S Team (auto-built from assignments below)";
    wrap.appendChild(heading);

    const team = getLevelTeam(project);
    if (team.length === 0) {
      const empty = document.createElement("p");
      empty.className = "level-team-empty";
      empty.textContent = "Assign a Leveler or Captain below and this list fills in — it's the same " +
        "group to invite to the Kickoff Meeting, keep on subcontractor status correspondence, and have at Bid/Level Day.";
      wrap.appendChild(empty);
      return wrap;
    }

    const ul = document.createElement("ul");
    team.forEach((person) => {
      const li = document.createElement("li");
      const strong = document.createElement("strong");
      strong.textContent = person.name;
      li.appendChild(strong);
      li.appendChild(document.createTextNode(" — " + person.roles.join(", ")));
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    return wrap;
  }

  function renderLevelGroupSection(project, group) {
    const fragment = document.createDocumentFragment();
    const la = getLevelAssignments(project);

    const header = document.createElement("div");
    header.className = "nof-section-title level-group-header";

    const title = document.createElement("span");
    title.textContent = group.name;
    header.appendChild(title);

    const captainWrap = document.createElement("label");
    captainWrap.className = "level-captain";
    captainWrap.appendChild(document.createTextNode("Captain"));
    const captainSelect = document.createElement("select");
    populateAssigneeOptions(captainSelect, project, "—");
    captainSelect.value = la.captains[group.name] || "";
    captainSelect.addEventListener("change", async () => {
      if (captainSelect.value === LEVEL_ADD_PERSON_VALUE) {
        const person = await quickAddRosterPerson(project);
        if (person) la.captains[group.name] = person.name;
        else { captainSelect.value = la.captains[group.name] || ""; return; }
        renderLevelBody(project);
        updateLevelProgressLabel(project);
        return;
      }
      if (captainSelect.value) la.captains[group.name] = captainSelect.value;
      else delete la.captains[group.name];
      saveState();
      renderLevelTeamSummaryInPlace(project);
    });
    captainWrap.appendChild(captainSelect);
    header.appendChild(captainWrap);

    fragment.appendChild(header);

    const table = document.createElement("table");
    table.className = "level-table";
    const thead = document.createElement("thead");
    thead.innerHTML = "<tr><th>BP#</th><th>Trade</th><th>Leveler</th><th>Confirmed Bidders</th>" +
      "<th>Trusted Subs Confirmed</th><th>Coverage</th><th></th></tr>";
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    getGroupTrades(project, group).forEach((t) => tbody.appendChild(renderLevelTradeRow(project, group, t)));
    table.appendChild(tbody);

    fragment.appendChild(table);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn btn-sm level-add-bp-btn";
    addBtn.textContent = "+ Add Bid Package Line";
    addBtn.addEventListener("click", () => addBidPackageLine(project, group));
    fragment.appendChild(addBtn);

    return fragment;
  }

  function renderLevelTradeRow(project, group, t) {
    const la = getLevelAssignments(project);
    const row = la.trades[t.bp] || (la.trades[t.bp] = { leveler: "", confirmedBidders: null, trustedSubs: null });

    const tr = document.createElement("tr");

    const bpCell = document.createElement("td");
    bpCell.className = "level-bp-cell";
    bpCell.textContent = t.bp;
    tr.appendChild(bpCell);

    const tradeCell = document.createElement("td");
    tradeCell.textContent = t.trade;
    tr.appendChild(tradeCell);

    const levelerCell = document.createElement("td");
    const levelerSelect = document.createElement("select");
    populateAssigneeOptions(levelerSelect, project, "— Unassigned —");
    levelerSelect.value = row.leveler || "";
    levelerCell.appendChild(levelerSelect);
    tr.appendChild(levelerCell);

    const bidderCell = document.createElement("td");
    const bidderInput = document.createElement("input");
    bidderInput.type = "number";
    bidderInput.min = "0";
    bidderInput.value = row.confirmedBidders === null || row.confirmedBidders === undefined ? "" : row.confirmedBidders;
    bidderCell.appendChild(bidderInput);
    tr.appendChild(bidderCell);

    const subsCell = document.createElement("td");
    const subsInput = document.createElement("input");
    subsInput.type = "number";
    subsInput.min = "0";
    subsInput.value = row.trustedSubs === null || row.trustedSubs === undefined ? "" : row.trustedSubs;
    subsCell.appendChild(subsInput);
    tr.appendChild(subsCell);

    const coverageCell = document.createElement("td");
    tr.appendChild(coverageCell);

    function refreshCoverage() {
      coverageCell.innerHTML = "";
      if (!row.leveler) return;
      const confirmed = row.confirmedBidders || 0;
      const chip = document.createElement("span");
      if (confirmed >= LEVELING_MIN_BIDDERS) {
        chip.className = "coverage-chip covered";
        chip.textContent = "Covered";
      } else {
        chip.className = "coverage-chip short";
        chip.textContent = `Need ${LEVELING_MIN_BIDDERS - confirmed} more`;
      }
      coverageCell.appendChild(chip);
    }
    refreshCoverage();

    levelerSelect.addEventListener("change", async () => {
      if (levelerSelect.value === LEVEL_ADD_PERSON_VALUE) {
        const person = await quickAddRosterPerson(project);
        if (person) row.leveler = person.name;
        else { levelerSelect.value = row.leveler || ""; return; }
        renderLevelBody(project);
        updateLevelProgressLabel(project);
        return;
      }
      row.leveler = levelerSelect.value;
      saveState();
      refreshCoverage();
      renderLevelTeamSummaryInPlace(project);
      updateLevelProgressLabel(project);
    });
    bidderInput.addEventListener("input", () => {
      row.confirmedBidders = bidderInput.value === "" ? null : Number(bidderInput.value);
      saveState();
      refreshCoverage();
      updateLevelProgressLabel(project);
    });
    subsInput.addEventListener("input", () => {
      row.trustedSubs = subsInput.value === "" ? null : Number(subsInput.value);
      saveState();
    });

    const removeCell = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn-sm level-remove-bp-btn";
    removeBtn.textContent = "Remove";
    removeBtn.title = t.custom ? "Remove this bid package line" : "Hide this bid package line for this project";
    removeBtn.addEventListener("click", () => removeBidPackageLine(project, group, t));
    removeCell.appendChild(removeBtn);
    tr.appendChild(removeCell);

    return tr;
  }

  // Swaps just the team-summary block in place, rather than re-rendering the whole dialog
  // body (which would blow away focus/scroll position mid-edit of a captain dropdown).
  function renderLevelTeamSummaryInPlace(project) {
    const old = levelBody.querySelector(".level-team-summary");
    if (!old) return;
    old.replaceWith(renderLevelTeamSummary(project));
  }

  async function handleExportLevelAssignments() {
    const project = state.projects.find((p) => p.id === levelProjectId);
    if (!project) return;

    if (typeof PDFLib === "undefined") {
      await miniAlert("The PDF library didn't load (check your internet connection) — your entries are still saved in the app.");
      return;
    }

    const exportBtn = document.getElementById("exportLevelBtn");
    const originalLabel = exportBtn.textContent;
    exportBtn.disabled = true;
    exportBtn.textContent = "Exporting…";

    try {
      const blob = await buildLevelAssignmentsPdf(project);
      await offerDownload(`${sanitizeFilename(project.name)}_Level_Assignments.pdf`, blob);
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = originalLabel;
    }
  }

  async function buildLevelAssignmentsPdf(project) {
    const { PDFDocument, StandardFonts } = PDFLib;
    const la = getLevelAssignments(project);
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const b = createPdfFormBuilder(doc, font, boldFont);
    const colXs = [0, 55, 210, 330, 415];

    b.title("6S Level Assignments & Bid Packages");
    b.subtitle(`${project.name} — ${project.location}`);
    b.spacer(6);

    LEVELING_TRADE_GROUPS.forEach((group) => {
      b.sectionBar(`${group.name}   ·   Captain: ${la.captains[group.name] || "—"}`);
      b.tableHeaderRow(["BP#", "Trade", "Leveler", "Confirmed Bidders", "Trusted Subs"], colXs);
      getGroupTrades(project, group).forEach((t) => {
        const r = la.trades[t.bp] || {};
        b.tableRow([t.bp, t.trade, r.leveler || "—", r.confirmedBidders ?? "—", r.trustedSubs ?? "—"], colXs);
      });
      b.spacer(8);
    });

    b.sectionBar("Project 6S Team");
    getLevelTeam(project).forEach((person) => {
      b.fieldLine(person.name, person.roles.join(", "), 150);
    });

    const bytes = await doc.save();
    return new Blob([bytes], { type: "application/pdf" });
  }

  // ---------- New Opportunity Form ----------

  // ---- Conformed set upload: best-effort text extraction ----
  // This is a label-matching heuristic against the PDF's text layer, not real reading
  // comprehension — it can miss things or grab the wrong line entirely. It only ever fills
  // fields that are still blank, and every field it touches gets an "extracted" badge so
  // it's obvious which values came from the scan versus were typed in. Purely scanned/
  // rasterized drawing sheets have no text layer at all (confirmed against a real Scorpio
  // drawing set), but a conformed set's spec/ITB pages are usually real text, so this still
  // finds plenty even when every drawing sheet in the same file comes up empty.

  async function extractPdfText(pdfDoc) {
    let text = "";
    const pages = [];
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const lines = groupTextItemsIntoLines(content.items, viewport);
      pages.push(lines);
      text += lines.map((l) => l.text).join("\n") + "\n";
    }
    return { text, pages };
  }

  // pdf.js hands back individual positioned text fragments in raw PDF coordinate space, which
  // can look nothing like on-page position for a rotated/transformed sheet (real title blocks
  // come back with wildly non-visual coordinates otherwise) — running each fragment through the
  // page's own viewport transform first fixes that. Fragments are then grouped into lines by
  // matching row, splitting a row wherever there's a big horizontal gap so two unrelated
  // columns sharing a row (e.g. a table cell and a title-block strip) don't get mashed into one
  // string — this is what lets a title block get read as its own column even on a page dense
  // with body text at the same height.
  function groupTextItemsIntoLines(items, viewport) {
    const m = viewport.transform;
    // A fixed gap threshold doesn't work across drawing sets — a full-scale architectural sheet
    // can be thousands of PDF units wide, versus ~600 for a normal letter-size page — so scale
    // the "different column" cutoff to the page itself (with a floor so tiny pages still split).
    const gapThreshold = Math.max(15, viewport.width * 0.035);
    const rows = new Map();
    items.forEach((item) => {
      const px = m[0] * item.transform[4] + m[2] * item.transform[5] + m[4];
      const py = m[1] * item.transform[4] + m[3] * item.transform[5] + m[5];
      const y = Math.round(py / 2) * 2;
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push({ x: px, width: item.width || 0, str: item.str });
    });
    const lines = [];
    [...rows.keys()].sort((a, b) => a - b).forEach((y) => {
      const rowItems = rows.get(y).sort((a, b) => a.x - b.x);
      let run = [rowItems[0]];
      const flushRun = () => {
        const t = run.map((r) => r.str).join(" ").trim();
        if (t) lines.push({ x: run[0].x, y, text: t });
      };
      for (let i = 1; i < rowItems.length; i++) {
        const prev = run[run.length - 1];
        const gap = rowItems[i].x - (prev.x + prev.width);
        if (gap > gapThreshold) {
          flushRun();
          run = [rowItems[i]];
        } else {
          run.push(rowItems[i]);
        }
      }
      flushRun();
    });
    return lines;
  }

  // Groups a page's lines into left-to-right columns by clustering on X position — a drawing's
  // title block/consultant strip is almost always its own column, physically far from the body
  // content, so this is what keeps a stray line from an unrelated column (e.g. "UF BUILDING
  // NO.:" sharing a row with an engineer's address) from bleeding into a block below.
  function clusterLinesByColumn(lines) {
    if (!lines.length) return [];
    const sorted = [...lines].sort((a, b) => a.x - b.x);
    // Same reasoning as the gap threshold in groupTextItemsIntoLines — scale to how far apart
    // this page's content actually is, rather than a fixed unit count that only suits one scale.
    const range = sorted[sorted.length - 1].x - sorted[0].x;
    const threshold = Math.max(60, range * 0.04);
    const columns = [];
    let current = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].x - current[current.length - 1].x > threshold) {
        columns.push(current);
        current = [sorted[i]];
      } else {
        current.push(sorted[i]);
      }
    }
    columns.push(current);
    return columns.map((col) => [...col].sort((a, b) => a.y - b.y));
  }

  // Real title blocks/consultant lists on drawing cover sheets usually give each discipline its
  // own ALL-CAPS heading (ARCHITECT, STRUCTURAL ENGINEER, etc.) with the company/address/phone
  // stacked on the lines below it — not "Label: Value" on one line, which is what
  // NOF_EXTRACTION_RULES/extractNofFieldsFromText alone can match. This is a second pass over
  // the same lines that looks for those headings and reads the block beneath each one.
  // "OWNER" deliberately isn't a trigger here — real sheets sprinkle it everywhere as a
  // furniture/equipment responsibility callout ("OWNER" = who furnishes/installs an item, e.g.
  // a mounting-height detail for an owner-provided paper towel dispenser), so treating a bare
  // "OWNER" line as the start of a company/address block reliably grabs the wrong thing. Owner
  // is only ever found via extractUnlabeledOwnerBlock below, which requires much stronger
  // evidence (an actual company/address/city-state-zip shape) before accepting a match.
  const NOF_AEC_BLOCK_HEADERS = [
    { labels: ["ARCHITECT", "ARCHITECT OF RECORD"], fields: ["architectCo", "architectAddress", "architectCityStateZip", "architectPhone", "architectEmail"] },
    { labels: ["STRUCTURAL ENGINEER"], fields: ["structuralEngineerCo"] },
    { labels: ["CIVIL ENGINEER"], fields: ["civilEngineerCo"] },
    { labels: ["MEPF ENGINEER", "MEPFP ENGINEER", "MEP ENGINEER", "MECHANICAL ENGINEER"], fields: ["mepfpEngineerCo"] },
    { labels: ["LANDSCAPE ARCHITECT"], fields: ["landscapeArchitectCo"] },
    { labels: ["INTERIOR DESIGNER"], fields: ["interiorDesignerCo"] },
  ];
  // Still used as a block-boundary stop marker (so e.g. an Architect block never runs into a
  // stray "OWNER" callout below it) even though OWNER/CLIENT no longer start their own block.
  const NOF_AEC_ALL_HEADER_LABELS = new Set([...NOF_AEC_BLOCK_HEADERS.flatMap((h) => h.labels), "OWNER", "CLIENT"]);
  const CITY_STATE_ZIP_RE = /,\s*[A-Z]{2}\s+\d{5}(-\d{4})?\s*$/;
  const PHONE_RE = /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/;
  const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;

  function assignAecBlockToFields(found, fields, blockLines) {
    if (!blockLines.length) return;
    if (fields[0] && !found[fields[0]] && isPlausibleCompanyName(blockLines[0])) found[fields[0]] = blockLines[0];
    if (fields.length < 2) return; // company-only discipline (no address/phone fields on the form)
    const [, addressField, cszField, phoneField, emailField] = fields;
    const cszIdx = blockLines.findIndex((l) => CITY_STATE_ZIP_RE.test(l));
    if (cszIdx > 0) {
      if (cszField && !found[cszField]) found[cszField] = blockLines[cszIdx];
      if (cszIdx > 1 && addressField && !found[addressField]) found[addressField] = blockLines[cszIdx - 1];
    }
    const phoneLine = blockLines.find((l) => PHONE_RE.test(l));
    if (phoneLine && phoneField && !found[phoneField]) found[phoneField] = phoneLine.match(PHONE_RE)[0];
    const emailLine = blockLines.find((l) => EMAIL_RE.test(l));
    if (emailLine && emailField && !found[emailField]) found[emailField] = emailLine.match(EMAIL_RE)[0];
  }

  function extractAecBlocksFromColumn(found, columnLines) {
    for (let i = 0; i < columnLines.length; i++) {
      const upper = columnLines[i].text.trim().toUpperCase();
      const header = NOF_AEC_BLOCK_HEADERS.find((h) => h.labels.includes(upper));
      if (!header) continue;
      const blockLines = [];
      for (let j = i + 1; j < columnLines.length && blockLines.length < 6; j++) {
        const nextUpper = columnLines[j].text.trim().toUpperCase();
        if (NOF_AEC_ALL_HEADER_LABELS.has(nextUpper)) break;
        blockLines.push(columnLines[j].text.trim());
      }
      assignAecBlockToFields(found, header.fields, blockLines);
    }
  }

  // Some templates (a real University of Florida title block among them) never print an
  // "OWNER"/"CLIENT" heading at all — the owner's name/address/city-state-zip just sits there,
  // usually near the top project-identifier block. Falls back to the first company/address/
  // city-state-zip triple that isn't already one of the AEC companies just found.
  function extractUnlabeledOwnerBlock(found, columns) {
    if (found.ownerCompany) return;
    const claimedCompanies = new Set(Object.values(found));
    const skipHeadings = new Set([
      "PROJECT DESCRIPTION", "PROJECT INFORMATION", "PROJECT LOCATION", "LOCATION MAP",
      "BUILDING INFORMATION AND LIMITATIONS", "AREAS AND OCCUPANT LOAD", "INDEX OF DRAWINGS",
      "SEAL AND SIGNATURE", "GENERAL", "ARCHITECTURAL", "STRUCTURAL", "CIVIL", "MECHANICAL",
      "ELECTRICAL", "PLUMBING", "LANDSCAPE", "FIRE PROTECTION",
    ]);
    for (const column of columns) {
      for (let i = 2; i < column.length; i++) {
        const cityLine = column[i].text.trim();
        if (!CITY_STATE_ZIP_RE.test(cityLine)) continue;
        const addressLine = column[i - 1].text.trim();
        const companyLine = column[i - 2].text.trim();
        if (!/\d/.test(addressLine)) continue;
        if (skipHeadings.has(companyLine.toUpperCase()) || NOF_AEC_ALL_HEADER_LABELS.has(companyLine.toUpperCase())) continue;
        if (claimedCompanies.has(companyLine)) continue;
        if (!isPlausibleCompanyName(companyLine)) continue;
        found.ownerCompany = companyLine;
        found.ownerAddress = addressLine;
        found.ownerCityStateZip = cityLine;
        return;
      }
    }
  }

  function extractAecBlocksFromPages(pages) {
    const found = {};
    pages.forEach((pageLines) => {
      const columns = clusterLinesByColumn(pageLines);
      columns.forEach((column) => extractAecBlocksFromColumn(found, column));
    });
    pages.forEach((pageLines) => {
      extractUnlabeledOwnerBlock(found, clusterLinesByColumn(pageLines));
    });
    return found;
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

  // A "Label: Value" or title-block scan can just as easily latch onto a stray note ("NO",
  // "SEE PLANS") or a whole sentence ("ENGINEER BEFORE PROCEEDING WITH...") as it can a real
  // company name — this is the one sanity check standing between that and a garbage match
  // landing in a form field. Not foolproof, just cheap insurance against the obvious cases.
  const COMPANY_FIELD_IDS = new Set([
    "ownerCompany", "architectCo", "civilEngineerCo", "structuralEngineerCo",
    "mepfpEngineerCo", "landscapeArchitectCo", "interiorDesignerCo",
  ]);
  const IMPLAUSIBLE_COMPANY_VALUES = new Set([
    "NO", "YES", "N/A", "NA", "TBD", "NONE", "UNKNOWN", "NIC", "N I C",
    "OWNER", "CLIENT", "ARCHITECT", "ENGINEER", "SEE PLANS", "PER PLANS", "SEE SPECS", "PER SPECS", "TYP", "TYPICAL",
  ]);
  function isPlausibleCompanyName(value) {
    if (!value) return false;
    const trimmed = value.trim();
    if (trimmed.length < 3 || trimmed.length > 60) return false;
    const cleaned = trimmed.replace(/[.,;:]+$/, "").toUpperCase();
    if (IMPLAUSIBLE_COMPANY_VALUES.has(cleaned)) return false;
    if (trimmed.split(/\s+/).length > 8) return false;
    return true;
  }

  function extractNofFieldsFromText(text, pages) {
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
          else if (rule.type === "currency" || rule.type === "number") value = parseCurrencyAmount(value);
          else if (COMPANY_FIELD_IDS.has(rule.fieldId) && !isPlausibleCompanyName(value)) value = null;
          if (value) { found[rule.fieldId] = value; break; }
        }
      }
    });
    // Same-line "Label: Value" text takes priority (it's unambiguous); the block-based scan of
    // title-block headings below only fills in whatever that pass didn't already find.
    if (pages) {
      const blockMatches = extractAecBlocksFromPages(pages);
      Object.keys(blockMatches).forEach((fieldId) => {
        if (!found[fieldId]) found[fieldId] = blockMatches[fieldId];
      });
    }
    const contractType = matchContractType(text);
    if (contractType) found.contractType = contractType;
    return found;
  }

  function nofFieldLabelFor(fieldId) {
    const field = NOF_ALL_FIELDS.find((f) => f.id === fieldId);
    return field ? field.label : fieldId;
  }

  // Multiple PDFs (drawings, specs, ITB uploaded separately) get merged into one file, in the
  // order they were selected, before anything else happens — from there on it's handled
  // exactly like a single conformed-set upload. This does NOT recreate Bluebeam's own
  // bookmarking/page-labeling — it only concatenates pages — but it does remove the need to
  // pre-combine files by hand before uploading.
  async function mergeConformedSetFiles(files) {
    if (typeof PDFLib === "undefined") throw new Error("The PDF-merging library didn't load — check your internet connection");
    const { PDFDocument } = PDFLib;
    const outDoc = await PDFDocument.create();
    for (const file of files) {
      const srcBytes = new Uint8Array(await file.arrayBuffer());
      const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
      const copiedPages = await outDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copiedPages.forEach((p) => outDoc.addPage(p));
    }
    const mergedBytes = await outDoc.save();
    const mergedName = `Conformed Set (${files.length} files merged).pdf`;
    return new File([mergedBytes], mergedName, { type: "application/pdf" });
  }

  // Drawings and/or Specifications changing re-runs extraction across whichever of the two are
  // currently attached, combined — a company/address block or a "Label: Value" line can live in
  // either one, so both get scanned together rather than treated as separate documents.

  async function runDocumentExtraction(project) {
    const drawingsDoc = getProjectDocument(project, "drawings");
    const specsDoc = getProjectDocument(project, "specifications");
    const sourceDocs = [drawingsDoc, specsDoc].filter(Boolean);
    if (!sourceDocs.length) return;

    let combinedText = "";
    let combinedPages = [];
    for (const doc of sourceDocs) {
      const extracted = await extractPdfText(doc.pdfDoc);
      combinedText += extracted.text + "\n";
      combinedPages = combinedPages.concat(extracted.pages);
    }
    const matches = extractNofFieldsFromText(combinedText, combinedPages);

    // This can run before the Opportunity Form has ever been opened, so the project-linked/
    // placeholder defaults (dateOwnerProject's "[Owner]" text included) may not exist yet —
    // apply them first so the substitution below has something to work with, and so the
    // linked-field badges are already correct on first open.
    applyOpportunityDefaults(project);
    const data = project.opportunity;
    data._extracted = data._extracted || {};
    const matchedFieldIds = [];
    Object.keys(matches).forEach((fieldId) => {
      const current = data[fieldId];
      if (current === undefined || current === null || String(current).trim() === "") {
        data[fieldId] = matches[fieldId];
        data._extracted[fieldId] = true;
        // A field can be both project-linked and extractable (bidDate, from the Bid Due Date —
        // see NOF_LINKED_FIELDS above). Demote its link once extraction fills it, or the next
        // applyOpportunityDefaults() call (e.g. opening this same dialog) would stomp the
        // extracted value back to the project-linked default, most often blanking it again.
        if (data._linked) data._linked[fieldId] = false;
        matchedFieldIds.push(fieldId);
      }
    });

    // The composite "Date + Owner + Project Name" field auto-fills with an "[Owner]"
    // placeholder when the project is created (applyOpportunityDefaults) — swap in the real
    // owner name now that we have one, but only if that placeholder is still sitting there
    // untouched, so a manually-edited value is never overwritten.
    if (matches.ownerCompany && typeof data.dateOwnerProject === "string" && data.dateOwnerProject.includes("[Owner]")) {
      data.dateOwnerProject = data.dateOwnerProject.replace("[Owner]", matches.ownerCompany);
      data._extracted.dateOwnerProject = true;
      matchedFieldIds.push("dateOwnerProject");
    }

    // Same swap for the Precon Start Up Form's own composite identifier field, in case a
    // contract's already been uploaded and that's the active form for this project.
    applyPreconDefaults(project);
    const pdata = project.precon;
    if (matches.ownerCompany && typeof pdata.projectIdentifier === "string" && pdata.projectIdentifier.includes("[Owner]")) {
      pdata.projectIdentifier = pdata.projectIdentifier.replace("[Owner]", matches.ownerCompany);
    }

    documentExtractionResults.set(project.id, { matchedFieldIds, hasText: combinedText.trim().length > 0 });
    saveState();
  }

  // The Contract is the one document that can actually name the real Client party (drawings and
  // specs almost never do — "OWNER" callouts on a sheet are about who furnishes/installs an
  // item, not who the client is), so Client info is read from here specifically rather than
  // folded into the Drawings/Specifications-derived Owner/AEC data in project.opportunity.
  async function runContractClientExtraction(project) {
    const contractDoc = getProjectDocument(project, "contract");
    if (!contractDoc) return;
    const extracted = await extractPdfText(contractDoc.pdfDoc);
    const matches = extractNofFieldsFromText(extracted.text, extracted.pages);
    const client = {};
    ["ownerCompany", "ownerContactName", "ownerAddress", "ownerCityStateZip", "ownerPhone", "ownerEmail"].forEach((f) => {
      if (matches[f]) client[f] = matches[f];
    });
    if (Object.keys(client).length) project.contractClient = client;
  }

  async function processDocumentSlotUpload(project, slotId, fileList) {
    const pdfjsLib = await waitForPdfJs();
    if (!pdfjsLib) throw new Error("The PDF-reading library didn't load — check your internet connection");

    const files = Array.from(fileList);
    const sourceNames = files.map((f) => f.name);
    const file = files.length > 1 ? await mergeConformedSetFiles(files) : files[0];

    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
    projectDocuments.set(documentKey(project.id, slotId), { file, sourceNames, pdfDoc, numPages: pdfDoc.numPages });

    if (slotId === "contract") {
      // The contract's mere presence is the trigger — see itemApplies's "HasContract"/
      // "NoContract" conditions — so this has to be persisted, not just kept in the
      // in-memory-only projectDocuments map, or reloading the page would silently switch the
      // project back to the New Opportunity Form path.
      project.contractUploaded = true;
      project.contractFileName = sourceNames.length > 1 ? sourceNames.join(" + ") : sourceNames[0];
      await runContractClientExtraction(project);
      saveState();
    } else {
      await runDocumentExtraction(project);
      if (slotId === "drawings") await ensureKickoffThumbnailsFromDrawings(project);
    }
  }

  function renderDocumentUploadRow(project, slotId, label, onUpdate) {
    const doc = getProjectDocument(project, slotId);

    const wrap = document.createElement("div");
    wrap.className = "nof-doc-upload-wrap";

    const row = document.createElement("div");
    row.className = "kickoff-upload-row";

    const labelEl = document.createElement("span");
    labelEl.className = "kickoff-upload-label";
    labelEl.textContent = label;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.multiple = true;
    input.title = "Select multiple files to merge them into one PDF automatically";

    const status = document.createElement("span");
    status.className = "kickoff-upload-status";
    status.textContent = doc
      ? `${doc.sourceNames.length > 1 ? doc.sourceNames.join(" + ") : doc.file.name} (${doc.numPages} page${doc.numPages === 1 ? "" : "s"})`
      : "No file attached";

    input.addEventListener("change", async () => {
      const files = input.files;
      if (!files || !files.length) return;
      status.textContent = files.length > 1 ? `Merging ${files.length} files…` : "Reading " + files[0].name + "…";
      try {
        await processDocumentSlotUpload(project, slotId, files);
      } catch (err) {
        await miniAlert("Couldn't read that PDF: " + (err && err.message ? err.message : err));
      }
      onUpdate();
    });

    row.appendChild(labelEl);
    row.appendChild(input);
    row.appendChild(status);

    if (doc) {
      const viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className = "btn btn-sm";
      viewBtn.textContent = "View Pages";
      viewBtn.addEventListener("click", () => openNofDocViewer(project, slotId));
      row.appendChild(viewBtn);
    }

    wrap.appendChild(row);

    if (doc && doc.sourceNames.length > 1) {
      const mergedNote = document.createElement("div");
      mergedNote.className = "nof-doc-note";
      mergedNote.textContent = `Merged from ${doc.sourceNames.length} files, in this order: ${doc.sourceNames.join(", ")}. ` +
        `This only combines pages — it doesn't add Bluebeam bookmarks or page labels, so that part still has to be done by hand in Bluebeam.`;
      wrap.appendChild(mergedNote);
    }

    return wrap;
  }

  function renderDocumentsSection(project) {
    const wrap = document.createElement("div");
    wrap.className = "documents-section";

    const title = document.createElement("div");
    title.className = "documents-section-title";
    title.textContent = "Documents";
    wrap.appendChild(title);

    const intro = document.createElement("p");
    intro.className = "nof-doc-intro";
    intro.textContent = "Upload once here — every form on this board that reads from documents (New Opportunity Form, " +
      "Precon Start Up Form, Kickoff/Bid Day Package) pulls from these same three slots. Any design stage works for " +
      "Drawings. If a signed Contract is uploaded, the Precon Start Up Form replaces the New Opportunity Form for this " +
      "project — the Bond Request and Builder's Risk Request also read from whichever of those is in use.";
    wrap.appendChild(intro);

    const onUpdate = () => {
      renderProjectList();
      renderActiveProject();
      if (opportunityDialog.open && opportunityProjectId === project.id) {
        renderOpportunityBody(project);
        updateOpportunityProgressLabel(project);
      }
      if (preconDialog.open && preconProjectId === project.id) {
        renderPreconBody(project);
        updatePreconProgressLabel(project);
      }
    };

    DOCUMENT_SLOTS.forEach((slot) => {
      wrap.appendChild(renderDocumentUploadRow(project, slot.id, slot.label, onUpdate));
    });

    const extraction = documentExtractionResults.get(project.id);
    if (extraction) {
      const { matchedFieldIds, hasText } = extraction;
      const names = matchedFieldIds.map(nofFieldLabelFor);
      const note = document.createElement("div");
      note.className = "nof-doc-note";
      if (names.length > 0) {
        note.textContent = `Pulled ${names.length} field${names.length === 1 ? "" : "s"} from Drawings/Specifications: ` +
          `${names.join(", ")}. Only fields that were still blank got filled in — please verify them.`;
      } else if (!hasText) {
        note.textContent = `No selectable text found — the drawings are likely fully scanned/rasterized. ` +
          `Use "View Pages" to read them and fill in fields by hand.`;
      } else {
        note.textContent = `Found text, but couldn't confidently match it to any fields. Use "View Pages" to read it and fill in by hand.`;
      }
      wrap.appendChild(note);
    }

    return wrap;
  }

  // Shown inside the New Opportunity Form and Precon Start Up Form dialogs — both extract from
  // the same central Drawings/Specifications upload, so instead of their own upload control
  // they just point at it and offer a shortcut to view pages if something's already attached.
  function renderSourceDocsNote(project) {
    const wrap = document.createElement("div");
    wrap.className = "nof-doc-upload-wrap";

    const intro = document.createElement("p");
    intro.className = "nof-doc-intro";
    intro.textContent = "Fields below are filled in from the Drawings/Specifications uploaded at the top of the page " +
      "— only fields that are still blank get filled in, and it's a best-effort text scan, not real reading " +
      "comprehension, so always double-check anything pulled in.";
    wrap.appendChild(intro);

    const row = document.createElement("div");
    row.className = "item-inline-actions";
    ["drawings", "specifications"].forEach((slotId) => {
      const doc = getProjectDocument(project, slotId);
      if (!doc) return;
      const slotLabel = (DOCUMENT_SLOTS.find((s) => s.id === slotId) || {}).label;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm";
      btn.textContent = `View ${slotLabel} Pages`;
      btn.addEventListener("click", () => openNofDocViewer(project, slotId));
      row.appendChild(btn);
    });
    if (row.children.length) wrap.appendChild(row);

    return wrap;
  }

  function openNofDocViewer(project, slotId) {
    // Deliberately does NOT closeAllDialogs — nests on top of whichever dialog is already open,
    // the same way the Kickoff zoom nests on top of the Kickoff dialog (and can be opened
    // without any other dialog open at all, straight from the Documents section).
    const doc = getProjectDocument(project, slotId);
    if (!doc) return;
    nofDocViewerState = { projectId: project.id, slotId, pageIndex: 0 };
    nofDocViewerDialog.showModal();
    renderNofDocViewerPage();
  }

  function stepNofDocViewer(delta) {
    const doc = getProjectDocument({ id: nofDocViewerState.projectId }, nofDocViewerState.slotId);
    if (!doc) return;
    const next = nofDocViewerState.pageIndex + delta;
    if (next < 0 || next >= doc.numPages) return;
    nofDocViewerState.pageIndex = next;
    renderNofDocViewerPage();
  }

  async function renderNofDocViewerPage() {
    const doc = getProjectDocument({ id: nofDocViewerState.projectId }, nofDocViewerState.slotId);
    if (!doc) return;
    const pageIndex = nofDocViewerState.pageIndex;
    const slotLabel = (DOCUMENT_SLOTS.find((s) => s.id === nofDocViewerState.slotId) || {}).label || "Document";

    nofDocViewerLabel.textContent = `${slotLabel} — page ${pageIndex + 1} of ${doc.numPages}`;
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

  // Gates the Bond Request and Builder's Risk Request affordances — per Rachel's workflow,
  // both only make sense once whichever primary form applies to this project (New Opportunity
  // Form, or Precon Start Up Form if a contract's been uploaded) actually has something in it.
  function isPrimaryFormStarted(project) {
    return countOpportunityFieldsFilled(project).filled > 0 || countPreconFieldsFilled(project).filled > 0;
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

    opportunityFormBody.appendChild(renderSourceDocsNote(project));

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
        autoBadge.className = "nof-auto-badge nof-extract-badge";
        autoBadge.textContent = "From Conformed Set";
        autoBadge.title = "Pulled from the uploaded conformed set — please verify.";
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

    if (typeof PDFLib === "undefined") {
      await miniAlert("The PDF library didn't load (check your internet connection) — your entries are still saved in the app.");
      return;
    }

    const exportBtn = document.getElementById("exportOpportunityBtn");
    const originalLabel = exportBtn.textContent;
    exportBtn.disabled = true;
    exportBtn.textContent = "Exporting…";

    try {
      const blob = await buildOpportunityPdf(project);
      await offerDownload(`${sanitizeFilename(project.name)}_New_Opportunity_Form.pdf`, blob);
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = originalLabel;
    }
  }

  function sanitizeFilename(name) {
    return (name || "Project").replace(/[\\/:*?"<>|]+/g, "").trim().replace(/\s+/g, "_");
  }

  async function buildOpportunityPdf(project) {
    const { PDFDocument, StandardFonts } = PDFLib;
    const data = project.opportunity || {};
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const b = createPdfFormBuilder(doc, font, boldFont);

    b.title("New Opportunity Form");
    b.subtitle(`${project.name} — ${project.location}   ·   Exported ${formatDate(new Date())}`);
    b.spacer(6);

    b.sectionBar("General Information");
    NOF_GENERAL_ROWS.forEach((row) => {
      b.twoCol(
        row.left ? row.left.label : "", row.left ? formatFieldValueForPdf(row.left, data[row.left.id]) : null,
        row.right ? row.right.label : null, row.right ? formatFieldValueForPdf(row.right, data[row.right.id]) : null
      );
    });
    b.spacer(8);

    b.sectionBar("Owner Information  /  AEC Team");
    NOF_OWNER_AEC_ROWS.forEach((row) => {
      b.twoCol(
        row.left ? row.left.label : "", row.left ? formatFieldValueForPdf(row.left, data[row.left.id]) : null,
        row.right ? row.right.label : null, row.right ? formatFieldValueForPdf(row.right, data[row.right.id]) : null
      );
    });
    b.spacer(8);

    b.sectionBar("Opportunity Description & Notes");
    b.wrappedBlock(null, data.description || "—");
    b.spacer(8);

    b.sectionBar("Finance Team Contacts");
    NOF_FINANCE_CONTACTS.forEach((c) => {
      b.fieldLine(c.region, c.name, 200);
    });

    const bytes = await doc.save();
    return new Blob([bytes], { type: "application/pdf" });
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
