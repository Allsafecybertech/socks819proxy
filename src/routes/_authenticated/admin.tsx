import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminGate,
});

function AdminGate() {
  const { isAdmin, loading, user } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && user && !isAdmin) {
      toast.error("Admin access required");
      nav({ to: "/dashboard" });
    }
  }, [loading, isAdmin, user]);
  if (loading || !isAdmin) return <div className="text-muted-foreground">Loading…</div>;
  return <Outlet />;
}
