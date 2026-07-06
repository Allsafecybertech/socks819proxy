import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit";
import { PlanGrid } from "@/components/plan-grid";
export const Route = createFileRoute("/_authenticated/plans/daily")({
  head: () => ({ meta: [{ title: "Daily Plans — NOVAIN SOCKS" }] }),
  component: () => (<><PageHeader title="Daily Plans" subtitle="Time-based access with a maximum reveal cap." /><PlanGrid type="time" /></>),
});
