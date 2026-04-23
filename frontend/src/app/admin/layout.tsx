"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Package,
  BarChart2,
  QrCode,
  Settings,
  LogOut,
  Users,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/menu", label: "Menu & Kategori", icon: UtensilsCrossed },
  { href: "/admin/inventory", label: "Stok & Inventori", icon: Package },
  { href: "/admin/reports", label: "Laporan", icon: BarChart2 },
  { href: "/admin/tables", label: "Kelola Meja", icon: QrCode },
  { href: "/admin/users", label: "Manajemen Akun", icon: Users },
  { href: "/admin/settings", label: "Pengaturan", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    
    if (!token || !userStr) {
      router.push("/login");
      return;
    }
    
    const u = JSON.parse(userStr);
    if (u.role !== "admin") {
      router.push("/kasir");
    }
  }, [initialize, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Derive page title from current path
  const currentNav = navItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/admin" && pathname.startsWith(item.href))
  );
  const pageTitle = currentNav?.label || "Dashboard";

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-primary-foreground hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold font-heading text-secondary">
            Dapur Bunda
          </h1>
          <p className="text-sm opacity-80 mt-1">Admin Panel</p>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary-foreground/15 text-white shadow-sm"
                    : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-white"
                }`}
              >
                <Icon
                  size={20}
                  className={isActive ? "text-secondary" : ""}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-primary-foreground/80 font-medium transition-colors hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
          >
            <LogOut size={20} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-8">
          <h2 className="text-xl font-bold font-heading">{pageTitle}</h2>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-sm">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <span className="font-medium text-sm">
              {user?.name || "Admin"}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8">{children}</div>
      </main>
    </div>
  );
}
