import type { CategoryKind, ChangeOrderStatus, PaymentMethod } from "./types";

export const SEED_JOB = {
  id: "505",
  name: "505 Spec House",
  address: "505 Maple Street",
  city: "Westfield",
  beds: 4,
  bathsTenths: 25,
  sqft: 2240,
  stories: 2,
  landCostCents: 9_250_000,
  targetSaleCents: 67_500_000,
  startDate: "2026-03-12",
  targetCloseDate: "2026-12-18",
  notes:
    "Spec two-story. Closed the lot in March. Framing is up; roof dry-in next. Watch lumber and windows — both already over.",
};

export const SEED_CATEGORIES: Array<{
  id: string;
  name: string;
  sortOrder: number;
  kind: CategoryKind;
}> = [
  { id: "land", name: "Land", sortOrder: 10, kind: "land" },
  { id: "soft", name: "Soft costs", sortOrder: 20, kind: "soft" },
  { id: "site", name: "Site work", sortOrder: 30, kind: "hard" },
  { id: "foundation", name: "Foundation", sortOrder: 40, kind: "hard" },
  { id: "framing", name: "Framing", sortOrder: 50, kind: "hard" },
  { id: "envelope", name: "Envelope", sortOrder: 60, kind: "hard" },
  { id: "mep", name: "MEP", sortOrder: 70, kind: "hard" },
  { id: "interior", name: "Interior", sortOrder: 80, kind: "hard" },
  { id: "kitchen", name: "Kitchen & baths", sortOrder: 90, kind: "hard" },
  { id: "final", name: "Final & site finish", sortOrder: 100, kind: "hard" },
  { id: "contingency", name: "Contingency", sortOrder: 110, kind: "contingency" },
];

type SeedItem = {
  id: number;
  categoryId: string;
  name: string;
  vendor: string;
  original: number;
  committed: number;
  actual: number;
  pct: number;
  notes: string;
};

export const SEED_ITEMS: SeedItem[] = [
  { id: 1, categoryId: "land", name: "Lot purchase", vendor: "Westfield Title", original: 92500, committed: 92500, actual: 92500, pct: 100, notes: "Closed 12 Mar." },
  { id: 2, categoryId: "soft", name: "Plans & architecture", vendor: "Northline Studio", original: 8500, committed: 8500, actual: 8500, pct: 100, notes: "Permit set complete." },
  { id: 3, categoryId: "soft", name: "Permits & impact fees", vendor: "City of Westfield", original: 12400, committed: 12400, actual: 12400, pct: 100, notes: "" },
  { id: 4, categoryId: "soft", name: "Survey & engineering", vendor: "Hale Civil", original: 4200, committed: 4200, actual: 4200, pct: 100, notes: "Includes soil report." },
  { id: 5, categoryId: "soft", name: "Builder's risk & liability", vendor: "Summit Mutual", original: 6100, committed: 6100, actual: 6100, pct: 100, notes: "Policy through close." },
  { id: 6, categoryId: "soft", name: "Construction loan interest", vendor: "First Regional", original: 9800, committed: 0, actual: 3200, pct: 35, notes: "Accrues until sale." },
  { id: 7, categoryId: "soft", name: "Utility tap fees", vendor: "Westfield Utilities", original: 5400, committed: 5400, actual: 5400, pct: 100, notes: "" },
  { id: 8, categoryId: "site", name: "Clearing, trees, grading", vendor: "Red Clay Excavating", original: 11800, committed: 11800, actual: 11240, pct: 100, notes: "Came in under." },
  { id: 9, categoryId: "site", name: "Driveway base & sidewalks", vendor: "Red Clay Excavating", original: 9200, committed: 9200, actual: 9200, pct: 100, notes: "Finish coat later." },
  { id: 10, categoryId: "site", name: "Sewer tap & laterals", vendor: "Pike Plumbing", original: 7400, committed: 7400, actual: 7400, pct: 100, notes: "" },
  { id: 11, categoryId: "site", name: "Water & electric service", vendor: "Westfield Utilities", original: 5600, committed: 5600, actual: 5360, pct: 100, notes: "" },
  { id: 12, categoryId: "foundation", name: "Excavation", vendor: "Red Clay Excavating", original: 4800, committed: 4800, actual: 4800, pct: 100, notes: "" },
  { id: 13, categoryId: "foundation", name: "Footings & walls", vendor: "Keystone Concrete", original: 28600, committed: 32250, actual: 32250, pct: 100, notes: "Revised after soil report." },
  { id: 14, categoryId: "foundation", name: "Waterproofing & drain tile", vendor: "Keystone Concrete", original: 3200, committed: 3200, actual: 3100, pct: 100, notes: "" },
  { id: 15, categoryId: "foundation", name: "Termite & moisture", vendor: "Harbor Pest", original: 1100, committed: 1100, actual: 1100, pct: 100, notes: "" },
  { id: 16, categoryId: "framing", name: "Lumber package", vendor: "ABC Building Supply", original: 41200, committed: 42800, actual: 42800, pct: 100, notes: "Framing lumber ran hot." },
  { id: 17, categoryId: "framing", name: "Framing labor", vendor: "Calder Crew", original: 24800, committed: 24800, actual: 14000, pct: 70, notes: "Standing walls; stairs left." },
  { id: 18, categoryId: "framing", name: "Roof trusses", vendor: "Peak Truss", original: 8900, committed: 8900, actual: 8900, pct: 100, notes: "Set 22 Aug." },
  { id: 19, categoryId: "framing", name: "Hardware & hangers", vendor: "ABC Building Supply", original: 2100, committed: 2100, actual: 1800, pct: 90, notes: "" },
  { id: 20, categoryId: "envelope", name: "Roofing", vendor: "Ridge Roofing", original: 16400, committed: 16400, actual: 4000, pct: 20, notes: "Deposit; dry-in scheduled." },
  { id: 21, categoryId: "envelope", name: "Siding & exterior trim", vendor: "North Face Exteriors", original: 22100, committed: 0, actual: 0, pct: 0, notes: "James Hardie, evening steel." },
  { id: 22, categoryId: "envelope", name: "Windows", vendor: "Clearview Supply", original: 18600, committed: 20440, actual: 6200, pct: 30, notes: "Deposit + stair window CO." },
  { id: 23, categoryId: "envelope", name: "Exterior doors", vendor: "Clearview Supply", original: 4200, committed: 0, actual: 0, pct: 0, notes: "" },
  { id: 24, categoryId: "envelope", name: "Gutters & downspouts", vendor: "Ridge Roofing", original: 1800, committed: 0, actual: 0, pct: 0, notes: "" },
  { id: 25, categoryId: "envelope", name: "Garage door", vendor: "DoorWorks", original: 2400, committed: 0, actual: 0, pct: 0, notes: "" },
  { id: 26, categoryId: "mep", name: "Plumbing rough & trim", vendor: "Pike Plumbing", original: 24800, committed: 0, actual: 0, pct: 0, notes: "Rough after dry-in." },
  { id: 27, categoryId: "mep", name: "HVAC", vendor: "Climate Right", original: 21400, committed: 0, actual: 0, pct: 0, notes: "2-ton + 3-ton split." },
  { id: 28, categoryId: "mep", name: "Electrical", vendor: "Arc & Co.", original: 19600, committed: 0, actual: 0, pct: 0, notes: "" },
  { id: 29, categoryId: "mep", name: "Low voltage", vendor: "Arc & Co.", original: 2400, committed: 0, actual: 0, pct: 0, notes: "Prewire only." },
  { id: 30, categoryId: "interior", name: "Insulation", vendor: "Blanket Insulation", original: 7800, committed: 0, actual: 0, pct: 0, notes: "" },
  { id: 31, categoryId: "interior", name: "Drywall", vendor: "Plainfield Walls", original: 14200, committed: 0, actual: 0, pct: 0, notes: "" },
  { id: 32, categoryId: "interior", name: "Interior paint", vendor: "Hearth Paint", original: 6800, committed: 0, actual: 0, pct: 0, notes: "" },
  { id: 33, categoryId: "interior", name: "Doors, casing, base", vendor: "Millwork House", original: 9200, committed: 0, actual: 0, pct: 0, notes: "" },
  { id: 34, categoryId: "interior", name: "Flooring", vendor: "Grain & Plank", original: 18400, committed: 0, actual: 0, pct: 0, notes: "White oak, 5 inch." },
  { id: 35, categoryId: "interior", name: "Tile", vendor: "Grain & Plank", original: 6400, committed: 0, actual: 0, pct: 0, notes: "" },
  { id: 36, categoryId: "kitchen", name: "Cabinets", vendor: "Linea Cabinets", original: 16800, committed: 0, actual: 0, pct: 0, notes: "Shaker, painted." },
  { id: 37, categoryId: "kitchen", name: "Countertops", vendor: "Stonebench", original: 7200, committed: 0, actual: 0, pct: 0, notes: "Quartz upgrade pending." },
  { id: 38, categoryId: "kitchen", name: "Appliances", vendor: "Harbor Appliance", original: 9400, committed: 0, actual: 0, pct: 0, notes: "Package quote held 60 days." },
  { id: 39, categoryId: "kitchen", name: "Bath vanities & fixtures", vendor: "Pike Plumbing", original: 8100, committed: 0, actual: 0, pct: 0, notes: "" },
  { id: 40, categoryId: "kitchen", name: "Shower glass", vendor: "Clearview Supply", original: 2100, committed: 0, actual: 0, pct: 0, notes: "" },
  { id: 41, categoryId: "final", name: "Landscaping", vendor: "Greenward", original: 9800, committed: 0, actual: 0, pct: 0, notes: "Sod + 8 trees." },
  { id: 42, categoryId: "final", name: "Final clean & punch", vendor: "Turnover Crew", original: 2400, committed: 0, actual: 0, pct: 0, notes: "" },
  { id: 43, categoryId: "final", name: "Staging", vendor: "Show House", original: 1800, committed: 0, actual: 0, pct: 0, notes: "Two-week listing set." },
  { id: 44, categoryId: "final", name: "Dumpsters, toilets, misc", vendor: "Job site", original: 3200, committed: 1800, actual: 1640, pct: 50, notes: "Running monthly." },
  { id: 45, categoryId: "contingency", name: "Job contingency", vendor: "", original: 28000, committed: 0, actual: 0, pct: 0, notes: "Do not spend without a CO." },
];

export const SEED_PAYMENTS: Array<{
  itemId: number;
  paidOn: string;
  amount: number;
  payee: string;
  method: PaymentMethod;
  memo: string;
}> = [
  { itemId: 1, paidOn: "2026-03-12", amount: 92500, payee: "Westfield Title", method: "wire", memo: "Lot closing" },
  { itemId: 2, paidOn: "2026-03-18", amount: 4250, payee: "Northline Studio", method: "check", memo: "Retainer" },
  { itemId: 2, paidOn: "2026-04-22", amount: 4250, payee: "Northline Studio", method: "check", memo: "Permit set" },
  { itemId: 4, paidOn: "2026-03-28", amount: 4200, payee: "Hale Civil", method: "ach", memo: "Survey + soils" },
  { itemId: 3, paidOn: "2026-04-30", amount: 12400, payee: "City of Westfield", method: "check", memo: "Building permit" },
  { itemId: 5, paidOn: "2026-05-02", amount: 6100, payee: "Summit Mutual", method: "ach", memo: "Builder's risk" },
  { itemId: 7, paidOn: "2026-05-08", amount: 5400, payee: "Westfield Utilities", method: "check", memo: "Taps" },
  { itemId: 8, paidOn: "2026-05-14", amount: 11240, payee: "Red Clay Excavating", method: "check", memo: "Clear / grade" },
  { itemId: 12, paidOn: "2026-05-20", amount: 4800, payee: "Red Clay Excavating", method: "check", memo: "Foundation dig" },
  { itemId: 9, paidOn: "2026-05-28", amount: 9200, payee: "Red Clay Excavating", method: "check", memo: "Drive base" },
  { itemId: 10, paidOn: "2026-06-04", amount: 7400, payee: "Pike Plumbing", method: "check", memo: "Sewer lateral" },
  { itemId: 11, paidOn: "2026-06-06", amount: 5360, payee: "Westfield Utilities", method: "ach", memo: "Service" },
  { itemId: 13, paidOn: "2026-06-18", amount: 16000, payee: "Keystone Concrete", method: "check", memo: "Footings draw 1" },
  { itemId: 13, paidOn: "2026-07-02", amount: 16250, payee: "Keystone Concrete", method: "check", memo: "Walls + CO" },
  { itemId: 14, paidOn: "2026-07-08", amount: 3100, payee: "Keystone Concrete", method: "check", memo: "Damp-proof" },
  { itemId: 15, paidOn: "2026-07-09", amount: 1100, payee: "Harbor Pest", method: "card", memo: "Pretreatment" },
  { itemId: 16, paidOn: "2026-07-22", amount: 20000, payee: "ABC Building Supply", method: "check", memo: "Lumber deposit" },
  { itemId: 16, paidOn: "2026-08-04", amount: 22800, payee: "ABC Building Supply", method: "check", memo: "Lumber balance" },
  { itemId: 18, paidOn: "2026-08-12", amount: 8900, payee: "Peak Truss", method: "check", memo: "Truss package" },
  { itemId: 17, paidOn: "2026-08-20", amount: 8000, payee: "Calder Crew", method: "check", memo: "Framing draw 1" },
  { itemId: 17, paidOn: "2026-09-03", amount: 6000, payee: "Calder Crew", method: "check", memo: "Framing draw 2" },
  { itemId: 19, paidOn: "2026-08-26", amount: 1800, payee: "ABC Building Supply", method: "card", memo: "Hangers" },
  { itemId: 20, paidOn: "2026-09-02", amount: 4000, payee: "Ridge Roofing", method: "check", memo: "Roof deposit" },
  { itemId: 22, paidOn: "2026-08-28", amount: 6200, payee: "Clearview Supply", method: "check", memo: "Window deposit" },
  { itemId: 6, paidOn: "2026-06-30", amount: 1600, payee: "First Regional", method: "ach", memo: "June interest" },
  { itemId: 6, paidOn: "2026-07-31", amount: 1600, payee: "First Regional", method: "ach", memo: "July interest" },
  { itemId: 44, paidOn: "2026-05-16", amount: 820, payee: "Roll-Off Co", method: "card", memo: "Dumpster 1" },
  { itemId: 44, paidOn: "2026-07-16", amount: 820, payee: "Roll-Off Co", method: "card", memo: "Dumpster 2" },
];

export const SEED_COS: Array<{
  itemId: number;
  title: string;
  amount: number;
  status: ChangeOrderStatus;
  reason: string;
}> = [
  {
    itemId: 13,
    title: "Deeper footings at rear",
    amount: 3650,
    status: "approved",
    reason: "Soils report required extra depth along the downhill wall.",
  },
  {
    itemId: 22,
    title: "Stairwell window add",
    amount: 1840,
    status: "approved",
    reason: "Light well on the stair — sells the hall.",
  },
  {
    itemId: 37,
    title: "Quartz upgrade",
    amount: 2200,
    status: "pending",
    reason: "Calacatta-look vs builder granite. Decide before template.",
  },
  {
    itemId: 39,
    title: "Drop soaker tub",
    amount: -800,
    status: "approved",
    reason: "Primary bath: shower only. Credit the tub.",
  },
];
