"use client";

import { useState, useEffect, use } from "react";
import { getOrderById } from "@/lib/api";
import type { Order } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function StrukPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const resolvedParams = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await getOrderById(Number(resolvedParams.orderId));
        setOrder(data);
      } catch (err) {
        console.error("Failed to fetch order:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrder();
  }, [resolvedParams.orderId]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground animate-pulse">Memuat struk...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-destructive">Pesanan tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      {/* Action Bar (not printed) */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link href="/kasir">
          <Button variant="ghost" size="sm" className="cursor-pointer">
            <ArrowLeft size={16} className="mr-2" />
            Kembali
          </Button>
        </Link>
        <Button
          onClick={() => window.print()}
          className="bg-primary hover:bg-primary/90 cursor-pointer"
        >
          <Printer size={16} className="mr-2" />
          Cetak Struk
        </Button>
      </div>

      {/* Receipt */}
      <div className="bg-white border border-border rounded-lg p-8 shadow-sm print:shadow-none print:border-0">
        {/* Header */}
        <div className="text-center border-b border-dashed border-border pb-4 mb-4">
          <h1 className="text-2xl font-display text-primary">Dapur Bunda</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Jl. Contoh No. 123, Kota
          </p>
          <p className="text-xs text-muted-foreground">
            Telp: (021) 123-4567
          </p>
        </div>

        {/* Transaction Info */}
        <div className="text-xs space-y-1 mb-4 pb-4 border-b border-dashed border-border">
          <div className="flex justify-between">
            <span className="text-muted-foreground">No. Transaksi</span>
            <span className="font-mono font-bold">
              INV-{String(order.id).padStart(5, "0")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tanggal</span>
            <span>{formatDate(order.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Meja</span>
            <span>{order.table?.number || "-"}</span>
          </div>
          {order.user && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kasir</span>
              <span>{order.user.name}</span>
            </div>
          )}
          {order.payment && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Metode Bayar</span>
              <span className="capitalize">{order.payment.method}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="space-y-2 mb-4 pb-4 border-b border-dashed border-border">
          {order.order_items?.map((item) => (
            <div key={item.id}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{item.menu_item?.name}</span>
                <span className="font-mono">{formatPrice(item.subtotal)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {item.quantity} × {formatPrice(item.unit_price)}
                {item.notes && (
                  <span className="italic ml-2">({item.notes})</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-1 mb-4 pb-4 border-b border-dashed border-border">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span className="font-mono">
              {formatPrice(order.total_amount)}
            </span>
          </div>
          <div className="flex justify-between text-sm font-bold text-lg">
            <span>Total</span>
            <span className="font-mono text-primary">
              {formatPrice(order.total_amount)}
            </span>
          </div>
          {order.payment && (
            <>
              <div className="flex justify-between text-sm">
                <span>Bayar</span>
                <span className="font-mono">
                  {formatPrice(order.payment.amount)}
                </span>
              </div>
              {order.payment.change_amount > 0 && (
                <div className="flex justify-between text-sm font-bold text-success">
                  <span>Kembalian</span>
                  <span className="font-mono">
                    {formatPrice(order.payment.change_amount)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p className="font-medium">Terima kasih atas kunjungan Anda!</p>
          <p className="mt-1">Dapur Bunda — Masakan Rumah Penuh Cinta ❤️</p>
        </div>
      </div>
    </div>
  );
}
