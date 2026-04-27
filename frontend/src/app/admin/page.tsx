"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  Clock,
  Users,
} from "lucide-react";

interface DashboardStats {
  today_revenue: number;
  today_transactions: number;
  top_menu_item: string;
  top_menu_count: number;
  low_stock_count: number;
  pending_orders: number;
  active_tables: number;
}

interface RecentOrder {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
  table: { number: string } | null;
  payment: { method: string } | null;
  user: { name: string } | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8181/api";

export default function AdminDashboard() {
  const { initialize } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem("token_admin");
      if (!token) {
        window.location.href = "/login";
        return;
      }
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      try {
        const [statsRes, recentRes] = await Promise.all([
          fetch(`${API_BASE}/dashboard/stats`, { headers }),
          fetch(`${API_BASE}/dashboard/recent`, { headers }),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (recentRes.ok) setRecentOrders(await recentRes.json());
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendapatan Hari Ini
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign size={18} className="text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {isLoading ? (
                <span className="animate-pulse text-muted-foreground">...</span>
              ) : (
                formatPrice(stats?.today_revenue || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total dari transaksi lunas
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transaksi
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center">
              <ShoppingBag size={18} className="text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {isLoading ? (
                <span className="animate-pulse text-muted-foreground">...</span>
              ) : (
                stats?.today_transactions || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pesanan selesai hari ini
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Menu Terlaris
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
              <TrendingUp size={18} className="text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <span className="animate-pulse text-muted-foreground">...</span>
              ) : (
                stats?.top_menu_item || "-"
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.top_menu_count
                ? `${stats.top_menu_count} porsi terjual`
                : "Belum ada data"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pesanan Aktif
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle size={18} className="text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive font-mono">
              {isLoading ? (
                <span className="animate-pulse text-muted-foreground">...</span>
              ) : (
                stats?.pending_orders || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.active_tables || 0} meja terisi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending orders summary */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center gap-2">
            <Clock size={18} className="text-muted-foreground" />
            <CardTitle className="text-base">Status Pesanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
              <span className="text-sm font-medium">Menunggu</span>
              <span className="font-bold font-mono text-yellow-700">
                {stats?.pending_orders || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
              <span className="text-sm font-medium">Selesai Hari Ini</span>
              <span className="font-bold font-mono text-green-700">
                {stats?.today_transactions || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
              <span className="text-sm font-medium">Meja Terisi</span>
              <span className="font-bold font-mono text-blue-700">
                {stats?.active_tables || 0} / 10
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2">
            <Users size={18} className="text-muted-foreground" />
            <CardTitle className="text-base">Transaksi Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground animate-pulse">
                Memuat data...
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                Belum ada transaksi hari ini
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">ID</th>
                      <th className="pb-2 font-medium">Meja</th>
                      <th className="pb-2 font-medium">Kasir</th>
                      <th className="pb-2 font-medium">Metode</th>
                      <th className="pb-2 font-medium">Waktu</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b last:border-0 hover:bg-muted/30"
                      >
                        <td className="py-2 font-mono text-xs">
                          #{String(order.id).padStart(3, "0")}
                        </td>
                        <td className="py-2">{order.table?.number || "-"}</td>
                        <td className="py-2 text-xs">
                          {order.user?.name || "-"}
                        </td>
                        <td className="py-2 capitalize text-xs">
                          {order.payment?.method || "-"}
                        </td>
                        <td className="py-2 text-xs">
                          {formatTime(order.created_at)}
                        </td>
                        <td className="py-2 font-mono font-medium text-right">
                          {formatPrice(order.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
