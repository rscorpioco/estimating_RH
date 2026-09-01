// CM Project Startup Checklist data
// Transcribed from Scorpio Corporation's preconstruction workflow.
// `dueOffsetDays` is used to compute a target date from the project's Activate date.

const CHECKLIST_PHASES = [
  {
    id: "activate",
    name: "Activate",
    deadlineLabel: "Within 48 hours",
    dueOffsetDays: 2,
    items: [
      { id: "act-1", text: "Complete new opportunity form (if this is the first deliverable)" },
      { id: "act-2", text: "Create efficiencies in bid documents through Bluebeam" },
      { id: "act-3", text: "Update documents, plans, and specifications tabs in Procore" },
      { id: "act-4", text: "Create the project in takeoff software" },
      {
        id: "act-5",
        text: "Create the estimate in estimating software",
        sub: [
          { text: "Create estimate sorts in estimating software that match the owner's requirements" },
          { text: "Double-check totals page items are calculating off the correct total. Confirm if the owner has requirements" },
        ],
      },
      { id: "act-6", text: "Send documents to project operations and field operations for document review, constructability review, schedule, and site utilization" },
      {
        id: "act-7",
        text: "Send out calendar invites",
        sub: [
          { text: "6S Team: kickoff meeting, sub-participation check-in, leveling day" },
          { text: "PC Team: PC Review, Details Review, Deliverable Review with the owner" },
        ],
      },
      { id: "act-8", text: "Confirm all 6S Team Members are included on the project in Procore" },
      {
        id: "act-9",
        text: "Send out invitations to bid",
        sub: [
          { text: "Create a trade partner list and review with the assigned project operations and field operations team members prior to bid advertisement" },
          {
            text: "Advertisement requirements",
            sub: [
              { text: "Post in local newspapers and/or websites per the owner requirements" },
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
    deadlineLabel: "By End of 1st Week",
    dueOffsetDays: 7,
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
    deadlineLabel: "By End of 2nd Week",
    dueOffsetDays: 14,
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
    deadlineLabel: "By End of 3rd Week",
    dueOffsetDays: 21,
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
    deadlineLabel: "By End of 4th Week",
    dueOffsetDays: 28,
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
