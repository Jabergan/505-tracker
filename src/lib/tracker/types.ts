export const CATEGORY_KINDS = ["land", "soft", "hard", "contingency"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const PAYMENT_METHODS = ["check", "ach", "wire", "card", "cash", "retainage"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CO_STATUSES = ["pending", "approved", "rejected"] as const;
export type ChangeOrderStatus = (typeof CO_STATUSES)[number];

export type Job = {
  id: string;
  name: string;
  address: string;
  city: string;
  beds: number;
  bathsTenths: number;
  sqft: number;
  stories: number;
  landCostCents: number;
  targetSaleCents: number;
  startDate: string | null;
  targetCloseDate: string | null;
  notes: string;
};

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
  kind: CategoryKind;
};

export type LineItem = {
  id: number;
  categoryId: string;
  name: string;
  vendor: string;
  originalBudgetCents: number;
  committedCents: number;
  actualCents: number;
  pctComplete: number;
  notes: string;
  sortOrder: number;
};

export type Payment = {
  id: number;
  lineItemId: number;
  paidOn: string;
  amountCents: number;
  payee: string;
  method: PaymentMethod;
  memo: string;
};

export type ChangeOrder = {
  id: number;
  lineItemId: number | null;
  title: string;
  amountCents: number;
  status: ChangeOrderStatus;
  reason: string;
  createdAt: string;
};

export type JobSnapshot = {
  job: Job;
  categories: Category[];
  items: LineItem[];
  payments: Payment[];
  changeOrders: ChangeOrder[];
};
