import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  FilePlus,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, MoneyField, NativeSelect, NotesField } from "@/components/tracker/fields";
import {
  createChangeOrder,
  createItem,
  createJob,
  createPayment,
  deleteChangeOrder,
  deleteItem,
  deleteJob,
  deletePayment,
  openJob,
  updateChangeOrder,
  updateItem,
  updateJob,
} from "@/lib/tracker/functions";
import { bathsLabel, formatCompact, formatMoney, formatPct, isoToday } from "@/lib/tracker/format";
import { itemStatus, rollupJob, type ItemRollup } from "@/lib/tracker/rollup";
import type {
  ChangeOrder,
  ChangeOrderStatus,
  JobSnapshot,
  LineItem,
  PaymentMethod,
} from "@/lib/tracker/types";
import { CO_STATUSES, PAYMENT_METHODS } from "@/lib/tracker/types";
import { cn } from "@/lib/utils";

type Tab = "overview" | "budget" | "draws" | "changes";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "budget", label: "Budget" },
  { id: "draws", label: "Draws" },
  { id: "changes", label: "Changes" },
];

const METHOD_LABEL: Record<PaymentMethod, string> = {
  check: "Check",
  ach: "ACH",
  wire: "Wire",
  card: "Card",
  cash: "Cash",
  retainage: "Retainage",
};

export function JobApp({ initial }: { initial: JobSnapshot }) {
  const [snap, setSnap] = useState(initial);
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);
  const [jobOpen, setJobOpen] = useState(false);
  const [itemEdit, setItemEdit] = useState<Partial<LineItem> | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [coOpen, setCoOpen] = useState(false);

  useEffect(() => {
    setSnap(initial);
  }, [initial]);

  const rolled = useMemo(() => rollupJob(snap), [snap]);

  async function run(op: () => Promise<JobSnapshot>) {
    setBusy(true);
    try {
      setSnap(await op());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-serif text-4xl leading-none tracking-tight text-ink sm:text-5xl">
                {jobTitle(snap.job.name)}
              </p>
              <p className="mt-1 text-xs font-medium tracking-[0.22em] text-muted uppercase">
                Spec house ledger
              </p>
              <p className="mt-3 truncate text-sm text-muted">
                {snap.job.address}
                {snap.job.city ? ` · ${snap.job.city}` : ""} · {snap.job.beds} bed /{" "}
                {bathsLabel(snap.job.bathsTenths)} bath · {snap.job.sqft.toLocaleString()} sf
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Export CSV"
                onClick={() => exportCsv(snap, rolled.items)}
              >
                <Download />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Job file"
                onClick={() => setJobOpen(true)}
              >
                <Settings2 />
              </Button>
            </div>
          </div>

          <KpiStrip totals={rolled.totals} />

          <nav className="-mb-px flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-label={
                  t.id === "changes" && rolled.totals.pendingCoCount > 0
                    ? `Changes, ${rolled.totals.pendingCoCount} pending`
                    : t.label
                }
                className={cn(
                  "h-11 shrink-0 border-b-2 px-3 text-sm font-medium transition-colors duration-150",
                  tab === t.id
                    ? "border-accent text-ink"
                    : "border-transparent text-muted hover:text-ink",
                )}
              >
                {t.label}
                {t.id === "changes" && rolled.totals.pendingCoCount > 0 ? (
                  <span className="ml-2 font-mono text-xs text-warn">
                    {rolled.totals.pendingCoCount}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {tab === "overview" ? (
          <OverviewPanel
            snap={snap}
            rolled={rolled}
            onOpenItem={(item) => setItemEdit(item)}
          />
        ) : null}
        {tab === "budget" ? (
          <BudgetPanel
            snap={snap}
            rolled={rolled}
            busy={busy}
            onAdd={() =>
              setItemEdit({
                categoryId: snap.categories[2]?.id ?? snap.categories[0]?.id,
                name: "",
                vendor: "",
                originalBudgetCents: 0,
                committedCents: 0,
                actualCents: 0,
                pctComplete: 0,
                notes: "",
              })
            }
            onEdit={setItemEdit}
          />
        ) : null}
        {tab === "draws" ? (
          <DrawsPanel
            snap={snap}
            rolled={rolled}
            busy={busy}
            onAdd={() => setPayOpen(true)}
            onDelete={(id) => run(() => deletePayment({ data: { id } }))}
          />
        ) : null}
        {tab === "changes" ? (
          <ChangesPanel
            snap={snap}
            busy={busy}
            onAdd={() => setCoOpen(true)}
            onStatus={(co, status) =>
              run(() =>
                updateChangeOrder({
                  data: {
                    id: co.id,
                    lineItemId: co.lineItemId,
                    title: co.title,
                    amountCents: co.amountCents,
                    status,
                    reason: co.reason,
                  },
                }),
              )
            }
            onDelete={(id) => run(() => deleteChangeOrder({ data: { id } }))}
          />
        ) : null}
      </main>

      <JobDialog
        open={jobOpen}
        onOpenChange={setJobOpen}
        snap={snap}
        busy={busy}
        onSave={(data) =>
          run(async () => {
            const next = await updateJob({ data });
            setJobOpen(false);
            return next;
          })
        }
        onNew={() => run(() => createJob())}
        onOpenFile={(id) => run(() => openJob({ data: { id } }))}
        onDeleteFile={(id) => run(() => deleteJob({ data: { id } }))}
      />
      {itemEdit ? (
        <ItemDialog
          snap={snap}
          draft={itemEdit}
          busy={busy}
          onOpenChange={(open) => {
            if (!open) setItemEdit(null);
          }}
          onSave={(data) =>
            run(async () => {
              const next =
                data.id === undefined
                  ? await createItem({ data })
                  : await updateItem({ data: { ...data, id: data.id } });
              setItemEdit(null);
              return next;
            })
          }
          onDelete={
            itemEdit.id
              ? () =>
                  run(async () => {
                    const next = await deleteItem({ data: { id: itemEdit.id as number } });
                    setItemEdit(null);
                    return next;
                  })
              : undefined
          }
        />
      ) : null}
      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        snap={snap}
        busy={busy}
        onSave={(data) =>
          run(async () => {
            const next = await createPayment({ data });
            setPayOpen(false);
            return next;
          })
        }
      />
      <ChangeDialog
        open={coOpen}
        onOpenChange={setCoOpen}
        snap={snap}
        busy={busy}
        onSave={(data) =>
          run(async () => {
            const next = await createChangeOrder({ data });
            setCoOpen(false);
            return next;
          })
        }
      />
    </div>
  );
}

function KpiStrip({ totals }: { totals: ReturnType<typeof rollupJob>["totals"] }) {
  const profitPositive = totals.projectedProfitCents >= 0;
  const items = [
    { label: "List price", value: formatCompact(totals.saleCents), hint: "Target close" },
    { label: "Job cost", value: formatCompact(totals.revisedBudgetCents), hint: "Revised budget" },
    { label: "Spent", value: formatCompact(totals.actualCents), hint: formatPct(totals.spentOfBudget, 0) + " of budget" },
    { label: "Left to spend", value: formatCompact(totals.remainingCents), hint: "Against budget" },
    {
      label: "Projected profit",
      value: formatCompact(totals.projectedProfitCents),
      hint: formatPct(totals.projectedMargin, 1) + " margin",
      tone: profitPositive ? "ok" : "bad",
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-lg border border-line bg-bg px-3 py-3 sm:px-4"
        >
          <p className="text-xs font-medium tracking-wide text-muted uppercase">{kpi.label}</p>
          <p
            className={cn(
              "mt-1 font-mono text-xl font-medium tabular-nums sm:text-2xl",
              "tone" in kpi && kpi.tone === "ok" && "text-ok",
              "tone" in kpi && kpi.tone === "bad" && "text-bad",
            )}
          >
            {kpi.value}
          </p>
          <p className="mt-0.5 text-xs text-subtle">{kpi.hint}</p>
        </div>
      ))}
    </div>
  );
}

function OverviewPanel({
  snap,
  rolled,
  onOpenItem,
}: {
  snap: JobSnapshot;
  rolled: ReturnType<typeof rollupJob>;
  onOpenItem: (item: ItemRollup) => void;
}) {
  const { totals, categories, items } = rolled;
  const sale = Math.max(totals.saleCents, 1);
  const segs = [
    { key: "land", label: "Land", cents: totals.byKind.land, className: "bg-accent" },
    { key: "hard", label: "Hard", cents: totals.byKind.hard, className: "bg-ink/70" },
    { key: "soft", label: "Soft", cents: totals.byKind.soft, className: "bg-ink/40" },
    { key: "cont", label: "Hold", cents: totals.byKind.contingency, className: "bg-warn" },
    {
      key: "profit",
      label: "Profit",
      cents: Math.max(0, totals.profitAtBudgetCents),
      className: "bg-ok",
    },
  ];
  const overs = items.filter((i) => i.overBudget);
  const dates = [snap.job.startDate, snap.job.targetCloseDate].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-ink">Sale stack</h2>
            <p className="mt-1 text-sm text-muted">
              Every dollar of the list price, from dirt to hold to leftover.
            </p>
          </div>
          {dates.length ? (
            <p className="font-mono text-xs text-subtle tabular-nums">
              {snap.job.startDate ?? "—"} → {snap.job.targetCloseDate ?? "—"}
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-sunken">
          {segs.map((s) => (
            <div
              key={s.key}
              className={cn("h-full", s.className)}
              style={{ width: `${(s.cents / sale) * 100}%` }}
              title={`${s.label} ${formatMoney(s.cents)}`}
            />
          ))}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {segs.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-sm">
              <span className={cn("size-2.5 rounded-full", s.className)} />
              <span className="text-muted">{s.label}</span>
              <span className="ml-auto font-mono text-xs tabular-nums">{formatCompact(s.cents)}</span>
            </li>
          ))}
        </ul>
      </section>

      {snap.job.notes ? (
        <p className="border-l-2 border-line-strong pl-4 text-sm leading-relaxed text-muted">
          {snap.job.notes}
        </p>
      ) : null}

      {overs.length > 0 || totals.pendingCoCount > 0 ? (
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-medium text-ink">
            <AlertTriangle className="size-4 text-warn" />
            Watch list
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {overs.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpenItem(item)}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left hover:bg-sunken"
                >
                  <span className="text-sm">{item.name}</span>
                  <span className="font-mono text-sm text-bad tabular-nums">
                    {formatMoney(item.varianceCents)}
                  </span>
                </button>
              </li>
            ))}
            {totals.pendingCoCount > 0 ? (
              <li className="px-2 py-1 text-sm text-muted">
                {totals.pendingCoCount} change order{totals.pendingCoCount === 1 ? "" : "s"} pending ·{" "}
                <span className="font-mono tabular-nums">{formatMoney(totals.pendingCoCents)}</span>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="font-serif text-2xl text-ink">By trade</h2>
        <div className="mt-4 flex flex-col gap-4">
          {categories.map((row) => {
            const max = Math.max(row.revisedBudgetCents, row.actualCents, 1);
            return (
              <div key={row.category.id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">{row.category.name}</p>
                  <p className="font-mono text-xs text-muted tabular-nums">
                    {formatCompact(row.actualCents)} / {formatCompact(row.revisedBudgetCents)}
                  </p>
                </div>
                <div className="relative h-2 rounded-full bg-sunken">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-line-strong"
                    style={{ width: `${(row.revisedBudgetCents / max) * 100}%` }}
                  />
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      row.overCount > 0 ? "bg-bad" : "bg-accent",
                    )}
                    style={{
                      width: `${Math.min(100, (row.actualCents / max) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function BudgetPanel({
  snap,
  rolled,
  busy,
  onAdd,
  onEdit,
}: {
  snap: JobSnapshot;
  rolled: ReturnType<typeof rollupJob>;
  busy: boolean;
  onAdd: () => void;
  onEdit: (item: ItemRollup) => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "over" | "active" | "planned" | "complete">("all");
  const query = q.trim().toLowerCase();

  const visible = rolled.items.filter((item) => {
    const status = itemStatus(item);
    if (filter !== "all" && status !== filter) return false;
    if (!query) return true;
    const cat = snap.categories.find((c) => c.id === item.categoryId)?.name ?? "";
    return `${item.name} ${item.vendor} ${cat}`.toLowerCase().includes(query);
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search lines, vendors…"
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1">
          {(["all", "over", "active", "planned", "complete"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "h-9 rounded-full px-3 text-xs font-medium capitalize",
                filter === id ? "bg-accent text-accent-fg" : "bg-sunken text-muted",
              )}
            >
              {id}
            </button>
          ))}
        </div>
        <Button className="sm:ml-auto" onClick={onAdd} disabled={busy}>
          <Plus />
          Add line
        </Button>
      </div>

      {snap.categories.map((cat) => {
        const rows = visible.filter((i) => i.categoryId === cat.id);
        if (rows.length === 0) return null;
        const sub = rolled.categories.find((c) => c.category.id === cat.id);
        return (
          <section key={cat.id} className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3">
              <h3 className="text-sm font-medium tracking-wide uppercase">{cat.name}</h3>
              {sub ? (
                <p className="font-mono text-xs text-muted tabular-nums">
                  {formatMoney(sub.actualCents)} / {formatMoney(sub.revisedBudgetCents)}
                </p>
              ) : null}
            </div>
            <ul className="divide-y divide-line">
              {rows.map((item) => {
                const status = itemStatus(item);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-sunken sm:flex-row sm:items-center sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <StatusBadge status={status} />
                        </div>
                        <p className="truncate text-xs text-subtle">
                          {item.vendor || "No vendor"}
                          {item.approvedCoCents !== 0
                            ? ` · CO ${formatMoney(item.approvedCoCents)}`
                            : ""}
                        </p>
                      </div>
                      <div className="grid w-full grid-cols-3 gap-2 font-mono text-xs tabular-nums sm:w-auto sm:min-w-80 sm:grid-cols-3">
                        <span className="text-muted">
                          <span className="mr-1 text-subtle">Bud</span>
                          {formatMoney(item.revisedBudgetCents)}
                        </span>
                        <span>
                          <span className="mr-1 text-subtle">Act</span>
                          {formatMoney(item.actualCents)}
                        </span>
                        <span className={item.varianceCents < 0 ? "text-bad" : "text-ok"}>
                          <span className="mr-1 text-subtle">Var</span>
                          {formatMoney(item.varianceCents)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-10 text-center text-sm text-muted">
          No lines match that filter.
        </p>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: ReturnType<typeof itemStatus> }) {
  if (status === "over") return <Badge tone="bad">Over</Badge>;
  if (status === "complete") return <Badge tone="ok">Done</Badge>;
  if (status === "active") return <Badge tone="warn">Active</Badge>;
  return <Badge>Planned</Badge>;
}

function DrawsPanel({
  snap,
  rolled,
  busy,
  onAdd,
  onDelete,
}: {
  snap: JobSnapshot;
  rolled: ReturnType<typeof rollupJob>;
  busy: boolean;
  onAdd: () => void;
  onDelete: (id: number) => void;
}) {
  const nameOf = (id: number) => rolled.items.find((i) => i.id === id)?.name ?? "Line";
  const total = snap.payments.reduce((s, p) => s + p.amountCents, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {snap.payments.length} draws ·{" "}
          <span className="font-mono tabular-nums text-ink">{formatMoney(total)}</span>
        </p>
        <Button onClick={onAdd} disabled={busy}>
          <Plus />
          Log draw
        </Button>
      </div>
      <ul className="overflow-hidden rounded-xl border border-line bg-surface divide-y divide-line">
        {snap.payments.map((p) => (
          <li key={p.id} className="flex items-start gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p className="font-mono text-sm tabular-nums">{formatMoney(p.amountCents)}</p>
                <p className="text-sm text-muted">{p.payee}</p>
              </div>
              <p className="text-xs text-subtle">
                {p.paidOn} · {nameOf(p.lineItemId)} · {METHOD_LABEL[p.method]}
                {p.memo ? ` · ${p.memo}` : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete draw"
              disabled={busy}
              onClick={() => onDelete(p.id)}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
        {snap.payments.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-muted">No draws yet.</li>
        ) : null}
      </ul>
    </div>
  );
}

function ChangesPanel({
  snap,
  busy,
  onAdd,
  onStatus,
  onDelete,
}: {
  snap: JobSnapshot;
  busy: boolean;
  onAdd: () => void;
  onStatus: (co: ChangeOrder, status: ChangeOrderStatus) => void;
  onDelete: (id: number) => void;
}) {
  const nameOf = (id: number | null) =>
    id === null ? "Unassigned" : snap.items.find((i) => i.id === id)?.name ?? "Line";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Approved COs rewrite the working budget.</p>
        <Button onClick={onAdd} disabled={busy}>
          <Plus />
          New CO
        </Button>
      </div>
      <ul className="flex flex-col gap-3">
        {snap.changeOrders.map((co) => (
          <li key={co.id} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{co.title}</p>
                  <Badge
                    tone={
                      co.status === "approved" ? "ok" : co.status === "rejected" ? "neutral" : "warn"
                    }
                  >
                    {co.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-subtle">{nameOf(co.lineItemId)}</p>
              </div>
              <p
                className={cn(
                  "font-mono text-sm tabular-nums",
                  co.amountCents < 0 ? "text-ok" : "text-ink",
                )}
              >
                {formatMoney(co.amountCents)}
              </p>
            </div>
            {co.reason ? <p className="mt-2 text-sm text-muted">{co.reason}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {co.status !== "approved" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onStatus(co, "approved")}
                >
                  Approve
                </Button>
              ) : null}
              {co.status !== "rejected" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => onStatus(co, "rejected")}
                >
                  Reject
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onDelete(co.id)}
                className="ml-auto text-bad hover:bg-bad-soft"
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
        {snap.changeOrders.length === 0 ? (
          <li className="rounded-xl border border-dashed border-line-strong px-4 py-10 text-center text-sm text-muted">
            No change orders.
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function jobTitle(name: string): string {
  const m = name.trim().match(/^(\d+)\b/);
  return m ? m[1] : name;
}

function JobDialog({
  open,
  onOpenChange,
  snap,
  busy,
  onSave,
  onNew,
  onOpenFile,
  onDeleteFile,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  snap: JobSnapshot;
  busy: boolean;
  onSave: (data: Parameters<typeof updateJob>[0]["data"]) => void;
  onNew: () => void;
  onOpenFile: (id: string) => void;
  onDeleteFile: (id: string) => void;
}) {
  const j = snap.job;
  const [form, setForm] = useState({
    name: j.name,
    address: j.address,
    city: j.city,
    beds: j.beds,
    bathsTenths: j.bathsTenths,
    sqft: j.sqft,
    stories: j.stories,
    landCostCents: j.landCostCents,
    targetSaleCents: j.targetSaleCents,
    startDate: j.startDate ?? "",
    targetCloseDate: j.targetCloseDate ?? "",
    notes: j.notes,
  });
  useEffect(() => {
    if (open) {
      setForm({
        name: j.name,
        address: j.address,
        city: j.city,
        beds: j.beds,
        bathsTenths: j.bathsTenths,
        sqft: j.sqft,
        stories: j.stories,
        landCostCents: j.landCostCents,
        targetSaleCents: j.targetSaleCents,
        startDate: j.startDate ?? "",
        targetCloseDate: j.targetCloseDate ?? "",
        notes: j.notes,
      });
    }
  }, [open, j]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Job file">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              ...form,
              startDate: form.startDate || null,
              targetCloseDate: form.targetCloseDate || null,
            });
          }}
        >
          <section className="rounded-lg border border-line bg-bg p-2">
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <p className="text-xs font-medium tracking-wide text-muted uppercase">Files</p>
              <span className="font-mono text-xs text-subtle tabular-nums">
                {snap.jobs.length}
              </span>
            </div>
            <ul className="flex max-h-40 flex-col gap-0.5 overflow-y-auto">
              {snap.jobs.map((file) => {
                const current = file.id === snap.job.id;
                return (
                  <li key={file.id}>
                    <div
                      className={cn(
                        "flex items-center gap-1 rounded-md",
                        current ? "bg-sunken" : "hover:bg-sunken/60",
                      )}
                    >
                      <button
                        type="button"
                        disabled={busy || current}
                        onClick={() => onOpenFile(file.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left"
                      >
                        {current ? (
                          <Check className="size-3.5 shrink-0 text-ok" />
                        ) : (
                          <span className="size-3.5 shrink-0" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">
                            {file.name}
                          </span>
                          <span className="block truncate text-xs text-subtle">
                            {file.address
                              ? `${file.address}${file.city ? ` · ${file.city}` : ""}`
                              : "No address yet"}
                          </span>
                        </span>
                      </button>
                      {snap.jobs.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11 shrink-0 text-muted hover:text-bad"
                          aria-label={`Delete ${file.name}`}
                          disabled={busy}
                          onClick={() => onDeleteFile(file.id)}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Address">
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Beds">
              <Input
                type="number"
                min={0}
                value={form.beds}
                onChange={(e) => setForm({ ...form, beds: Number(e.target.value) })}
              />
            </Field>
            <Field label="Baths">
              <NativeSelect
                value={String(form.bathsTenths)}
                onChange={(e) => setForm({ ...form, bathsTenths: Number(e.target.value) })}
              >
                {[10, 15, 20, 25, 30, 35, 40, 45, 50].map((n) => (
                  <option key={n} value={n}>
                    {n % 10 === 0 ? n / 10 : (n / 10).toFixed(1)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Sq ft">
              <Input
                type="number"
                min={0}
                value={form.sqft}
                onChange={(e) => setForm({ ...form, sqft: Number(e.target.value) })}
              />
            </Field>
            <Field label="Stories">
              <Input
                type="number"
                min={1}
                value={form.stories}
                onChange={(e) => setForm({ ...form, stories: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MoneyField
              label="Land cost"
              valueCents={form.landCostCents}
              onChange={(landCostCents) => setForm({ ...form, landCostCents })}
            />
            <MoneyField
              label="Target sale"
              valueCents={form.targetSaleCents}
              onChange={(targetSaleCents) => setForm({ ...form, targetSaleCents })}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Start">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </Field>
            <Field label="Target close">
              <Input
                type="date"
                value={form.targetCloseDate}
                onChange={(e) => setForm({ ...form, targetCloseDate: e.target.value })}
              />
            </Field>
          </div>
          <NotesField value={form.notes} onChange={(notes) => setForm({ ...form, notes })} />
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onNew}
              className="sm:flex-1"
            >
              <FilePlus />
              New file
            </Button>
            <Button type="submit" disabled={busy} className="sm:flex-1">
              Save job
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ItemDialog({
  snap,
  draft,
  busy,
  onOpenChange,
  onSave,
  onDelete,
}: {
  snap: JobSnapshot;
  draft: Partial<LineItem>;
  busy: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: {
    id?: number;
    categoryId: string;
    name: string;
    vendor: string;
    originalBudgetCents: number;
    committedCents: number;
    actualCents: number;
    pctComplete: number;
    notes: string;
  }) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState({
    categoryId: draft.categoryId ?? snap.categories[0]?.id ?? "hard",
    name: draft.name ?? "",
    vendor: draft.vendor ?? "",
    originalBudgetCents: draft.originalBudgetCents ?? 0,
    committedCents: draft.committedCents ?? 0,
    actualCents: draft.actualCents ?? 0,
    pctComplete: draft.pctComplete ?? 0,
    notes: draft.notes ?? "",
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent title={draft.id ? "Edit line" : "New line"}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim()) return;
            onSave({ ...form, id: draft.id, name: form.name.trim() });
          }}
        >
          <Field label="Category">
            <NativeSelect
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              {snap.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Line">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Vendor">
            <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MoneyField
              label="Original budget"
              valueCents={form.originalBudgetCents}
              onChange={(originalBudgetCents) => setForm({ ...form, originalBudgetCents })}
            />
            <MoneyField
              label="Committed"
              valueCents={form.committedCents}
              onChange={(committedCents) => setForm({ ...form, committedCents })}
            />
            <MoneyField
              label="Actual"
              valueCents={form.actualCents}
              onChange={(actualCents) => setForm({ ...form, actualCents })}
            />
          </div>
          <Field label={`Complete ${form.pctComplete}%`}>
            <input
              type="range"
              min={0}
              max={100}
              value={form.pctComplete}
              onChange={(e) => setForm({ ...form, pctComplete: Number(e.target.value) })}
              className="h-11 w-full accent-accent"
            />
          </Field>
          <NotesField value={form.notes} onChange={(notes) => setForm({ ...form, notes })} />
          <div className="mt-2 flex gap-2">
            <Button type="submit" disabled={busy} className="flex-1">
              Save line
            </Button>
            {onDelete ? (
              <Button type="button" variant="outline" disabled={busy} onClick={onDelete}>
                <Trash2 />
              </Button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({
  open,
  onOpenChange,
  snap,
  busy,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  snap: JobSnapshot;
  busy: boolean;
  onSave: (data: {
    lineItemId: number;
    paidOn: string;
    amountCents: number;
    payee: string;
    method: PaymentMethod;
    memo: string;
  }) => void;
}) {
  const [form, setForm] = useState({
    lineItemId: snap.items[0]?.id ?? 0,
    paidOn: isoToday(),
    amountCents: 0,
    payee: "",
    method: "check" as PaymentMethod,
    memo: "",
  });
  useEffect(() => {
    if (open) {
      setForm({
        lineItemId: snap.items[0]?.id ?? 0,
        paidOn: isoToday(),
        amountCents: 0,
        payee: "",
        method: "check",
        memo: "",
      });
    }
  }, [open, snap.items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Log a draw">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.lineItemId || form.amountCents === 0) return;
            onSave(form);
          }}
        >
          <Field label="Against line">
            <NativeSelect
              value={String(form.lineItemId)}
              onChange={(e) => setForm({ ...form, lineItemId: Number(e.target.value) })}
            >
              {snap.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Date">
              <Input
                type="date"
                value={form.paidOn}
                onChange={(e) => setForm({ ...form, paidOn: e.target.value })}
              />
            </Field>
            <MoneyField
              label="Amount"
              valueCents={form.amountCents}
              onChange={(amountCents) => setForm({ ...form, amountCents })}
            />
          </div>
          <Field label="Payee">
            <Input value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} />
          </Field>
          <Field label="Method">
            <NativeSelect
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {METHOD_LABEL[m]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Memo">
            <Input value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
          </Field>
          <Button type="submit" disabled={busy} className="mt-2">
            Save draw
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangeDialog({
  open,
  onOpenChange,
  snap,
  busy,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  snap: JobSnapshot;
  busy: boolean;
  onSave: (data: {
    lineItemId: number | null;
    title: string;
    amountCents: number;
    status: ChangeOrderStatus;
    reason: string;
  }) => void;
}) {
  const [form, setForm] = useState({
    lineItemId: snap.items[0]?.id ?? 0,
    title: "",
    amountCents: 0,
    status: "pending" as ChangeOrderStatus,
    reason: "",
  });
  useEffect(() => {
    if (open) {
      setForm({
        lineItemId: snap.items[0]?.id ?? 0,
        title: "",
        amountCents: 0,
        status: "pending",
        reason: "",
      });
    }
  }, [open, snap.items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Change order">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.title.trim()) return;
            onSave({ ...form, title: form.title.trim() });
          }}
        >
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </Field>
          <Field label="Line">
            <NativeSelect
              value={String(form.lineItemId)}
              onChange={(e) => setForm({ ...form, lineItemId: Number(e.target.value) })}
            >
              {snap.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <MoneyField
            label="Amount (negative = credit)"
            valueCents={form.amountCents}
            allowNegative
            onChange={(amountCents) => setForm({ ...form, amountCents })}
          />
          <Field label="Status">
            <NativeSelect
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ChangeOrderStatus })}
            >
              {CO_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <NotesField value={form.reason} onChange={(reason) => setForm({ ...form, reason })} />
          <Button type="submit" disabled={busy} className="mt-2">
            Save CO
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function exportCsv(snap: JobSnapshot, items: ItemRollup[]) {
  const header = [
    "Category",
    "Line",
    "Vendor",
    "Original",
    "Approved COs",
    "Budget",
    "Committed",
    "Actual",
    "Variance",
    "Complete %",
    "Notes",
  ];
  const catName = (id: string) => snap.categories.find((c) => c.id === id)?.name ?? id;
  const rows = items.map((item) => [
    catName(item.categoryId),
    item.name,
    item.vendor,
    (item.originalBudgetCents / 100).toFixed(2),
    (item.approvedCoCents / 100).toFixed(2),
    (item.revisedBudgetCents / 100).toFixed(2),
    (item.committedCents / 100).toFixed(2),
    (item.actualCents / 100).toFixed(2),
    (item.varianceCents / 100).toFixed(2),
    String(item.pctComplete),
    item.notes.replaceAll('"', '""'),
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${c}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${snap.job.name.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "job"}-budget.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
