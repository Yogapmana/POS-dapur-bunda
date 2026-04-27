"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { LogOut } from "lucide-react";

export default function KasirLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, initialize } = useAuthStore();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    let mounted = true;

    const timer = setTimeout(() => {
      if (!mounted) return;
      
      const token = localStorage.getItem("token_kasir");
      const userStr = localStorage.getItem("user_kasir");
      
      if (!token || !userStr) {
        router.push("/login");
        return;
      }
      
      try {
        const u = JSON.parse(userStr);
        if (u.role === "admin") {
          router.push("/admin");
          return;
        }
        if (u.role !== "kasir") {
          router.push("/login");
          return;
        }
        if (mounted) setIsReady(true);
      } catch {
        router.push("/login");
      }
    }, 200);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [router]);

  if (!isReady) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 bg-primary text-primary-foreground flex items-center justify-between px-6 shadow-md">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold font-display text-secondary">
            Dapur Bunda
          </h1>
          <span className="text-xs opacity-60 border-l border-primary-foreground/20 pl-3">
            Kasir Panel
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm opacity-80">{user?.name || "Kasir"}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
