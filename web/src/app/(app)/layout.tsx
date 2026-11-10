"use client";

import { useSession } from "next-auth/react";
import { redirect, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Loading } from "@/components/kit";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Loading label="Loading session" />
      </div>
    );
  }

  if (!session) {
    // Remember where the visitor was headed so sign-in can return them there.
    redirect(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
  }

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
