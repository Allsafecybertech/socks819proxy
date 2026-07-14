import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Zap, Globe2, Lock, Gauge, CheckCircle2, ArrowRight,
  Server, Cpu, Users, Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) navigate({ to: "/dashboard" });
      else setChecked(true);
    });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur bg-background/70 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center glow">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-wide">NOVAIN SOCKS</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Proxy Marketplace</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#plans" className="hover:text-foreground transition">Plans</a>
            <a href="#network" className="hover:text-foreground transition">Network</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition">Sign in</Link>
            <Link
              to="/auth"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.68_0.19_265/0.25),transparent_70%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary mb-6">
            <Sparkles className="w-3 h-3" /> Enterprise-grade SOCKS5 proxies
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl leading-[1.05]">
            Premium residential proxies,{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              delivered instantly
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            NOVAIN SOCKS gives you clean, high-uptime residential & datacenter SOCKS5 endpoints
            with per-reveal privacy controls, credit and time plans, and a live inventory sync
            engine — built for scrapers, automation teams, and QA.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
            >
              Create account <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#plans"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border hover:bg-muted/40 transition"
            >
              View pricing
            </a>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            <Stat value="99.9%" label="Uptime SLA" />
            <Stat value="120+" label="Countries" />
            <Stat value="<80ms" label="Median latency" />
            <Stat value="24/7" label="Support" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <SectionHeader
          eyebrow="Platform"
          title="Everything you need in one dashboard"
          subtitle="From discovery to delivery, NOVAIN handles the full proxy lifecycle."
        />
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Feature icon={Zap} title="Instant reveal" body="Consume time-plan quota or credits on demand. Every reveal is logged and exportable." />
          <Feature icon={Lock} title="Private by default" body="Credentials shown only to you. 24-hour viewed vault keeps history without leaking to peers." />
          <Feature icon={Globe2} title="Global coverage" body="Filter by country, city, ISP, and speed. Fresh inventory synced continuously." />
          <Feature icon={Gauge} title="Fair-use policing" body="Per-plan reveal caps, unlimited tiers, and burst protection built into the engine." />
          <Feature icon={Server} title="Live inventory sync" body="Upstream provider stock streams into your catalog via signed webhook — no manual imports." />
          <Feature icon={Cpu} title="Admin control plane" body="KPIs, payment verification with screenshots + on-chain hints, plan toggles, and audit logs." />
        </div>
      </section>

      {/* Plans preview */}
      <section id="plans" className="max-w-7xl mx-auto px-6 py-24">
        <SectionHeader
          eyebrow="Plans"
          title="Pick what fits your workload"
          subtitle="Mix and match time plans, credits, and lifetime access."
        />
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <PlanCard name="Daily" tag="Time-based" price="From $9" points={["Unlimited within cap","Fair-use protected","Reset every 24h"]} />
          <PlanCard name="Credits" tag="Pay-as-you-go" featured price="From $19" points={["1 credit = 1 reveal","Never expires","Best value at scale"]} />
          <PlanCard name="Lifetime" tag="One-time" price="From $199" points={["Perpetual access","Priority queue","Reseller rates"]} />
        </div>
        <div className="mt-8 text-center">
          <Link to="/auth" className="inline-flex items-center gap-2 text-primary hover:underline">
            See full pricing in the app <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Network */}
      <section id="network" className="max-w-7xl mx-auto px-6 py-24 border-t border-border/40">
        <SectionHeader eyebrow="Network" title="Built on trust, verified on-chain" subtitle="Crypto payments with block-explorer hints. Manual review by admins for every order." />
        <div className="mt-12 grid md:grid-cols-4 gap-4">
          {["BTC","ETH","USDT (TRC20)","USDC"].map((c) => (
            <div key={c} className="rounded-2xl border border-border/60 bg-card p-6 text-center">
              <div className="text-2xl font-bold">{c}</div>
              <div className="text-xs text-muted-foreground mt-1">Accepted</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-24">
        <SectionHeader eyebrow="FAQ" title="Common questions" />
        <div className="mt-10 space-y-4">
          <FAQ q="How fast do I get access after paying?" a="Admin verification typically completes within minutes. You'll receive a notification and your plan activates automatically." />
          <FAQ q="Do proxies rotate?" a="Each reveal returns a fresh IP from available inventory. Your viewed vault keeps the last 24 hours for reuse." />
          <FAQ q="Can I export my proxies?" a="Yes. From the viewed page you can copy or download proxies as CSV or ip:port:user:pass." />
          <FAQ q="Is there an API?" a="Coming soon. The inventory-sync hook is already available for enterprise integrations." />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="rounded-3xl gradient-primary p-12 text-center relative overflow-hidden">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">Ready to plug in?</h2>
          <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto">Create an account and start revealing proxies in under 60 seconds.</p>
          <Link
            to="/auth"
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-background text-foreground font-semibold hover:opacity-90 transition"
          >
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/40">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} NOVAIN SOCKS. All rights reserved.</div>
          <div className="flex gap-6">
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#plans" className="hover:text-foreground">Plans</a>
          </div>
        </div>
      </footer>

      {!checked && <div className="hidden">loading</div>}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-2xl">
      <div className="text-xs uppercase tracking-widest text-primary font-semibold">{eyebrow}</div>
      <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function Feature({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 hover:border-primary/40 transition">
      <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center mb-4">
        <Icon className="w-5 h-5" />
      </div>
      <div className="font-semibold">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function PlanCard({ name, tag, price, points, featured }: { name: string; tag: string; price: string; points: string[]; featured?: boolean }) {
  return (
    <div className={`rounded-2xl border p-6 ${featured ? "border-primary bg-primary/5 shadow-[0_0_40px_oklch(0.68_0.19_265/0.25)]" : "border-border/60 bg-card"}`}>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{tag}</div>
      <div className="mt-1 text-2xl font-bold">{name}</div>
      <div className="mt-3 text-3xl font-bold">{price}</div>
      <ul className="mt-6 space-y-2 text-sm">
        {points.map((p) => (
          <li key={p} className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" /> {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="rounded-xl border border-border/60 bg-card p-5 group">
      <summary className="cursor-pointer font-semibold flex items-center justify-between">
        {q}
        <span className="text-primary group-open:rotate-45 transition">+</span>
      </summary>
      <p className="mt-3 text-sm text-muted-foreground">{a}</p>
    </details>
  );
}
