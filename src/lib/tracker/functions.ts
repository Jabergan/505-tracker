import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { SEED_CATEGORIES, SEED_COS, SEED_ITEMS, SEED_JOB, SEED_PAYMENTS } from "./seed";
import type {
  Category,
  CategoryKind,
  ChangeOrder,
  ChangeOrderStatus,
  Job,
  JobSnapshot,
  LineItem,
  Payment,
  PaymentMethod,
} from "./types";
import { CATEGORY_KINDS, CO_STATUSES, PAYMENT_METHODS } from "./types";

type JobRow = {
  id: string;
  name: string;
  address: string;
  city: string;
  beds: number;
  baths_tenths: number;
  sqft: number;
  stories: number;
  land_cost_cents: number;
  target_sale_cents: number;
  start_date: string | null;
  target_close_date: string | null;
  notes: string;
};

type CategoryRow = {
  id: string;
  name: string;
  sort_order: number;
  kind: string;
};

type ItemRow = {
  id: number;
  category_id: string;
  name: string;
  vendor: string;
  original_budget_cents: number;
  committed_cents: number;
  actual_cents: number;
  pct_complete: number;
  notes: string;
  sort_order: number;
};

type PaymentRow = {
  id: number;
  line_item_id: number;
  paid_on: string;
  amount_cents: number;
  payee: string;
  method: string;
  memo: string;
};

type CoRow = {
  id: number;
  line_item_id: number | null;
  title: string;
  amount_cents: number;
  status: string;
  reason: string;
  created_at: string;
};

function asKind(v: string): CategoryKind {
  return (CATEGORY_KINDS as readonly string[]).includes(v) ? (v as CategoryKind) : "hard";
}

function asMethod(v: string): PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(v) ? (v as PaymentMethod) : "check";
}

function asCoStatus(v: string): ChangeOrderStatus {
  return (CO_STATUSES as readonly string[]).includes(v) ? (v as ChangeOrderStatus) : "pending";
}

function mapJob(row: JobRow): Job {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    beds: row.beds,
    bathsTenths: row.baths_tenths,
    sqft: row.sqft,
    stories: row.stories,
    landCostCents: Number(row.land_cost_cents),
    targetSaleCents: Number(row.target_sale_cents),
    startDate: row.start_date,
    targetCloseDate: row.target_close_date,
    notes: row.notes,
  };
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    kind: asKind(row.kind),
  };
}

function mapItem(row: ItemRow): LineItem {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    vendor: row.vendor,
    originalBudgetCents: Number(row.original_budget_cents),
    committedCents: Number(row.committed_cents),
    actualCents: Number(row.actual_cents),
    pctComplete: row.pct_complete,
    notes: row.notes,
    sortOrder: row.sort_order,
  };
}

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    lineItemId: row.line_item_id,
    paidOn: row.paid_on,
    amountCents: Number(row.amount_cents),
    payee: row.payee,
    method: asMethod(row.method),
    memo: row.memo,
  };
}

function mapCo(row: CoRow): ChangeOrder {
  return {
    id: row.id,
    lineItemId: row.line_item_id,
    title: row.title,
    amountCents: Number(row.amount_cents),
    status: asCoStatus(row.status),
    reason: row.reason,
    createdAt: row.created_at,
  };
}

async function ensureSeed(): Promise<void> {
  const sql = await getSql();
  const existing = await sql<{ c: number }>`select count(*)::int as c from job`;
  if ((existing[0]?.c ?? 0) > 0) return;

  await sql.query(
    `insert into job (
      id, name, address, city, beds, baths_tenths, sqft, stories,
      land_cost_cents, target_sale_cents, start_date, target_close_date, notes
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      SEED_JOB.id,
      SEED_JOB.name,
      SEED_JOB.address,
      SEED_JOB.city,
      SEED_JOB.beds,
      SEED_JOB.bathsTenths,
      SEED_JOB.sqft,
      SEED_JOB.stories,
      SEED_JOB.landCostCents,
      SEED_JOB.targetSaleCents,
      SEED_JOB.startDate,
      SEED_JOB.targetCloseDate,
      SEED_JOB.notes,
    ],
  );

  for (const cat of SEED_CATEGORIES) {
    await sql.query(
      `insert into categories (id, name, sort_order, kind) values ($1,$2,$3,$4)
       on conflict (id) do nothing`,
      [cat.id, cat.name, cat.sortOrder, cat.kind],
    );
  }

  for (const item of SEED_ITEMS) {
    await sql.query(
      `insert into line_items (
        id, category_id, name, vendor, original_budget_cents, committed_cents,
        actual_cents, pct_complete, notes, sort_order
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        item.id,
        item.categoryId,
        item.name,
        item.vendor,
        Math.round(item.original * 100),
        Math.round(item.committed * 100),
        Math.round(item.actual * 100),
        item.pct,
        item.notes,
        item.id,
      ],
    );
  }

  for (const p of SEED_PAYMENTS) {
    await sql.query(
      `insert into payments (line_item_id, paid_on, amount_cents, payee, method, memo)
       values ($1,$2,$3,$4,$5,$6)`,
      [p.itemId, p.paidOn, Math.round(p.amount * 100), p.payee, p.method, p.memo],
    );
  }

  for (const co of SEED_COS) {
    await sql.query(
      `insert into change_orders (line_item_id, title, amount_cents, status, reason)
       values ($1,$2,$3,$4,$5)`,
      [co.itemId, co.title, Math.round(co.amount * 100), co.status, co.reason],
    );
  }

  try {
    await sql.query(
      `select setval('line_items_id_seq', (select max(id) from line_items))`,
    );
    await sql.query(
      `select setval('payments_id_seq', coalesce((select max(id) from payments), 1))`,
    );
    await sql.query(
      `select setval('change_orders_id_seq', coalesce((select max(id) from change_orders), 1))`,
    );
  } catch {
    // Sequence names vary between PGLite and Neon; explicit ids are seed-only.
  }
}

async function readSnapshot(): Promise<JobSnapshot> {
  await ensureSeed();
  const sql = await getSql();
  const jobs = await sql<JobRow>`select * from job limit 1`;
  const jobRow = jobs[0];
  if (!jobRow) throw new Error("Job row missing after seed");
  const categories = await sql<CategoryRow>`select * from categories order by sort_order, id`;
  const items = await sql<ItemRow>`select * from line_items order by sort_order, id`;
  const payments = await sql<PaymentRow>`select * from payments order by paid_on desc, id desc`;
  const changeOrders = await sql<CoRow>`select * from change_orders order by created_at desc, id desc`;
  return {
    job: mapJob(jobRow),
    categories: categories.map(mapCategory),
    items: items.map(mapItem),
    payments: payments.map(mapPayment),
    changeOrders: changeOrders.map(mapCo),
  };
}

export const loadJob = createServerFn({ method: "GET" }).handler(async () => {
  return readSnapshot();
});

const jobPatch = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(160),
  city: z.string().max(80),
  beds: z.number().int().min(0).max(20),
  bathsTenths: z.number().int().min(0).max(100),
  sqft: z.number().int().min(0).max(100_000),
  stories: z.number().int().min(1).max(6),
  landCostCents: z.number().int().min(0),
  targetSaleCents: z.number().int().min(0),
  startDate: z.string().nullable(),
  targetCloseDate: z.string().nullable(),
  notes: z.string().max(2000),
});

export const updateJob = createServerFn({ method: "POST" })
  .validator(jobPatch)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql.query(
      `update job set
        name = $1, address = $2, city = $3, beds = $4, baths_tenths = $5,
        sqft = $6, stories = $7, land_cost_cents = $8, target_sale_cents = $9,
        start_date = $10, target_close_date = $11, notes = $12, updated_at = now()`,
      [
        data.name,
        data.address,
        data.city,
        data.beds,
        data.bathsTenths,
        data.sqft,
        data.stories,
        data.landCostCents,
        data.targetSaleCents,
        data.startDate,
        data.targetCloseDate,
        data.notes,
      ],
    );
    return readSnapshot();
  });

const itemInput = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(160),
  vendor: z.string().max(120),
  originalBudgetCents: z.number().int(),
  committedCents: z.number().int(),
  actualCents: z.number().int(),
  pctComplete: z.number().int().min(0).max(100),
  notes: z.string().max(2000),
});

export const createItem = createServerFn({ method: "POST" })
  .validator(itemInput)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql.query(
      `insert into line_items (
        category_id, name, vendor, original_budget_cents, committed_cents,
        actual_cents, pct_complete, notes, sort_order
      ) values ($1,$2,$3,$4,$5,$6,$7,$8, coalesce((select max(sort_order)+1 from line_items), 1))`,
      [
        data.categoryId,
        data.name,
        data.vendor,
        data.originalBudgetCents,
        data.committedCents,
        data.actualCents,
        data.pctComplete,
        data.notes,
      ],
    );
    return readSnapshot();
  });

export const updateItem = createServerFn({ method: "POST" })
  .validator(itemInput.extend({ id: z.number().int() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql.query(
      `update line_items set
        category_id = $2, name = $3, vendor = $4, original_budget_cents = $5,
        committed_cents = $6, actual_cents = $7, pct_complete = $8, notes = $9
       where id = $1`,
      [
        data.id,
        data.categoryId,
        data.name,
        data.vendor,
        data.originalBudgetCents,
        data.committedCents,
        data.actualCents,
        data.pctComplete,
        data.notes,
      ],
    );
    return readSnapshot();
  });

export const deleteItem = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql.query(`delete from line_items where id = $1`, [data.id]);
    return readSnapshot();
  });

const paymentInput = z.object({
  lineItemId: z.number().int(),
  paidOn: z.string().min(8),
  amountCents: z.number().int(),
  payee: z.string().max(120),
  method: z.enum(PAYMENT_METHODS),
  memo: z.string().max(400),
});

export const createPayment = createServerFn({ method: "POST" })
  .validator(paymentInput)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql.query(
      `insert into payments (line_item_id, paid_on, amount_cents, payee, method, memo)
       values ($1,$2,$3,$4,$5,$6)`,
      [data.lineItemId, data.paidOn, data.amountCents, data.payee, data.method, data.memo],
    );
    await sql.query(
      `update line_items set actual_cents = (
         select coalesce(sum(amount_cents), 0) from payments where line_item_id = $1
       ) where id = $1`,
      [data.lineItemId],
    );
    return readSnapshot();
  });

export const deletePayment = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<{ line_item_id: number }>`
      delete from payments where id = ${data.id} returning line_item_id
    `;
    const itemId = rows[0]?.line_item_id;
    if (itemId) {
      await sql.query(
        `update line_items set actual_cents = (
           select coalesce(sum(amount_cents), 0) from payments where line_item_id = $1
         ) where id = $1`,
        [itemId],
      );
    }
    return readSnapshot();
  });

const coInput = z.object({
  lineItemId: z.number().int().nullable(),
  title: z.string().min(1).max(160),
  amountCents: z.number().int(),
  status: z.enum(CO_STATUSES),
  reason: z.string().max(800),
});

export const createChangeOrder = createServerFn({ method: "POST" })
  .validator(coInput)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql.query(
      `insert into change_orders (line_item_id, title, amount_cents, status, reason)
       values ($1,$2,$3,$4,$5)`,
      [data.lineItemId, data.title, data.amountCents, data.status, data.reason],
    );
    return readSnapshot();
  });

export const updateChangeOrder = createServerFn({ method: "POST" })
  .validator(coInput.extend({ id: z.number().int() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql.query(
      `update change_orders set line_item_id = $2, title = $3, amount_cents = $4, status = $5, reason = $6
       where id = $1`,
      [data.id, data.lineItemId, data.title, data.amountCents, data.status, data.reason],
    );
    return readSnapshot();
  });

export const deleteChangeOrder = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql.query(`delete from change_orders where id = $1`, [data.id]);
    return readSnapshot();
  });
