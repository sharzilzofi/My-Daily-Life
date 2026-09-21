"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/firebase/auth";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/nutrition", label: "Nutrition" },
  { href: "/finance", label: "Finance" },
  { href: "/workout", label: "Workout" },
  { href: "/time", label: "Time Tracking" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export default function Header() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950 md:justify-end">
      <button
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 md:hidden"
        onClick={() => setMobileOpen((v) => !v)}
      >
        Menu
      </button>

      <div className="flex items-center gap-4">
        {user?.email && (
          <span className="hidden text-sm text-neutral-500 dark:text-neutral-400 sm:inline">
            {user.email}
          </span>
        )}
        <button
          onClick={handleSignOut}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Sign out
        </button>
      </div>

      {mobileOpen && (
        <nav className="absolute left-0 top-[57px] z-10 flex w-full flex-col border-b border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-950 md:hidden">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
