import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import PwaRegister from "@/components/PwaRegister";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Personal Life Dashboard",
  description: "Track nutrition, finance, workouts, time, and daily life in one place.",
  applicationName: "Personal Life Dashboard",
  appleWebApp: {
    capable: true,
    title: "Personal Life Dashboard",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <PwaRegister />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
