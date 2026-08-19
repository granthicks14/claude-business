"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icons";
import { PageHeader, Ready } from "@/components/page";
import {
  AILoading,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorPanel,
  LinkButton,
  useToast,
} from "@/components/ui";
import { currency } from "@/lib/finance";
import { actions, useAppState } from "@/lib/store";
import type { SelectedBusiness } from "@/lib/types";
import { useAITask } from "@/lib/useAI";

interface Retrospective {
  whatHappened: string;
  lessons: string[];
  couldItBeRevisited: string;
  whatWouldNeedToChange: string[];
}

export default function GraveyardPage() {
  return (
    <Ready>
      <Graveyard />
    </Ready>
  );
}

function Graveyard() {
  const state = useAppState((s) => s);
  const archived = state.businesses.filter((b) => b.archivedAt);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Graveyard"
        description="Businesses you stopped. Nothing here is wasted — most of what you know about your market you learned from these."
      />

      {archived.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Icon.archive className="size-8 mx-auto text-muted" />}
            title="Nothing archived"
            description="When you stop working on something, archive it instead of deleting it. You keep the lessons, and you can restore it later if it turns out you were early rather than wrong."
            action={<LinkButton href="/business" variant="primary">Back to my business</LinkButton>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {archived.map((business) => (
            <ArchivedCard key={business.id} business={business} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArchivedCard({ business }: { business: SelectedBusiness }) {
  const profile = useAppState((s) => s.profile);
  const router = useRouter();
  const toast = useToast();
  const task = useAITask<Retrospective>("graveyard");
  const [retro, setRetro] = useState<Retrospective | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const revenue = business.revenue.reduce((sum, r) => sum + r.amount, 0);
  const customers = business.customers.filter((c) => c.status === "customer").length;

  const analyse = async () => {
    const result = await task.run({
      profile,
      business,
      input: { reason: business.archiveReason ?? "", lessons: business.archiveLessons ?? "" },
    });
    if (result) setRetro(result);
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Badge>Archived {new Date(business.archivedAt ?? 0).toLocaleDateString()}</Badge>
          <h2 className="font-semibold mt-2">{business.idea.name}</h2>
          <p className="text-sm text-muted mt-1 leading-relaxed">{business.idea.oneLiner}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => {
              actions.restoreBusiness(business.id);
              toast(`${business.idea.name} restored`, "good");
              router.push("/business");
            }}
          >
            Restore
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} aria-label="Delete permanently">
            <Icon.trash className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-faint font-medium">Revenue</p>
          <p className="font-medium tabular-nums mt-0.5">{currency(revenue)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-faint font-medium">Customers</p>
          <p className="font-medium tabular-nums mt-0.5">{customers}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-faint font-medium">Tasks done</p>
          <p className="font-medium tabular-nums mt-0.5">
            {business.tasks.filter((t) => t.done).length}/{business.tasks.length}
          </p>
        </div>
      </div>

      {business.archiveReason && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs uppercase tracking-wide text-faint font-medium">Why you stopped</p>
          <p className="text-sm mt-1 leading-relaxed">{business.archiveReason}</p>
        </div>
      )}

      {business.archiveLessons && (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wide text-faint font-medium">What you learned</p>
          <p className="text-sm mt-1 leading-relaxed">{business.archiveLessons}</p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        {task.error && <ErrorPanel error={task.error} onRetry={analyse} retrying={task.loading} />}
        {task.loading && <AILoading stage={task.stage} stages={task.stages} stageIndex={task.stageIndex} compact />}

        {retro ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm">What happened</h3>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">{retro.whatHappened}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Worth keeping</h3>
              <ul className="mt-1.5 space-y-1.5">
                {retro.lessons.map((l, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-good shrink-0">✓</span>
                    <span className="leading-relaxed">{l}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Could it come back?</h3>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">{retro.couldItBeRevisited}</p>
              {retro.whatWouldNeedToChange.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {retro.whatWouldNeedToChange.map((c, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-faint shrink-0">•</span>
                      <span className="leading-relaxed text-muted">{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          !task.loading && (
            <Button size="sm" onClick={analyse} icon={<Icon.bolt className="size-4" />}>
              What can I learn from this?
            </Button>
          )
        )}
      </div>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete permanently?"
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)}>Keep it</Button>
            <Button
              variant="danger"
              onClick={() => {
                actions.deleteBusiness(business.id);
                toast("Deleted");
                setConfirmDelete(false);
              }}
            >
              Delete forever
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          This erases {business.idea.name} along with its plan, tasks, customers and revenue records. It can&apos;t be
          undone.
        </p>
      </Dialog>
    </Card>
  );
}
