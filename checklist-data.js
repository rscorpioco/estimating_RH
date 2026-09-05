// CM Project Startup Checklist data
// Transcribed from Scorpio Corporation's preconstruction workflow ("first principles" revision).
// `dueOffsetDays` is used to compute a target date from the project's Activate date.
// `condition` ("CM" | "HardBid") hides an item when the project's delivery method doesn't match —
// items with no `condition` always apply. "If needed" items are judgment calls, so they're never
// auto-hidden — that qualifier stays in the item text instead.

// Day 0 is the trigger event itself (deliverable package received / kickoff) —
// it isn't a checklist phase, just the reference point every phase's day count is measured from.
const DAY_ZERO_LABEL = "Day 0 — Receipt of Deliverable Package / Kickoff Meeting";

const CHECKLIST_PHASES = [
  {
    id: "activate",
    name: "Activate",
    deadlineLabel: "Day 0–4",
    activity: "Opportunity Form · High-Level Analysis · Procore Setup · Team Coordination",
    dueOffsetDays: 4,
    items: [
      {
        id: "act-1",
        group: "1 · New Opportunity Form & Procore Request",
        text: "Complete new opportunity form and send to ATF for Procore creation",
      },

      {
        id: "act-bluebeam",
        group: "2 · High-Level Analysis (While Waiting on ATF)",
        text: "Create documentation efficiencies through Bluebeam — bookmarks, page labels, etc. (required for Destini to read the construction plans)",
        sub: [
          {
            text: "Look for conflicting info — missing pages, upside-down pages, missing specifications, etc.",
            sub: [{ text: "Keep the RFI log open to begin tracking anything found" }],
          },
          { text: "Look for niche information such as site visits, sealed bids, bid requirements, RFI deadline, etc." },
        ],
      },
      {
        id: "act-destini",
        group: "2 · High-Level Analysis (While Waiting on ATF)",
        text: "Create the project in Destini take-off software (only once documentation efficiencies are done)",
        sub: [{ text: "Roughly estimate the cost of Staffing & GCs" }],
      },
      { id: "act-6slevel", group: "2 · High-Level Analysis (While Waiting on ATF)", text: "Create 6S Level Assignments" },
      { id: "act-bidpkgs", group: "2 · High-Level Analysis (While Waiting on ATF)", text: "Create Bid Packages" },
      {
        id: "act-rfideadline",
        group: "2 · High-Level Analysis (While Waiting on ATF)",
        text: "Establish the RFI bid deadline for subcontractors and time-block a reminder",
      },
      {
        id: "act-curatedsublist",
        group: "2 · High-Level Analysis (While Waiting on ATF)",
        condition: "CM",
        text: "Distribute the Curated Sub List to Leadership and Project/Field Managers for approval and input (email)",
      },
      {
        id: "act-timeblocktakeoff",
        group: "2 · High-Level Analysis (While Waiting on ATF)",
        text: "Time-block take-off completion (Day 4 through Day 12)",
      },
      {
        id: "act-staffgcreview",
        group: "2 · High-Level Analysis (While Waiting on ATF)",
        text: "Coordinate the Staff & GC estimate review with VP Precon (Day 4, meeting invite)",
      },
      {
        id: "act-takeoffreview",
        group: "2 · High-Level Analysis (While Waiting on ATF)",
        text: "Coordinate the take-off estimate review with VP Precon (Day 13, meeting invite)",
        sub: [{ text: "Ideally the take-off is fully complete so the VP can plug in numbers to build the Precon estimate" }],
      },
      {
        id: "act-preconreview",
        group: "2 · High-Level Analysis (While Waiting on ATF)",
        text: "Coordinate the Precon estimate review with Leadership (Day 14/15, meeting invite)",
      },
      {
        id: "act-updatetracker",
        group: "2 · High-Level Analysis (While Waiting on ATF)",
        text: "Update the Pre Con Live Project Tracker",
      },

      {
        id: "act-procorefolders",
        group: "3 · Once Procore Is Created — Share Project Info",
        text: "Create Procore folders and upload contract documents and Scorpio sub docs",
      },
      {
        id: "act-itbpackages",
        group: "3 · Once Procore Is Created — Share Project Info",
        text: "Create ITB bid packages within Procore and invite to bid",
        sub: [{ text: "(Hard Bid only) Include the 01 Plan Room bid package — brings in companies that will send out ITBs on our behalf, for maximum coverage" }],
      },
      {
        id: "act-uploaddocs",
        group: "3 · Once Procore Is Created — Share Project Info",
        text: "Upload drawings and specifications into Procore",
        sub: [
          { text: "Precon uses Destini for estimating; the rest of Scorpio uses Procore to view documents" },
          { text: "This is not the subs' document section — only the internal team finds docs here" },
        ],
      },
      {
        id: "act-procorepeople",
        group: "3 · Once Procore Is Created — Share Project Info",
        text: "Confirm the proper people have been added to the project in Procore (6S Level team members, etc.)",
      },

      {
        id: "act-confirm6steam",
        group: "4 · Coordinate the Non-Precon Team",
        text: "Confirm the 6S Level team in an email to the project team (Project Manager, Project Op Leader, Leadership, Field Manager)",
      },
      {
        id: "act-schedrequest",
        group: "4 · Coordinate the Non-Precon Team",
        text: "Request the project schedule and logistics plan from the Project Manager, Field Manager, and VP of Field Ops (email with a meeting to set a deadline)",
      },
      { id: "act-sitevisit", group: "4 · Coordinate the Non-Precon Team", text: "(If needed) Coordinate a Site Visit (meeting)" },
      { id: "act-bidrunner", group: "4 · Coordinate the Non-Precon Team", text: "(If needed) Coordinate a bid runner for sealed bids and its deadline (meeting)" },
      {
        id: "act-bidformreview",
        group: "4 · Coordinate the Non-Precon Team",
        text: "(If needed) Communicate the review of any bid form requirements to the proper leadership (email + meeting invite)",
        sub: [{ text: "We complete the forms and have LT sign; coordinate their finalization as well" }],
      },
      { id: "act-constructreview", group: "4 · Coordinate the Non-Precon Team", text: "(If needed) Coordinate a constructability review (meeting)" },
      {
        id: "act-levelbidday",
        group: "4 · Coordinate the Non-Precon Team",
        text: "Coordinate Level/Bid Day plus lunch — email ATF and Lead (Day 21)",
      },
      {
        id: "act-kickoff",
        group: "4 · Coordinate the Non-Precon Team",
        text: "Coordinate the Kick Off Meeting — invite the 6S team and Project team (Day 3)",
      },

      {
        id: "act-bidmanualblock",
        group: "5 · Coordinate PreCon & Yourself",
        condition: "CM",
        text: "Time-block bid manual creation (Day 16) — must be at least 7 days prior to the subcontractor bid deadline (check against your Bid Due Date)",
      },
      {
        id: "act-nicheeventblock",
        group: "5 · Coordinate PreCon & Yourself",
        text: "Time-block any niche events such as bid requirements review, Bid Risk Calculator work, etc.",
      },

      { id: "act-planhub", group: "6 · Niche Tasks", condition: "HardBid", text: "Create the project on Plan Hub" },
      {
        id: "act-advertise",
        group: "6 · Niche Tasks",
        condition: "CM",
        text: "Create the bidding advertisement per FL Statute Chapter 255, Section 0525 — must run as a legal notice in at least one medium at least 30 days before the advertised bid opening (by owner)",
      },
      {
        id: "act-pageturn",
        group: "6 · Niche Tasks",
        condition: "CM",
        text: "Coordinate a Page Turn with Leadership and the Owner (meeting)",
      },
      {
        id: "act-buildersrisk",
        group: "6 · Niche Tasks",
        text: "(If needed) Obtain the Builder's Risk Quote",
        sub: [
          {
            text: "Email doug.johnson1@hubinternational.com; kyle.whitman@hubinternational.com; andrea.kioutas@hubinternational.com",
            link: "mailto:doug.johnson1@hubinternational.com,kyle.whitman@hubinternational.com,andrea.kioutas@hubinternational.com",
          },
          { text: "DD Set/Hard Bid; projects over $2M need a quote — under $2M is covered under the blanket policy" },
        ],
      },
      {
        id: "act-bond",
        group: "6 · Niche Tasks",
        text: "(If needed) Obtain the Bond Quote",
        sub: [{ text: "Email Bill Palmer, Hatcher Insurance", link: "mailto:bpalmer@hatcherins.com" }],
      },
      {
        id: "act-permit",
        group: "6 · Niche Tasks",
        text: "(If needed) Confirm permit cost with the local Authority Having Jurisdiction (AHJ)",
      },
    ],
  },
  {
    id: "discovery",
    name: "Discovery",
    deadlineLabel: "Day 5–13",
    activity: "Take-Offs · Scope Coverage · Level Sheets",
    dueOffsetDays: 13,
    items: [
      { id: "dis-takeoffs", text: "Begin take-offs immediately after the Kick Off Meeting" },
      { id: "dis-trackdeadlines", text: "Track upcoming deadlines — take-off completion, take-off estimate review" },
      { id: "dis-6sscope", text: "Update the 6S team on scope coverage" },
      { id: "dis-levelsheets", text: "Create/update level sheets" },
      { id: "dis-bidmanual", condition: "CM", text: "Build the bid manual" },
      { id: "dis-bidreq", text: "(If needed) Finalize bid requirements" },
      { id: "dis-rfilog", text: "Keep the RFI log current" },
    ],
  },
  {
    id: "details",
    name: "Details",
    deadlineLabel: "Day 14–21",
    activity: "Bid Risk · Value Analysis · Qualifications & Assumptions",
    dueOffsetDays: 21,
    items: [
      { id: "det-bidrisk", text: "Update the Bid Risk Calculator" },
      { id: "det-valog", condition: "CM", text: "Update the VA Log" },
      { id: "det-trackdeadlines", text: "Track upcoming deadlines — Precon estimate review, Level/Bid Day" },
      { id: "det-qualassumptions", text: "Draft Qualifications and Assumptions" },
      { id: "det-deliverabledrafts", condition: "CM", text: "Draft the deliverable" },
    ],
  },
  {
    id: "done",
    name: "Done",
    deadlineLabel: "Day 21+",
    activity: "Final Review · Submission · Post-Bid",
    dueOffsetDays: 21,
    items: [
      { id: "done-edit", text: "Edit the deliverable based on review feedback" },
      { id: "done-reviewedited", text: "Review the edited deliverable" },
      { id: "done-submit", text: "After approval, submit the deliverable/hard bid to the owner" },
      {
        id: "done-postbid",
        text: "Post-bid items",
        sub: [
          { text: "Verify that all proposals have been saved to the O Drive" },
          { text: "Create \"Late Bids\" folder on server" },
          { text: "Review/distribute late bids" },
          { text: "Update Procore subcontractor bid status and proposal status" },
          { text: "E-mail list of new subs to Procore administrator for creation" },
          { text: "Data mine subcontractor proposals for relevant unit costs. Update unit costs database" },
          { text: "Actual Delivered Folder — save BRC + print Sage Bid Day detailed estimate and summary" },
        ],
      },
    ],
  },
];

const LOCATIONS = ["Gainesville", "Tallahassee", "Orlando", "Jacksonville", "Ocala"];
const DELIVERY_METHODS = ["CM at Risk (Interview)", "Hard Bid"];
const TEAM_LEAD_OPTIONS = ["Kevin Bradford", "Ken Brown", "Blake Honerbrink", "Carlos Vazquez", "Rachel Hottor"];

// ---------- Meeting & Task Schedule ----------
// Timing rules for the calendar invites/tasks that have a fixed, computable date — all anchored to
// the project's Activate Date (Day 0) per the first-principles day count.
// `time` is 24-hour "HH:MM" for a fixed-time event, or null for an all-day/undated task.
const SCHEDULE_RULES = [
  {
    id: "kickoff",
    label: "Calendar Invite: Kick Off Meeting",
    anchor: "activate",
    offsetDays: 3,
    time: "15:30",
    type: "external",
    note: "Invite the 6S team and Project team",
  },
  {
    id: "staffgcreview",
    label: "Meeting Invite: Staff & GC Estimate Review (VP Precon)",
    anchor: "activate",
    offsetDays: 4,
    time: null,
    allDay: true,
    type: "external",
  },
  {
    id: "takeoffreview",
    label: "Meeting Invite: Take-Off Estimate Review (VP Precon)",
    anchor: "activate",
    offsetDays: 13,
    time: null,
    allDay: true,
    type: "external",
    note: "Ideally the take-off is fully complete so the VP can build the Precon estimate",
  },
  {
    id: "preconreview",
    label: "Meeting Invite: Precon Estimate Review (Leadership)",
    anchor: "activate",
    offsetDays: 14,
    time: null,
    allDay: true,
    type: "external",
    note: "Day 14/15 — shown at the earlier date",
  },
  {
    id: "bidmanualblock",
    label: "Time Block: Bid Manual Creation",
    anchor: "activate",
    offsetDays: 16,
    time: null,
    allDay: true,
    type: "self",
    condition: "CM",
    note: "Must be ≥ 7 days before the subcontractor bid deadline — verify against your Bid Due Date",
  },
  {
    id: "bidLevelDay",
    label: "Calendar Invite: Level Day / Bid Day",
    anchor: "activate",
    offsetDays: 21,
    time: null,
    allDay: true,
    type: "external",
    note: "Level Day for CMAR, Bid Day for Hard Bid — plus lunch; email ATF and Lead",
  },
];

// ---------- Kickoff / Bid Day Package ----------
// The set of drawing categories a kickoff/bid-day package is built from, in the order
// they get compiled — matches the standard cover-sheet layout used on real projects.
const KICKOFF_PACKAGE_SECTIONS = ["Aerial", "Site Plan", "Floor Plan", "Exterior Elevations", "Building Section", "Wall Section"];

const KICKOFF_FIELDS = [
  { id: "bidDayDate", label: "Level Day / Bid Day Date", type: "date" },
  { id: "bidDayTime", label: "Level Day / Bid Day Time", type: "time" },
  { id: "projectAddress", label: "Project Address", type: "text" },
  { id: "rfiDueBy", label: "RFIs Due By", type: "date" },
  { id: "subBidsDueDate", label: "Sub Bids Due Date", type: "date" },
  { id: "subBidsDueTime", label: "Sub Bids Due Time", type: "time" },
  { id: "bidsGoodForDays", label: "Bids Must Be Good For (days)", type: "number" },
  { id: "schedule", label: "Schedule", type: "text" },
  { id: "liquidatedDamages", label: "Liquidated Damages", type: "text" },
  { id: "certifications", label: "Certifications, Background Checks, etc.", type: "text" },
  { id: "architect", label: "Architect", type: "text" },
  { id: "mep", label: "MEP", type: "text" },
  { id: "civilLandscape", label: "Civil & Landscape", type: "text" },
  { id: "structural", label: "Structural", type: "text" },
  { id: "alternates", label: "Alternates", type: "textarea" },
];

// ---------- New Opportunity Form ----------
// Field layout, section grouping, and dropdown option lists transcribed from
// Scorpio's "Project Tracker" workbook ("New Opportuity Form" + "New Opp Value List" tabs).
// excelCell/excelLabelCell map each field back to the template's coordinates for export.

const NOF_OFFICE_CODES = { Gainesville: "GNV", Tallahassee: "TAL", Orlando: "ORL", Jacksonville: "JAX", Ocala: "OCALA" };

const NOF_STAGE_OPTIONS = [
  "Rumor", "Prospecting", "Invitation to Bid Received", "Received RFQ/RFP", "Submitted Bid",
  "Preparation", "Submitted RFP", "Submitted RFQ", "Shortlisted", "Interviewed",
  "Won", "Closed-Won", "Closed-Lost", "Inactive-Did not Pursue",
];

const NOF_DELIVERY_METHOD_OPTIONS = ["Hard Bid", "CM", "Design Build", "Continuing Services Contract"];

const NOF_CONTRACT_TYPE_OPTIONS = [
  "GMP", "Bid", "Proposal", "Statement of Qualifications", "Budget & Scope", "Preliminary Estimate",
];

const NOF_YES_NO = ["Yes", "No"];

const NOF_OFFICE_LOCATION_OPTIONS = ["GNV", "OCALA", "TAL", "JAX", "ORL"];

const NOF_PRIMARY_CATEGORY_OPTIONS = [
  "Athletics", "Collegiate/Student Housing", "Commercial/Private Sector", "Healthcare",
  "Higher Education", "K-12 Education", "Local and State Government", "Mixed Use Development", "NA",
];

const NOF_SECONDARY_CATEGORY_OPTIONS = [
  "Academic Building", "Academic Medical Building", "Airport", "Apartments", "Athletic Facility",
  "Auditorium", "Automotive", "Biomedical", "Biotech", "Cafeteria", "Charter School", "Childcare",
  "Church", "Classroom", "Clean Room", "Clinic", "Convention Center", "Correctional Facility",
  "Courthouse", "Dining Facility", "Dormitory", "Elementary School", "Emergency Operations Center",
  "Fire Station", "Food Processing", "Hangar", "Hazardous Waste", "High School", "Hospital", "Hotel",
  "Judicial Center", "Laboratory", "Library", "Locker Room", "Manufacturing", "Medical Office Building",
  "Middle School", "Military", "Museum", "Office Building", "Park", "Parking Lot/Garage",
  "Police Station", "Restaurant", "Retail", "Retirement Community", "Shopping Plaza",
  "Sorority/Fraternity", "Stadium", "Streets and Highways", "Technology Space", "Theater", "Utility",
  "Veterinary Services", "Warehouse", "Water/Waste Water Treatment", "NA",
];

const NOF_STAFF_OPTIONS = [
  "Aaron Rogers", "Ana Palm", "Andy Cowart", "Antonio Franzese", "April Prescott", "Bayley Main",
  "Brandon Hochwender", "Brandon Phillips", "Casie Carlisle", "Catherine Moreira", "Chris Lewis",
  "Chris Smith", "Christian Fernandez", "Cole Studstill", "Colleen Koeppen", "Dan McDonough",
  "Daniel Wellhausen", "David Boe", "Dominique Wilkerson", "Don Kellogg", "Ed MacLeod", "Elma Mesic",
  "Erik Anderson", "Erik McDonald", "Evan Scruggs", "Fletcher Teague", "Frankie Sagarese",
  "Freddy Kussel", "Guillermo Cochrane", "Hunter Folsom", "Jason Russell", "Jaziel Ortiz",
  "Jeff Lajza", "Jenna Hollingsworth", "Jesse Bright", "Joe Justino", "Johnathan Wilkes",
  "Josh Phillips", "Justin Zambelli", "Keelan Gano", "Ken Brown", "Kevin Bradford", "Kyle Trexler",
  "Lindsey Barber", "Logan Gertner", "Luis Carvajal", "Mark Winger", "Matt Layton", "Matthew Clark",
  "Maverick Maensivu", "Michael Minotti", "Michael Ostagne", "Michael Rhodes", "Miguel Hernandez",
  "Nate Watson", "Neil Thompson", "Nick Panzica", "Paul Shealy", "Peter Giebeig", "Rachel Hottor",
  "Ricky Buxton", "Rob Collins", "Ryan Stroh", "Ryan Taylor", "Shayne Reynolds", "Thomas Kircher",
  "Tracy Koller", "Trinity Hatcher", "Troy Underhill", "Tyler Hacker", "Warren Loudermilk",
  "Will Cooley", "Zach Corda",
];

const NOF_FINANCE_CONTACTS = [
  { region: "Gainesville - Majors", name: "Maegan Jones" },
  { region: "Gainesville - Minors", name: "Heath Locklear" },
  { region: "Jacksonville", name: "Mari Rivera" },
  { region: "Orlando", name: "Shanice Spalding" },
  { region: "Tallahassee", name: "Mari Rivera" },
];

// Row-paired field layout mirroring the template's B/C (left) and E/F (right) columns.
// excelRow is the template row number for both the label and value cell in that pair.
const NOF_GENERAL_ROWS = [
  { excelRow: 4,
    left: { id: "dateOwnerProject", label: "Date (YY-MM-DD) + Owner + Project Name", type: "text", labelCell: "B4", valueCell: "C4" },
    right: { id: "pcPoManager", label: "PC/PO Manager", type: "select", options: NOF_STAFF_OPTIONS, labelCell: "E4", valueCell: "F4" } },
  { excelRow: 5,
    left: null,
    right: { id: "formDate", label: "Date", type: "date", labelCell: "E5", valueCell: "F5" } },
  { excelRow: 6,
    left: { id: "stage", label: "Stage", type: "select", options: NOF_STAGE_OPTIONS, labelCell: "B6", valueCell: "C6" },
    right: { id: "deliveryMethodNOF", label: "Delivery Method", type: "select", options: NOF_DELIVERY_METHOD_OPTIONS, labelCell: "E6", valueCell: "F6" } },
  { excelRow: 7,
    left: { id: "bidDate", label: "Bid Date (Expected or Actual)", type: "date", labelCell: "B7", valueCell: "C7" },
    right: { id: "contractType", label: "Contract Type", type: "select", options: NOF_CONTRACT_TYPE_OPTIONS, labelCell: "E7", valueCell: "F7" } },
  { excelRow: 8,
    left: { id: "estStartDate", label: "Estimated Start Date", type: "date", labelCell: "B8", valueCell: "C8" },
    right: { id: "bidSupplementRequired", label: "Bid Supplement Required?", type: "select", options: NOF_YES_NO, labelCell: "E8", valueCell: "F8" } },
  { excelRow: 9,
    left: { id: "estCompletionDate", label: "Estimated Completion Date", type: "date", labelCell: "B9", valueCell: "C9" },
    right: { id: "buildersRiskRequired", label: "Builders Risk Standalone Required?", type: "select", options: NOF_YES_NO, labelCell: "E9", valueCell: "F9" } },
  { excelRow: 10,
    left: { id: "estProjectValue", label: "Estimated Project Value", type: "currency", labelCell: "B10", valueCell: "C10" },
    right: { id: "bidBondRequired", label: "Bid Bond Required?", type: "select", options: NOF_YES_NO, labelCell: "E10", valueCell: "F10" } },
  { excelRow: 11,
    left: { id: "projectSqFt", label: "Project Square Footage", type: "number", labelCell: "B11", valueCell: "C11" },
    right: { id: "primaryCategory", label: "Primary Category", type: "select", options: NOF_PRIMARY_CATEGORY_OPTIONS, labelCell: "E11", valueCell: "F11" } },
  { excelRow: 12,
    left: { id: "jobsiteAddress", label: "Jobsite Address", type: "text", labelCell: "B12", valueCell: "C12" },
    right: { id: "secondaryCategory", label: "Secondary Category", type: "select", options: NOF_SECONDARY_CATEGORY_OPTIONS, labelCell: "E12", valueCell: "F12" } },
  { excelRow: 13,
    left: { id: "jobsiteCityStateZip", label: "Jobsite City, State ZIP", type: "text", labelCell: "B13", valueCell: "C13" },
    right: { id: "officeLocation", label: "Office Location", type: "select", options: NOF_OFFICE_LOCATION_OPTIONS, labelCell: "E13", valueCell: "F13" } },
];

const NOF_OWNER_AEC_ROWS = [
  { excelRow: 15,
    left: { id: "ownerCompany", label: "Company", type: "text", labelCell: "B15", valueCell: "C15" },
    right: { id: "architectCo", label: "Architect (Company)", type: "text", labelCell: "E15", valueCell: "F15" } },
  { excelRow: 16,
    left: { id: "ownerContactName", label: "Name", type: "text", labelCell: "B16", valueCell: "C16" },
    right: { id: "architectContactName", label: "Name", type: "text", labelCell: "E16", valueCell: "F16" } },
  { excelRow: 17,
    left: { id: "ownerAddress", label: "Address", type: "text", labelCell: "B17", valueCell: "C17" },
    right: { id: "architectAddress", label: "Address", type: "text", labelCell: "E17", valueCell: "F17" } },
  { excelRow: 18,
    left: { id: "ownerCityStateZip", label: "City, State ZIP", type: "text", labelCell: "B18", valueCell: "C18" },
    right: { id: "architectCityStateZip", label: "City, State ZIP", type: "text", labelCell: "E18", valueCell: "F18" } },
  { excelRow: 19,
    left: { id: "ownerPhone", label: "Phone", type: "text", labelCell: "B19", valueCell: "C19" },
    right: { id: "architectPhone", label: "Phone", type: "text", labelCell: "E19", valueCell: "F19" } },
  { excelRow: 20,
    left: { id: "ownerEmail", label: "Email", type: "text", labelCell: "B20", valueCell: "C20" },
    right: { id: "architectEmail", label: "Email", type: "text", labelCell: "E20", valueCell: "F20" } },
  { excelRow: 21,
    left: { id: "ownersRepName", label: "Owner's Rep. Name", type: "text", labelCell: "B21", valueCell: "C21" },
    right: { id: "civilEngineerCo", label: "Civil Engineer Co.", type: "text", labelCell: "E21", valueCell: "F21" } },
  { excelRow: 22,
    left: { id: "ownersRepPhone", label: "Owner's Rep. Phone", type: "text", labelCell: "B22", valueCell: "C22" },
    right: { id: "civilEngineerName", label: "Name of Civil Engineer", type: "text", labelCell: "E22", valueCell: "F22" } },
  { excelRow: 23,
    left: { id: "ownersRepEmail", label: "Owner's Rep. Email", type: "text", labelCell: "B23", valueCell: "C23" },
    right: { id: "structuralEngineerCo", label: "Structural Engineer Co.", type: "text", labelCell: "E23", valueCell: "F23" } },
  { excelRow: 24,
    left: { id: "renderingsExist", label: "Do Renderings or Elevations Exist?", type: "select", options: NOF_YES_NO, labelCell: "B24", valueCell: "C24" },
    right: { id: "structuralEngineerName", label: "Name of Structural Engineer", type: "text", labelCell: "E24", valueCell: "F24" } },
  { excelRow: 25,
    left: { id: "specialtyConsultant", label: "Specialty Consultant", type: "select", options: NOF_YES_NO, labelCell: "B25", valueCell: "C25" },
    right: { id: "mepfpEngineerCo", label: "MEPFP Engineer Co.", type: "text", labelCell: "E25", valueCell: "F25" } },
  { excelRow: 26,
    left: { id: "specialtyConsultantName", label: "Name of Specialty Consultant", type: "text", labelCell: "B26", valueCell: "C26" },
    right: { id: "mepfpEngineerName", label: "Name of MEPFP Engineer", type: "text", labelCell: "E26", valueCell: "F26" } },
  { excelRow: 27,
    left: { id: "landscapeArchitectCo", label: "Landscape Architect Co.", type: "text", labelCell: "B27", valueCell: "C27" },
    right: { id: "landscapeArchitectName", label: "Name of Landscape Architect", type: "text", labelCell: "E27", valueCell: "F27" } },
];

const NOF_DESCRIPTION_FIELD = { id: "description", label: "Opportunity Description & Notes", type: "textarea", labelCell: "B28", valueCell: "B29" };

// Flat list of every field, used to compute completion counts.
const NOF_ALL_FIELDS = [
  ...NOF_GENERAL_ROWS.flatMap((r) => [r.left, r.right].filter(Boolean)),
  ...NOF_OWNER_AEC_ROWS.flatMap((r) => [r.left, r.right].filter(Boolean)),
  NOF_DESCRIPTION_FIELD,
];
