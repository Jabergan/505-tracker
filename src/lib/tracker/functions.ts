import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { SAMPLE_JOBS, SEED_CATEGORIES, SEED_JOB } from "./seed";
import type { SeedJobPack } from "./seed";
import type {
  Category,
  CategoryKind,
  ChangeOrder,
  ChangeOrderStatus,
  Job,
  JobSnapshot,
  JobSummary,
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

function mapSummary(row: JobRow): JobSummary {
  return { id: row.id, name: row.name, address: row.address, city: row.city };
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

async function setCurrentJobId(id: string): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into app_state (key, value) values ('current_job_id', $1)
     on conflict (key) do update set value = excluded.value`,
    [id],
  );
}

async function currentJobId(): Promise<string> {
  const sql = await getSql();
  const state = await sql<{ value: string }>`
    select value from app_state where key = 'current_job_id'
  `;
  if (state[0]?.value) return state[0].value;
  const jobs = await sql<{ id: string }>`select id from job order by updated_at desc limit 1`;
  const id = jobs[0]?.id;
  if (!id) throw new Error("No job file");
  await setCurrentJobId(id);
  return id;
}

async function seedJobIfMissing(pack: SeedJobPack): Promise<void> {
  const sql = await getSql();
  const found = await sql<{ id: string }>`select id from job where id = ${pack.job.id}`;
  if (found[0]) return;

  const j = pack.job;
  await sql.query(
    `insert into job (
      id, name, address, city, beds, baths_tenths, sqft, stories,
      land_cost_cents, target_sale_cents, start_date, target_close_date, notes
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      j.id,
      j.name,
      j.address,
      j.city,
      j.beds,
      j.bathsTenths,
      j.sqft,
      j.stories,
      j.landCostCents,
      j.targetSaleCents,
      j.startDate,
      j.targetCloseDate,
      j.notes,
    ],
  );

  const idMap = new Map<number, number>();
  for (const item of pack.items) {
    const inserted = await sql.query<{ id: number }>(
      `insert into line_items (
        job_id, category_id, name, vendor, original_budget_cents, committed_cents,
        actual_cents, pct_complete, notes, sort_order
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      returning id`,
      [
        j.id,
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
    const newId = inserted[0]?.id;
    if (newId != null) idMap.set(item.id, newId);
  }

  for (const p of pack.payments) {
    const lineId = idMap.get(p.itemId);
    if (lineId == null) continue;
    await sql.query(
      `insert into payments (line_item_id, paid_on, amount_cents, payee, method, memo)
       values ($1,$2,$3,$4,$5,$6)`,
      [lineId, p.paidOn, Math.round(p.amount * 100), p.payee, p.method, p.memo],
    );
  }

  for (const co of pack.cos) {
    const lineId = idMap.get(co.itemId) ?? null;
    await sql.query(
      `insert into change_orders (job_id, line_item_id, title, amount_cents, status, reason)
       values ($1,$2,$3,$4,$5,$6)`,
      [j.id, lineId, co.title, Math.round(co.amount * 100), co.status, co.reason],
    );
  }
}

async function ensureSeed(): Promise<void> {
  const sql = await getSql();

  for (const cat of SEED_CATEGORIES) {
    await sql.query(
      `insert into categories (id, name, sort_order, kind) values ($1,$2,$3,$4)
       on conflict (id) do nothing`,
      [cat.id, cat.name, cat.sortOrder, cat.kind],
    );
  }

  for (const pack of SAMPLE_JOBS) {
    await seedJobIfMissing(pack);
  }

  const state = await sql<{ value: string }>`
    select value from app_state where key = 'current_job_id'
  `;
  if (!state[0]?.value) {
    const prefer = await sql<{ id: string }>`select id from job where id = ${SEED_JOB.id}`;
    const fallback = await sql<{ id: string }>`select id from job order by updated_at desc limit 1`;
    const id = prefer[0]?.id ?? fallback[0]?.id;
    if (id) await setCurrentJobId(id);
  }

  try {
    await sql.query(`select setval('line_items_id_seq', (select max(id) from line_items))`);
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

async function listJobRows(): Promise<JobRow[]> {
  const sql = await getSql();
  return sql<JobRow>`select * from job order by updated_at desc, name`;
}

async function readSnapshot(jobId?: string): Promise<JobSnapshot> {
  await ensureSeed();
  const sql = await getSql();
  const id = jobId ?? (await currentJobId());
  const jobRows = await listJobRows();
  const jobRow = jobRows.find((j) => j.id === id) ?? jobRows[0];
  if (!jobRow) throw new Error("Job row missing after seed");
  if (jobRow.id !== id) await setCurrentJobId(jobRow.id);

  const categories = await sql<CategoryRow>`select * from categories order by sort_order, id`;
  const items = await sql<ItemRow>`
    select * from line_items where job_id = ${jobRow.id} order by sort_order, id
  `;
  const payments = await sql<PaymentRow>`
    select p.* from payments p
    join line_items li on li.id = p.line_item_id
    where li.job_id = ${jobRow.id}
    order by p.paid_on desc, p.id desc
  `;
  const changeOrders = await sql<CoRow>`
    select * from change_orders where job_id = ${jobRow.id} order by created_at desc, id desc
  `;
  return {
    job: mapJob(jobRow),
    jobs: jobRows.map(mapSummary),
    categories: categories.map(mapCategory),
    items: items.map(mapItem),
    payments: payments.map(mapPayment),
    changeOrders: changeOrders.map(mapCo),
  };
}

export const loadJob = createServerFn({ method: "GET" }).handler(async () => {
  return readSnapshot();
});

export const openJob = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await ensureSeed();
    const sql = await getSql();
    const found = await sql<{ id: string }>`select id from job where id = ${data.id}`;
    if (!found[0]) throw new Error("Job file not found");
    await setCurrentJobId(data.id);
    return readSnapshot(data.id);
  });

export const createJob = createServerFn({ method: "POST" }).handler(async () => {
  await ensureSeed();
  const sql = await getSql();
  const existing = await listJobRows();
  const untitled = existing.filter((j) => j.name.startsWith("Untitled job")).length;
  const name = untitled === 0 ? "Untitled job" : `Untitled job ${untitled + 1}`;
  const id = crypto.randomUUID();
  await sql.query(
    `insert into job (
      id, name, address, city, beds, baths_tenths, sqft, stories,
      land_cost_cents, target_sale_cents, start_date, target_close_date, notes
    ) values ($1,$2,'','',0,20,0,1,0,0,null,null,'')`,
    [id, name],
  );
  await setCurrentJobId(id);
  return readSnapshot(id);
});

export const deleteJob = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await ensureSeed();
    const sql = await getSql();
    const countRows = await sql<{ c: number }>`select count(*)::int as c from job`;
    if ((countRows[0]?.c ?? 0) <= 1) {
      throw new Error("Keep at least one job file");
    }
    await sql.query(`delete from change_orders where job_id = $1`, [data.id]);
    await sql.query(`delete from line_items where job_id = $1`, [data.id]);
    await sql.query(`delete from job where id = $1`, [data.id]);
    const current = await sql<{ value: string }>`
      select value from app_state where key = 'current_job_id'
    `;
    if (current[0]?.value === data.id) {
      const next = await sql<{ id: string }>`select id from job order by updated_at desc limit 1`;
      if (next[0]) await setCurrentJobId(next[0].id);
    }
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
    const id = await currentJobId();
    await sql.query(
      `update job set
        name = $1, address = $2, city = $3, beds = $4, baths_tenths = $5,
        sqft = $6, stories = $7, land_cost_cents = $8, target_sale_cents = $9,
        start_date = $10, target_close_date = $11, notes = $12, updated_at = now()
       where id = $13`,
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
        id,
      ],
    );
    return readSnapshot(id);
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
    const jobId = await currentJobId();
    await sql.query(
      `insert into line_items (
        job_id, category_id, name, vendor, original_budget_cents, committed_cents,
        actual_cents, pct_complete, notes, sort_order
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,
        coalesce((select max(sort_order)+1 from line_items where job_id = $1), 1))`,
      [
        jobId,
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
    return readSnapshot(jobId);
  });

export const updateItem = createServerFn({ method: "POST" })
  .validator(itemInput.extend({ id: z.number().int() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const jobId = await currentJobId();
    await sql.query(
      `update line_items set
        category_id = $3, name = $4, vendor = $5, original_budget_cents = $6,
        committed_cents = $7, actual_cents = $8, pct_complete = $9, notes = $10
       where id = $1 and job_id = $2`,
      [
        data.id,
        jobId,
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
    return readSnapshot(jobId);
  });

export const deleteItem = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const jobId = await currentJobId();
    await sql.query(`delete from line_items where id = $1 and job_id = $2`, [data.id, jobId]);
    return readSnapshot(jobId);
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
    const jobId = await currentJobId();
    const owned = await sql<{ id: number }>`
      select id from line_items where id = ${data.lineItemId} and job_id = ${jobId}
    `;
    if (!owned[0]) throw new Error("Line not on this job");
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
    return readSnapshot(jobId);
  });

export const deletePayment = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const jobId = await currentJobId();
    const rows = await sql<{ line_item_id: number }>`
      select p.line_item_id
      from payments p
      join line_items li on li.id = p.line_item_id
      where p.id = ${data.id} and li.job_id = ${jobId}
    `;
    const itemId = rows[0]?.line_item_id;
    if (itemId) {
      await sql.query(`delete from payments where id = $1`, [data.id]);
      await sql.query(
        `update line_items set actual_cents = (
           select coalesce(sum(amount_cents), 0) from payments where line_item_id = $1
         ) where id = $1`,
        [itemId],
      );
    }
    return readSnapshot(jobId);
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
    const jobId = await currentJobId();
    await sql.query(
      `insert into change_orders (job_id, line_item_id, title, amount_cents, status, reason)
       values ($1,$2,$3,$4,$5,$6)`,
      [jobId, data.lineItemId, data.title, data.amountCents, data.status, data.reason],
    );
    return readSnapshot(jobId);
  });

export const updateChangeOrder = createServerFn({ method: "POST" })
  .validator(coInput.extend({ id: z.number().int() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const jobId = await currentJobId();
    await sql.query(
      `update change_orders
       set line_item_id = $3, title = $4, amount_cents = $5, status = $6, reason = $7
       where id = $1 and job_id = $2`,
      [data.id, jobId, data.lineItemId, data.title, data.amountCents, data.status, data.reason],
    );
    return readSnapshot(jobId);
  });

export const deleteChangeOrder = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int() }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const jobId = await currentJobId();
    await sql.query(`delete from change_orders where id = $1 and job_id = $2`, [data.id, jobId]);
    return readSnapshot(jobId);
  });
