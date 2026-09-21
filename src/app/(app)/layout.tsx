"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import LoadingState from "@/components/ui/LoadingState";
import GeminiAssistant from "@/components/ai/GeminiAssistant";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <LoadingState label="Checking your session..." />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="relative flex flex-1 flex-col">
        <Header />
        <main className="flex-1 bg-neutral-50 p-4 dark:bg-neutral-950 md:p-6">{children}</main>
        <GeminiAssistant />
      </div>
    </div>
  );
}
