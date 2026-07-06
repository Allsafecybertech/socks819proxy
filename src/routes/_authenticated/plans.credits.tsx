import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit";
import { PlanGrid } from "@/components/plan-grid";
export const Route = createFileRoute("/_authenticated/plans/credits")({
  head: () => ({ meta: [{ title: "Credit Plans — NOVAIN SOCKS" }] }),
  component: () => (<><PageHeader title="Credit Plans" subtitle="Credits never expire. One reveal consumes one credit." /><PlanGrid type="credit" /></>),
});
