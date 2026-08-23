"use client";

import { useMemo, useState, type ReactNode } from "react";

import { Icon } from "@/components/icons";
import { PageHeader, Ready, RequireBusiness } from "@/components/page";
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  EstimateNote,
  Field,
  Hi,
  Input,
  Meter,
  NumberInput,
  SectionHeader,
  Select,
  Stat,
  Tabs,
  useToast,
} from "@/components/ui";
import { Explain } from "@/components/teach";
import { currency, customersFromTraffic, runMoneyModel } from "@/lib/finance";
import { ECONOMICS_DISCLAIMER, SENSITIVITY_NOTE, useIntel } from "@/lib/intel";
import { actions, effectiveProfile, newId, useAppState } from "@/lib/store";
import type { Customer, ExpenseEntry, MoneyModelInputs, RevenueEntry, SelectedBusiness } from "@/lib/types";

export default function MoneyPage() {
  return (
    <Ready>
      <RequireBusiness>{(business) => <Money business={business} />}</RequireBusiness>
    </Ready>
  );
}

function Money({ business }: { business: SelectedBusiness }) {
  const [tab, setTab] = useState<"model" | "levers" | "ledger" | "customers">("model");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Money"
        description="Model the business before you run it, then track what actually happens. Every number here is calculated in your browser — nothing is sent anywhere."
      />

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: "model", label: "Money model" },
          { id: "levers", label: "What matters most" },
          { id: "ledger", label: "Revenue & expenses", badge: business.revenue.length + business.expenses.length || undefined },
          { id: "customers", label: "Customers", badge: business.customers.length || undefined },
        ]}
      />

      {tab === "model" && <Simulator business={business} />}
      {tab === "levers" && <Levers />}
      {tab === "ledger" && <Ledger business={business} />}
      {tab === "customers" && <Customers business={business} />}
    </div>
  );
}

/* -------------------------------------------------------------------- levers */

/**
 * Which of these numbers is actually worth your week.
 *
 * The money model tells you what happens if the inputs are right. This tells
 * you which input to go and check — which is the more useful question, because
 * nobody's first guesses are right and there isn't time to test them all.
 */
function Levers() {
  const intel = useIntel();
  const { sensitivity: sens, economics, scenarios, goal } = intel;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <SectionHeader
          title="Which number deserves your attention"
          description="Each row improves one input by 10% and leaves the rest alone. The ordering is the useful part."
        />
        <div className="space-y-4">
          {sens.map((s) => (
            <div key={s.input}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{s.label}</span>
                <Badge tone={s.band === "high" ? "accent" : s.band === "medium" ? "neutral" : "neutral"}>
                  {s.band === "high" ? "Biggest lever" : s.band === "medium" ? "Worth checking" : "Barely matters"}
                </Badge>
              </div>
              <div className="mt-1">
                <Meter
                  value={Math.min(100, Math.abs(s.impactPct))}
                  label={s.concrete}
                  tone={s.band === "high" ? "accent" : "good"}
                  hint={s.meaning}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-4 leading-relaxed">{SENSITIVITY_NOTE}</p>
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="What one customer is worth"
          description="Per-sale arithmetic, plus the one figure most tools invent."
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Kept per sale" value={currency(economics.contributionPerSale)} tone={economics.contributionPerSale > 0 ? "good" : "bad"} />
          <Stat label="Gross margin" value={`${economics.grossMarginPct}%`} />
          <Stat label="Cost to acquire" value={currency(economics.cac)} />
          <Stat
            label="Lifetime value"
            value={economics.ltv === null ? "Not known" : currency(economics.ltv)}
            tone={economics.ltv === null ? undefined : "good"}
          />
        </div>
        <p className="text-sm text-muted mt-4 leading-relaxed">{economics.ltvBasis}</p>
        {economics.paybackNote && <p className="text-sm text-muted mt-2 leading-relaxed">{economics.paybackNote}</p>}
        {economics.warnings.map((w) => (
          <p key={w} className="text-sm text-warn mt-3 leading-relaxed">
            {w}
          </p>
        ))}
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="Four ways this could go"
          description="Including the one most tools leave out."
        />
        <div className="space-y-3">
          {scenarios.map((s) => (
            <div
              key={s.key}
              className={`rounded-lg border p-3 ${s.key === "failure" ? "border-warn/30 bg-warn-soft" : "border-border"}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{s.label}</span>
                <span className="text-sm tabular-nums">
                  {currency(s.revenue)}/mo · profit {currency(s.profit)}
                </span>
              </div>
              <p className="text-xs text-muted mt-1 leading-relaxed">{s.assumption}</p>
              <p className="text-xs text-muted mt-0.5">{s.runwayNote}</p>
            </div>
          ))}
        </div>
        <EstimateNote>
          These are scenarios, not forecasts. They show what the arithmetic does at different volumes — nothing here
          predicts which one happens.
        </EstimateNote>
      </Card>

      <Card className="p-5">
        <SectionHeader
          title="Working backwards from your goal"
          description="What the income goal in your profile actually asks of you."
        />
        {goal.steps.length === 0 ? (
          <p className="text-sm text-muted">{goal.verdict}</p>
        ) : (
          <>
            <ol className="space-y-3">
              {goal.steps.map((s, i) => (
                <li key={s.label} className="flex gap-3">
                  <span className="shrink-0 size-6 rounded-full bg-surface-2 border border-border grid place-items-center text-xs font-medium">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="text-sm font-medium">{s.label}: </span>
                    <Hi tone="mark">{s.value}</Hi>
                    <span className="block text-xs text-muted mt-0.5 leading-relaxed">{s.from}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-sm mt-4 leading-relaxed rounded-lg border border-accent-border bg-accent-soft p-3">
              {goal.verdict}
            </p>
          </>
        )}
      </Card>

      <p className="text-xs text-muted leading-relaxed">{ECONOMICS_DISCLAIMER}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ simulator */

function Simulator({ business }: { business: SelectedBusiness }) {
  const profile = useAppState(effectiveProfile);
  const inputs = business.money;
  const result = useMemo(() => runMoneyModel(inputs, profile.incomeGoal), [inputs, profile.incomeGoal]);

  const set = (patch: Partial<MoneyModelInputs>) => {
    actions.updateBusiness(business.id, { money: { ...inputs, ...patch } });
  };

  const funnelCustomers = customersFromTraffic(inputs);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionHeader
          title="Your assumptions"
          description="Change anything and every figure below updates instantly. Start with what you'd charge and how many customers a month feels plausible."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Price per sale" htmlFor="m-price">
            <NumberInput id="m-price" value={inputs.price} onChange={(price) => set({ price })} prefix="$" label="Price per sale" />
          </Field>
          <Field label="Customers per month" htmlFor="m-customers">
            <NumberInput id="m-customers" value={inputs.customersPerMonth} onChange={(customersPerMonth) => set({ customersPerMonth })} label="Customers per month" />
          </Field>
          <Field label="Monthly traffic / leads" htmlFor="m-traffic" hint="Leave at 0 if you're not modelling a funnel.">
            <NumberInput id="m-traffic" value={inputs.monthlyTraffic} onChange={(monthlyTraffic) => set({ monthlyTraffic })} label="Monthly traffic" />
          </Field>
          <Field label={<><Explain id="conversion-rate">Conversion rate</Explain></>} htmlFor="m-conv">
            <NumberInput id="m-conv" value={inputs.conversionRate} onChange={(conversionRate) => set({ conversionRate })} suffix="%" max={100} step={0.1} label="Conversion rate" />
          </Field>
          <Field label={<>Cost to get a <Explain id="cac">customer</Explain></>} htmlFor="m-cac" hint="Ads, samples, travel, your time if you pay for it.">
            <NumberInput id="m-cac" value={inputs.cac} onChange={(cac) => set({ cac })} prefix="$" label="Customer acquisition cost" />
          </Field>
          <Field label={<><Explain id="variable-costs">Variable cost</Explain> per sale</>} htmlFor="m-var" hint="Materials, shipping, payment fees.">
            <NumberInput id="m-var" value={inputs.variableCostPerSale} onChange={(variableCostPerSale) => set({ variableCostPerSale })} prefix="$" label="Variable cost per sale" />
          </Field>
          <Field label={<><Explain id="fixed-costs">Fixed</Explain> monthly expenses</>} htmlFor="m-fixed" hint="Software, insurance, rent, subscriptions.">
            <NumberInput id="m-fixed" value={inputs.monthlyExpenses} onChange={(monthlyExpenses) => set({ monthlyExpenses })} prefix="$" label="Fixed monthly expenses" />
          </Field>
          <Field label="Refund / cancellation rate" htmlFor="m-refund">
            <NumberInput id="m-refund" value={inputs.refundRate} onChange={(refundRate) => set({ refundRate })} suffix="%" max={100} step={0.5} label="Refund rate" />
          </Field>
        </div>

        {inputs.monthlyTraffic > 0 && inputs.conversionRate > 0 && (
          <p className="text-xs text-muted mt-4 pt-3 border-t border-border">
            {inputs.monthlyTraffic.toLocaleString()} visitors × {inputs.conversionRate}% ={" "}
            <strong>{Math.round(funnelCustomers)} customers/month</strong> from your funnel.
          </p>
        )}
      </Card>

      {result.warnings.length > 0 && (
        <div className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3.5">
          <p className="text-sm font-medium mb-1.5">Worth looking at</p>
          <ul className="space-y-1">
            {result.warnings.map((w, i) => (
              <li key={i} className="text-sm text-muted flex gap-2">
                <span className="text-warn shrink-0">▲</span>
                <span className="leading-relaxed">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        {result.scenarios.map((s) => (
          <Card
            key={s.key}
            className={`p-5 ${s.key === "expected" ? "border-accent-border" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{s.label}</h3>
              {s.key === "expected" && <Badge tone="accent">Your inputs</Badge>}
            </div>
            <p className="text-xs text-muted mt-1 leading-relaxed min-h-8">{s.assumption}</p>

            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <Stat label={<><Explain id="revenue">Monthly revenue</Explain></>} value={currency(s.monthlyRevenue)} hint={`${currency(s.annualRevenue)}/year`} />
              <Stat
                label={<><Explain id="profit">Monthly profit</Explain></>}
                value={currency(s.monthlyProfit)}
                hint={`${currency(s.annualProfit)}/year`}
                tone={s.monthlyProfit > 0 ? "good" : "bad"}
              />
            </div>

            <dl className="mt-4 pt-4 border-t border-border space-y-1.5 text-[13px]">
              <Line label="Customers" value={String(Math.round(s.customers))} />
              <Line label="Gross profit" value={currency(s.grossProfit)} />
              <Line label={<><Explain id="margin">Gross margin</Explain></>} value={`${s.grossMarginPct}%`} />
              <Line label="Acquisition spend" value={`−${currency(s.acquisitionSpend)}`} />
              <Line label="Fixed costs" value={`−${currency(s.fixedExpenses)}`} />
              {s.refundLoss > 0 && <Line label="Refunds" value={`−${currency(s.refundLoss)}`} />}
              <Line label="Total costs" value={`−${currency(s.totalExpenses)}`} />
            </dl>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <Stat
            label={<><Explain id="break-even">Break-even</Explain></>}
            value={Number.isFinite(result.breakEvenCustomers) ? `${result.breakEvenCustomers} customers` : "Not reachable"}
            hint={
              Number.isFinite(result.breakEvenCustomers)
                ? `${currency(result.breakEvenRevenue)}/month to cover fixed costs`
                : "Each sale loses money at this price"
            }
            tone={Number.isFinite(result.breakEvenCustomers) ? undefined : "bad"}
          />
        </Card>
        <Card className="p-5">
          <Stat
            label="Profit per sale"
            value={currency(result.contributionPerSale)}
            hint="After variable costs, refunds and acquisition"
            tone={result.contributionPerSale > 0 ? "good" : "bad"}
          />
        </Card>
        <Card className="p-5">
          <Stat
            label={`To hit ${currency(profile.incomeGoal)}/mo`}
            value={result.customersForGoal !== null ? `${result.customersForGoal} customers` : "—"}
            hint={
              result.trafficForGoal
                ? `≈ ${result.trafficForGoal.toLocaleString()} visitors at ${business.money.conversionRate}%`
                : "Set a conversion rate to see traffic needed"
            }
          />
        </Card>
      </div>

      <EstimateNote>
        These are illustrative scenarios built from the assumptions you entered above — arithmetic, not forecasting.
        Real businesses differ, and this is not financial advice.
      </EstimateNote>
    </div>
  );
}

function Line({ label, value }: { label: ReactNode; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums font-medium">{value}</dd>
    </div>
  );
}

/* --------------------------------------------------------------------- ledger */

function Ledger({ business }: { business: SelectedBusiness }) {
  const toast = useToast();
  const [adding, setAdding] = useState<"revenue" | "expense" | null>(null);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState("");

  const revenue = business.revenue.reduce((sum, r) => sum + r.amount, 0);
  const expenses = business.expenses.reduce((sum, e) => sum + e.amount, 0);

  const save = () => {
    if (!label.trim() || amount <= 0) return;
    if (adding === "revenue") {
      const entry: RevenueEntry = {
        id: newId("rev"),
        label: label.trim(),
        amount,
        date,
        customerId: customerId || undefined,
      };
      actions.mutateBusiness(business.id, (b) => ({ ...b, revenue: [entry, ...b.revenue] }));
      toast(`${currency(amount)} logged`, "good");
    } else {
      const entry: ExpenseEntry = { id: newId("exp"), label: label.trim(), amount, date, recurring: false };
      actions.mutateBusiness(business.id, (b) => ({ ...b, expenses: [entry, ...b.expenses] }));
      toast("Expense logged");
    }
    setLabel("");
    setAmount(0);
    setCustomerId("");
    setAdding(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <Stat label="Revenue logged" value={currency(revenue)} tone={revenue > 0 ? "good" : undefined} />
        </Card>
        <Card className="p-4">
          <Stat label="Expenses logged" value={currency(expenses)} />
        </Card>
        <Card className="p-4">
          <Stat
            label="Net"
            value={currency(revenue - expenses)}
            tone={revenue - expenses > 0 ? "good" : revenue - expenses < 0 ? "bad" : undefined}
          />
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => setAdding("revenue")} icon={<Icon.plus className="size-4" />}>
          Log revenue
        </Button>
        <Button onClick={() => setAdding("expense")} icon={<Icon.plus className="size-4" />}>
          Log expense
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3">Revenue</h3>
          {business.revenue.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing yet. Log your first sale here — it&apos;s what moves the health score and the journey tracker.
            </p>
          ) : (
            <ul className="space-y-2">
              {business.revenue.map((r) => (
                <Entry
                  key={r.id}
                  label={r.label}
                  amount={r.amount}
                  date={r.date}
                  tone="good"
                  onDelete={() =>
                    actions.mutateBusiness(business.id, (b) => ({ ...b, revenue: b.revenue.filter((x) => x.id !== r.id) }))
                  }
                />
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-3">Expenses</h3>
          {business.expenses.length === 0 ? (
            <p className="text-sm text-muted">No expenses logged.</p>
          ) : (
            <ul className="space-y-2">
              {business.expenses.map((e) => (
                <Entry
                  key={e.id}
                  label={e.label}
                  amount={-e.amount}
                  date={e.date}
                  onDelete={() =>
                    actions.mutateBusiness(business.id, (b) => ({ ...b, expenses: b.expenses.filter((x) => x.id !== e.id) }))
                  }
                />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Dialog
        open={adding !== null}
        onClose={() => setAdding(null)}
        title={adding === "revenue" ? "Log revenue" : "Log an expense"}
        footer={
          <>
            <Button onClick={() => setAdding(null)}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={!label.trim() || amount <= 0}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="What was it?" htmlFor="entry-label">
            <Input
              id="entry-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={adding === "revenue" ? "Logo design for Sam" : "Domain registration"}
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount" htmlFor="entry-amount">
              <NumberInput id="entry-amount" value={amount} onChange={setAmount} prefix="$" label="Amount" />
            </Field>
            <Field label="Date" htmlFor="entry-date">
              <Input id="entry-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          {adding === "revenue" && business.customers.length > 0 && (
            <Field label="Customer" htmlFor="entry-customer" hint="Optional — linking lets the health score spot repeat business.">
              <Select id="entry-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Not linked</option>
                {business.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      </Dialog>
    </div>
  );
}

function Entry({
  label,
  amount,
  date,
  tone,
  onDelete,
}: {
  label: string;
  amount: number;
  date: string;
  tone?: "good";
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{label}</p>
        <p className="text-[11px] text-faint">{new Date(date).toLocaleDateString()}</p>
      </div>
      <span className={`text-sm font-semibold tabular-nums ${tone === "good" ? "text-good" : "text-muted"}`}>
        {amount > 0 ? "+" : ""}
        {currency(amount)}
      </span>
      <button
        onClick={onDelete}
        aria-label={`Delete ${label}`}
        className="size-7 grid place-items-center rounded text-faint hover:text-bad transition-colors shrink-0"
      >
        <Icon.trash className="size-3.5" />
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ customers */

const STATUS_LABEL: Record<Customer["status"], string> = {
  lead: "Lead",
  conversation: "In conversation",
  customer: "Customer",
  churned: "Churned",
};

function Customers({ business }: { business: SelectedBusiness }) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");

  const save = () => {
    if (!name.trim()) return;
    const customer: Customer = {
      id: newId("cust"),
      name: name.trim(),
      contact: contact.trim(),
      status: "lead",
      notes: notes.trim(),
      value: 0,
      createdAt: Date.now(),
    };
    actions.mutateBusiness(business.id, (b) => ({ ...b, customers: [customer, ...b.customers] }));
    setName("");
    setContact("");
    setNotes("");
    setAdding(false);
    toast("Contact added", "good");
  };

  const byStatus = (status: Customer["status"]) => business.customers.filter((c) => c.status === status);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {(["lead", "conversation", "customer", "churned"] as const).map((status) => (
          <Card key={status} className="p-4">
            <Stat
              label={STATUS_LABEL[status]}
              value={byStatus(status).length}
              tone={status === "customer" ? "good" : undefined}
            />
          </Card>
        ))}
      </div>

      <Button variant="primary" onClick={() => setAdding(true)} icon={<Icon.plus className="size-4" />}>
        Add a contact
      </Button>

      {business.customers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Icon.handshake className="size-8 mx-auto text-accent" />}
            title="No contacts yet"
            description="Track everyone you talk to, not just the ones who buy. The pattern in the ones who say no is usually the most useful thing you'll learn early on."
          />
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {business.customers.map((c) => (
            <div key={c.id} className="p-4 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{c.name}</p>
                {c.contact && <p className="text-xs text-muted truncate">{c.contact}</p>}
                {c.notes && <p className="text-xs text-muted mt-1 leading-relaxed">{c.notes}</p>}
              </div>
              <Select
                value={c.status}
                onChange={(e) => {
                  const status = e.target.value as Customer["status"];
                  actions.mutateBusiness(business.id, (b) => ({
                    ...b,
                    customers: b.customers.map((x) => (x.id === c.id ? { ...x, status } : x)),
                  }));
                  if (status === "customer") toast("A customer. That's the hard part done.", "good");
                }}
                aria-label={`Status for ${c.name}`}
                className="w-auto min-w-36"
              >
                {(["lead", "conversation", "customer", "churned"] as const).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
              <button
                onClick={() =>
                  actions.mutateBusiness(business.id, (b) => ({ ...b, customers: b.customers.filter((x) => x.id !== c.id) }))
                }
                aria-label={`Remove ${c.name}`}
                className="size-8 grid place-items-center rounded-lg text-faint hover:text-bad transition-colors"
              >
                <Icon.trash className="size-4" />
              </button>
            </div>
          ))}
        </Card>
      )}

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a contact"
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={!name.trim()}>
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" htmlFor="c-name">
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="How to reach them" htmlFor="c-contact">
            <Input id="c-contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email, phone or @handle" />
          </Field>
          <Field label="Notes" htmlFor="c-notes">
            <Input id="c-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Met at the farmers market, wants pricing" />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
