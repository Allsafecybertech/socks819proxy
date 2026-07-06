import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/proxies")({
  head: () => ({ meta: [{ title: "My Proxy List — NOVAIN SOCKS" }] }),
  component: () => (
    <div className="glass-card rounded-2xl p-12 text-center">
      <div className="font-semibold text-lg">My Proxy List</div>
      <p className="text-sm text-muted-foreground mt-2">Your revealed proxies live in the 24-hour vault.</p>
      <Link to="/viewed" className="inline-block mt-4 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">Open Viewed (24h)</Link>
    </div>
  ),
});
