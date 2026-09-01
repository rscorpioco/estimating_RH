// CM Project Startup Checklist data
// Transcribed from Scorpio Corporation's preconstruction workflow.
// `dueOffsetDays` is used to compute a target date from the project's Activate date.

// Day 0 is the trigger event itself (deliverable package received / kickoff) —
// it isn't a checklist phase, just the reference point every phase's day count is measured from.
const DAY_ZERO_LABEL = "Day 0 — Receipt of Deliverable Package / Kickoff Meeting";

const CHECKLIST_PHASES = [
  {
    id: "activate",
    name: "Activate",
    deadlineLabel: "Day 1",
    activity: "PC Project Activation · DDI · 6S Process · Beyond Estimating",
    dueOffsetDays: 1,
    items: [
      // "Do First" — these are external-facing commitments (meetings, subs, 6S team) that have their
      // own lead time, so they go out before bid documents are even in hand, not after.
      {
        id: "act-meetings",
        group: "Do First — Before Bid Documents Arrive",
        text: "Schedule all required deliverable review meetings",
        sub: [
          { text: "Calendar Invite: Complete Kick Off Mtg (CD/Permit Set Only; if 6S team is needed)" },
          { text: "Calendar Invite: Site Visit, if needed" },
          { text: "Calendar Invite: Share Bid List to Team" },
          { text: "Calendar Invite: Constructability Review with Field Manager Team Leaders and Operations Team Leaders" },
          {
            text: "Calendar Invite: Schedule Request & Logistics Plan — Aaron Rogers",
            link: "mailto:aaron@scorpioco.com",
            sub: [{ text: "cc: Project Manager and Field Manager" }],
          },
          { text: "Calendar Invite: Page Turn" },
          { text: "Calendar Invite: RFI Log #1 Submitted" },
          { text: "Calendar Invite: Discovery Status Update (subcontractor coverage, scope, etc.)" },
          { text: "Calendar Invite: First-Pass Estimate & General Staffing/Conditions/Requirements Complete and Issued (a week and a day before due to client)" },
          { text: "Calendar Invite: Staff & GC Review — Final Draft ready for review; 48 hrs before due to client" },
          { text: "Calendar Invite: Precon Internal Deliverable Review Mtg — Final Draft ready for review; 24–48 hrs before Internal" },
          { text: "Calendar Invite: Internal Deliverable Review Mtg — Final Draft ready for review; 48 hrs before due to client" },
          { text: "Calendar Invite: Architect & Client Only Deliverable Review (phone call)" },
          { text: "Calendar Invite: Client & Team Deliverable Review" },
          { text: "Calendar Invite: Level Day or Bid Day (Level Day for CMAR, Bid Day for Hard Bid — days after subcontractor bids are due)" },
          { text: "Calendar Invite: Order Lunch for Bid Day" },
        ],
      },
      {
        id: "act-sublist",
        group: "Do First — Before Bid Documents Arrive",
        text: "Create and distribute the subcontractor list",
        sub: [
          { text: "Build the trade partner list and review it with the assigned project operations and field operations team members" },
          { text: "Distribute the list to the team (see the Share Bid List calendar invite above)" },
        ],
      },
      {
        id: "act-6s",
        group: "Do First — Before Bid Documents Arrive",
        text: "Distribute the 6S assignments and obtain approval",
        sub: [{ text: "Confirm all 6S Team Members are included on the project in Procore" }],
      },
      {
        id: "act-staffgc",
        group: "Do First — Before Bid Documents Arrive",
        text: "Create staffing and General Conditions (GCs)",
      },
      // Everything below depends on actually having the bid documents in hand.
      {
        id: "act-1",
        group: "Once Bid Documents Are Received",
        text: "Complete new opportunity form (if this is the first deliverable)",
      },
      {
        id: "act-2",
        group: "Once Bid Documents Are Received",
        text: "Create efficiencies in bid documents through Bluebeam",
      },
      {
        id: "act-3",
        group: "Once Bid Documents Are Received",
        text: "Update documents, plans, and specifications tabs in Procore",
      },
      {
        id: "act-4",
        group: "Once Bid Documents Are Received",
        text: "Create the project in takeoff software",
      },
      {
        id: "act-5",
        group: "Once Bid Documents Are Received",
        text: "Create the estimate in estimating software",
        sub: [
          { text: "Create estimate sorts in estimating software that match the owner's requirements" },
          { text: "Double-check totals page items are calculating off the correct total. Confirm if the owner has requirements" },
        ],
      },
      {
        id: "act-6",
        group: "Once Bid Documents Are Received",
        text: "Send documents to project operations and field operations for document review, constructability review, schedule, and site utilization",
      },
      {
        id: "act-advertise",
        group: "Once Bid Documents Are Received",
        text: "Advertise and formally invite bid",
        sub: [
          {
            text: "Advertisement requirements",
            sub: [
              { text: "Post in local newspapers and/or websites per the owner requirements" },
              { text: "For GMP delivery, the ad must run at least 30 days before the bid due date — confirm the date against the Milestone Schedule" },
              { text: "For UF projects, complete the Subcontractor Opportunity Form", link: "https://sbr.admin.ufl.edu/suppliers/subcontractor-opportunity-form/" },
              { text: "Upload sample subcontracts" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "discovery",
    name: "Discovery",
    deadlineLabel: "Day 3–5",
    activity: "DDI · Know the Job",
    dueOffsetDays: 5,
    items: [
      { id: "dis-1", text: "Have kickoff meeting. Placemat and leveling assignments complete" },
      {
        id: "dis-2",
        text: "Identify all bid requirements",
        sub: [
          { text: "Division 1 review: LDs, project duration, days to hold bids for, etc." },
          { text: "Identify alternates and allowances" },
          { text: "Receive a project-specific Builder's Risk quote: doug.johnson1@hubinternational.com, kyle.whitman@hubinternational.com, andrea.kioutas@hubinternational.com" },
          { text: "Bid bonds — send request to Awaters@hatcherins.com, bpalmer@hatcherins.com" },
          { text: "Confirm permit cost with local AHJ" },
        ],
      },
      { id: "dis-3", text: "Review bid documents for incorporated value analysis and changes agreed upon in team meetings" },
      { id: "dis-4", text: "Review perceived challenges to the project" },
      { id: "dis-5", text: "Contact subcontractors to participate in the project" },
    ],
  },
  {
    id: "development",
    name: "Development",
    deadlineLabel: "Day 8–10",
    activity: "DDI · Estimating · Scope Writing · Beyond Estimating",
    dueOffsetDays: 10,
    items: [
      { id: "dev-1", text: "Complete RFI log and receive back responses" },
      { id: "dev-2", text: "Complete takeoffs and populate Destini estimate. Complete internal estimate (starts in Discovery, completed in Development)" },
      { id: "dev-3", text: "Update staff & general conditions estimate and send to associated leadership team lead for final edits" },
      { id: "dev-4", text: "Create leveling sheets" },
      { id: "dev-5", text: "Review subcontractor proposals and populate leveling sheet. Provide market feedback gut-check within 24 hours of sub bid due date" },
      {
        id: "dev-6",
        text: "GMP-specific items",
        sub: [
          {
            text: "Contact subcontractors",
            sub: [{ text: "Send out weekly sub participation update to 6S team" }],
          },
          {
            text: "Create bid manual including bid form, table of contents, all scopes of work",
            sub: [{ text: "Distribute to subcontractors at least 5 working days prior to bid due date" }],
          },
          { text: "Schedule bid leveling day with 6S team" },
        ],
      },
      {
        id: "dev-7",
        text: "Create page labels and bookmarks (Bluebeam — open the drawings)",
        sub: [
          { text: "Select Thumbnails to create page labels (Sheet No.)" },
          { text: "Select Bookmarks to create bookmarks (Sheet No. + Drawing Name)" },
        ],
      },
      {
        id: "dev-8",
        text: "Create ITB in Procore (after Finance confirms the project is in Procore)",
        sub: [
          {
            text: "Upload drawings and specifications in Documents",
            sub: [
              { text: "Select Project Name" },
              { text: "Select Project Tools → Home → Core Tools → Documents" },
              { text: "Upload drawings in Drawing folder" },
              { text: "Upload specifications in Specs folder" },
              { text: "Description: scope of work listed, address" },
              { text: "Always attach all new documents to Correspondence" },
            ],
          },
          {
            text: "Upload drawings and specifications in Project Management (PM)",
            sub: [
              { text: "Select Project Tools → PM → Drawings" },
              { text: "Upload drawings from the Drawing folder; label each sheet" },
              { text: "Select Project Tools → PM → Specifications" },
              { text: "Upload specs from the Specs folder; label document" },
            ],
          },
          {
            text: "Confirm all team members are included in the project",
            sub: [
              { text: "Select Project Tools → Home → Directory" },
              { text: "To add new members — +Bulk Add from Co. Directory" },
            ],
          },
          {
            text: "Create bid list in Bidding",
            sub: [
              { text: "Select Project Tools → Preconstruction → Bidding" },
              { text: "Select +Create Bid Package" },
              { text: "Choose 01 Plan Room" },
            ],
          },
        ],
      },
      { id: "dev-9", text: "Create ITB in Plan Hub" },
      { id: "dev-10", text: "Complete UF Subcontractor Opportunity Form (UF projects)", link: "https://sbr.admin.ufl.edu/suppliers/subcontractor-opportunity-form/" },
    ],
  },
  {
    id: "details",
    name: "Details",
    deadlineLabel: "Day 12–15",
    activity: "DDI · Value Analysis · Bid Day Requirements",
    dueOffsetDays: 15,
    items: [
      { id: "det-1", text: "Compile the leveling sheets" },
      { id: "det-2", text: "Update the Bid Risk Calculator" },
      { id: "det-3", text: "Create value analysis log" },
      { id: "det-4", text: "Complete the deliverable document" },
      { id: "det-5", text: "Review estimate with Team Lead, Kevin Bradford" },
    ],
  },
  {
    id: "done",
    name: "Done",
    deadlineLabel: "Day 15–25",
    activity: "6S Process · Client Deliverable · PC Closeout",
    dueOffsetDays: 25,
    items: [
      { id: "done-1", text: "Make final edits to deliverable based on the details review meeting" },
      { id: "done-2", text: "Print and bind deliverable for the review meeting" },
      { id: "done-3", text: "Review the deliverable with the owner" },
      { id: "done-4", text: "Create printed and bound deliverable for client review meeting" },
      { id: "done-5", text: "Calendar invite: Architect & Client only deliverable review (phone call)" },
      { id: "done-6", text: "Calendar invite: Client & team deliverable review" },
      {
        id: "done-7",
        text: "Post-bid items",
        sub: [
          { text: "Create \"Late Bids\" folder on server" },
          { text: "Review/distribute late bids" },
          { text: "Verify that all proposals have been saved to the O Drive" },
          { text: "Update Procore subcontractor bid status and proposal status" },
          { text: "E-mail list of new subs to Procore administrator for creation" },
          { text: "Data mine subcontractor proposals for relevant unit costs. Update unit costs database / Master Cost Data Sheet with new project" },
          { text: "Actual Delivered Folder — save BRC + print Sage Bid Day detailed estimate and summary" },
        ],
      },
    ],
  },
];

const LOCATIONS = ["Gainesville", "Tallahassee", "Orlando", "Jacksonville", "Ocala"];
const DELIVERY_METHODS = ["CM at Risk (Interview)", "Hard Bid"];

// ---------- Meeting & Task Schedule ----------
// Timing rules for the calendar invites/tasks that have a fixed, computable date —
// anchored to either the project's Activate Date or its Subcontractor Bid Due Date.
// `time` is 24-hour "HH:MM" for a fixed-time event, or null for an all-day/undated task.
const SCHEDULE_RULES = [
  {
    id: "kickoff",
    label: "Calendar Invite: Complete Kick Off Mtg",
    anchor: "activate",
    offsetDays: 0,
    time: "15:30",
    type: "external",
    note: "6S team, if needed (CD/Permit Set Only)",
  },
  {
    id: "sublist",
    label: "Log in to Procore — create & distribute the subcontractor bid list",
    anchor: "activate",
    offsetDays: 0,
    time: null,
    type: "self",
    note: "Go to the project in Procore and build the bid list before bid documents arrive",
  },
  {
    id: "schedreq",
    label: "Calendar Invite: Schedule Request & Logistics Plan",
    anchor: "bidDue",
    offsetDays: -14,
    time: null,
    allDay: true,
    type: "external",
    note: "To Aaron Rogers (aaron@scorpioco.com); cc Project Manager & Field Manager",
  },
  {
    id: "statusUpdate1",
    label: "Procore status pull #1 (will bid / submitted) — email 6S team",
    anchor: "bidDue",
    offsetDays: -21,
    time: null,
    type: "self",
    note: "Pull bid-package status from Procore; email it to whoever is invited to the Level/Bid Day invite",
  },
  {
    id: "statusUpdate2",
    label: "Procore status pull #2 (will bid / submitted) — email 6S team",
    anchor: "bidDue",
    offsetDays: -14,
    time: null,
    type: "self",
    note: "Same as above — second pass, closer to bid due",
  },
  {
    id: "lunch",
    label: "Calendar Invite: Order Lunch for Bid Day",
    anchor: "bidDue",
    offsetDays: -1,
    time: null,
    type: "self",
    note: "2 days before Level/Bid Day, so catering has notice",
  },
  {
    id: "bidLevelDay",
    label: "Calendar Invite: Level Day / Bid Day",
    anchor: "bidDue",
    offsetDays: 1,
    time: null,
    type: "external",
    note: "Level Day for CMAR, Bid Day for Hard Bid — 6S team",
  },
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
