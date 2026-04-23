"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getSalesSummary,
  getTopSellingItems,
  exportSalesReport,
  ChartDataItem,
  SalesSummary,
  TopItem,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { DollarSign, ShoppingBag, TrendingUp, Download } from "lucide-react";

const formatCurrencyShared = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 border p-3 rounded-lg shadow-lg">
        <p className="font-medium text-sm mb-1">{label}</p>
        <p className="text-primary font-bold">
          {formatCurrencyShared(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function ReportsPage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch Chart Data
      let cData: ChartDataItem[] = [];
      if (period === "daily") {
        cData = await getDailyReport();
      } else if (period === "weekly") {
        cData = await getWeeklyReport();
      } else if (period === "monthly") {
        cData = await getMonthlyReport();
      }
      setChartData(cData);

      // Fetch Summary and Top Items
      const [sum, top] = await Promise.all([
        getSalesSummary(period),
        getTopSellingItems(period),
      ]);
      setSummary(sum);
      setTopItems(top);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Laporan Penjualan</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Analisis performa penjualan restoran Anda
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted p-1 rounded-lg">
            <Button
              variant={period === "daily" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod("daily")}
              className="cursor-pointer text-xs"
            >
              Hari Ini
            </Button>
            <Button
              variant={period === "weekly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod("weekly")}
              className="cursor-pointer text-xs"
            >
              Minggu Ini
            </Button>
            <Button
              variant={period === "monthly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod("monthly")}
              className="cursor-pointer text-xs"
            >
              Bulan Ini
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="cursor-pointer"
            onClick={async () => {
              try {
                await exportSalesReport(period);
              } catch (err) {
                alert("Gagal mengekspor laporan");
              }
            }}
          >
            <Download size={16} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Total Pendapatan
                </p>
                <h3 className="text-2xl font-bold text-primary">
                  {summary ? formatCurrency(summary.total_revenue) : "..."}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <DollarSign size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-secondary/20 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Total Transaksi
                </p>
                <h3 className="text-2xl font-bold text-secondary-foreground">
                  {summary ? summary.total_orders : "..."}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground">
                <ShoppingBag size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-success/10 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Rata-rata Transaksi
                </p>
                <h3 className="text-2xl font-bold text-success">
                  {summary ? formatCurrency(summary.average_order_value) : "..."}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center text-success">
                <TrendingUp size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Grafik Pendapatan</CardTitle>
            <CardDescription>
              {period === "daily"
                ? "Berdasarkan jam hari ini"
                : period === "weekly"
                ? "Berdasarkan hari minggu ini"
                : "Berdasarkan hari bulan ini"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground animate-pulse">
                Memuat grafik...
              </div>
            ) : !chartData || chartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Belum ada data transaksi di periode ini.
              </div>
            ) : (
              <div className="relative h-[350px] w-full min-w-0 min-h-0 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  {period === "daily" ? (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(val) => `Rp${val / 1000}k`}
                      />
                      <Tooltip 
                        content={<CustomTooltip />} 
                        cursor={{ fill: "hsl(var(--muted)/0.5)" }} 
                        isAnimationActive={false}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} activeBar={false} />
                    </BarChart>
                  ) : (
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(val) => `Rp${val / 1000}k`}
                      />
                      <Tooltip 
                        content={<CustomTooltip />} 
                        isAnimationActive={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Menu Terlaris</CardTitle>
            <CardDescription>Top 10 menu periode ini</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 flex justify-center text-muted-foreground animate-pulse text-sm">
                Memuat...
              </div>
            ) : !topItems || topItems.length === 0 ? (
              <div className="py-12 flex justify-center text-muted-foreground text-sm text-center">
                Belum ada penjualan.
              </div>
            ) : (
              <div className="space-y-4">
                {topItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="font-bold text-muted-foreground w-4">
                        {i + 1}.
                      </div>
                      <div className="truncate">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} terjual
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-bold shrink-0">
                      {formatCurrency(item.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
