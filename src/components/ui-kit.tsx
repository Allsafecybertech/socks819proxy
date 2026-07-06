import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, accent }: { label: string; value: ReactNode; sub?: string; icon?: any; accent?: boolean }) {
  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
      {accent && <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />}
      <div className="flex items-start justify-between relative">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{label}</div>
          <div className="text-2xl lg:text-3xl font-bold mt-2">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center border border-primary/30">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: any }) {
  return (
    <div className="glass-card rounded-2xl p-12 text-center">
      {Icon && <Icon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />}
      <div className="font-semibold">{title}</div>
      {subtitle && <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>}
    </div>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${className ?? ""}`}>
      {children}
    </span>
  );
}
