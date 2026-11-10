"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Activity,
  CreditCard,
  Trophy,
  LogOut,
  FileText,
  Users,
  Shield,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Wordmark, ThemeToggle } from "@/components/Brand";

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [role, setRole] = useState("customer");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (session?.backend_jwt) {
      try {
        const payload = JSON.parse(atob((session.backend_jwt as string).split(".")[1]));
        setRole(payload.role || "customer");
      } catch (e) {
        console.error("Failed to decode JWT", e);
      }
    }
  }, [session]);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const allNavItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["customer", "both", "admin"], group: "Jobs" },
    { name: "Submit job", href: "/submit", icon: Upload, roles: ["customer", "both", "admin"], group: "Jobs" },
    { name: "Monitor", href: "/monitor", icon: Activity, roles: ["customer", "both", "admin"], group: "Jobs" },
    { name: "Results", href: "/results", icon: FileText, roles: ["customer", "both", "admin"], group: "Jobs" },
    { name: "Billing", href: "/billing", icon: CreditCard, roles: ["customer", "contributor", "both", "admin"], group: "Account" },
    { name: "Contributor", href: "/contributor", icon: Users, roles: ["contributor", "both", "admin"], group: "Network" },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy, roles: ["contributor", "both", "admin"], group: "Network" },
    { name: "Admin", href: "/admin", icon: Shield, roles: ["admin"], group: "Network" },
  ];

  const navItems = allNavItems.filter((item) => item.roles.includes(role));
  const groups = ["Jobs", "Account", "Network"].filter((g) => navItems.some((i) => i.group === g));

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
      {groups.map((group) => (
        <div key={group} className="mb-5">
          <div className="label px-3 pb-2">{group}</div>
          <ul className="space-y-px">
            {navItems
              .filter((i) => i.group === group)
              .map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`group relative flex h-9 items-center gap-3 rounded-[var(--radius)] px-3 text-sm transition-colors ${
                        isActive
                          ? "bg-raised font-medium text-ink"
                          : "text-ink-2 hover:bg-raised hover:text-ink"
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-2 bottom-2 w-[2px] ${isActive ? "bg-primary" : "bg-transparent"}`}
                        aria-hidden="true"
                      />
                      <item.icon size={16} strokeWidth={1.75} className={isActive ? "text-ink" : "text-mute group-hover:text-ink"} />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = session?.user && (
    <div className="border-t border-rule p-3">
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-ink font-mono text-xs text-canvas">
          {(session.user.name?.[0] || session.user.email?.[0] || "?").toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{session.user.name || "User"}</p>
          <p className="truncate font-mono text-[11px] text-mute">{role}</p>
        </div>
        <ThemeToggle />
      </div>
      <button
        onClick={() => signOut()}
        className="btn btn-ghost btn-sm mt-1 w-full justify-start text-mute"
      >
        <LogOut size={14} />
        Sign out
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rule bg-canvas/95 px-4 backdrop-blur-sm lg:hidden">
        <Wordmark href="/dashboard" />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="btn btn-ghost btn-sm -mr-2"
          aria-expanded={open}
          aria-controls="app-nav"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-ink/30"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside
            id="app-nav"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-rule bg-surface"
          >
            <div className="flex h-14 items-center border-b border-rule px-5">
              <Wordmark href="/dashboard" />
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-rule bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-rule px-5">
          <Wordmark href="/dashboard" />
        </div>
        {nav}
        {footer}
      </aside>
    </>
  );
}
