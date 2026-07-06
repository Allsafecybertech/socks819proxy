import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit";
import { PlanGrid } from "@/components/plan-grid";
export const Route = createFileRoute("/_authenticated/plans/lifetime")({
  head: () => ({ meta: [{ title: "Lifetime Plans — NOVAIN SOCKS" }] }),
  component: () => (<><PageHeader title="Lifetime Plans" subtitle="Pay once. Reveal proxies forever, subject to fair-use." /><PlanGrid type="lifetime" /></>),
});
