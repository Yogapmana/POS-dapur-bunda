"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import {
  getOrders,
  updateOrderStatus,
  processPayment,
} from "@/lib/api";
import type { Order } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  CheckCircle,
  CreditCard,
  Receipt,
  RefreshCw,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { KasirOrderModal } from "./KasirOrderModal";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  unpaid: {
    label: "Belum Lunas",
    color: "bg-red-100 text-red-800 border-red-200",
  },
  pending: {
    label: "Menunggu",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  processing: {
    label: "Diproses",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  done: {
    label: "Siap",
    color: "bg-success/10 text-success border-success/20",
  },
  completed: {
    label: "Selesai",
    color: "bg-gray-200 text-gray-800 border-gray-300",
  },
  paid: {
    label: "Lunas",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  cancelled: {
    label: "Batal",
    color: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

function OrderListItem({ order, selectedOrder, setSelectedOrder, setChangeAmount, isFaded = false }: any) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);

  return (
    <button
      onClick={() => {
        setSelectedOrder(order);
        setChangeAmount(null);
      }}
      className={`w-full p-4 text-left hover:bg-muted/50 transition-colors cursor-pointer ${
        selectedOrder?.id === order.id ? "bg-muted opacity-100" : ""
      } ${isFaded && selectedOrder?.id !== order.id ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-sm">Order #{order.id}</span>
        <Badge className={STATUS_MAP[order.status]?.color || ""}>
          {STATUS_MAP[order.status]?.label || order.status}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Meja {order.table?.number || "-"} • {order.order_items?.length || 0} item
        </span>
        <span className="font-mono font-medium text-foreground">
          {formatPrice(order.total_amount)}
        </span>
      </div>
    </button>
  );
}

export default function KasirPage() {
  const { initialize } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("tunai");
  const [isLoading, setIsLoading] = useState(true);
  const [changeAmount, setChangeAmount] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  useEffect(() => {
    initialize();
    // Check auth
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    setIsReady(true);
  }, [initialize]);

  const fetchOrders = useCallback(async () => {
    if (!isReady) return;
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    fetchOrders();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders, isReady]);

  const handleStatusChange = async (orderId: number, status: string) => {
    try {
      await updateOrderStatus(orderId, status);
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handlePayment = async () => {
    if (!selectedOrder) return;
    try {
      const result = await processPayment({
        order_id: selectedOrder.id,
        method: paymentMethod,
        amount: Number(paymentAmount),
      });
      setChangeAmount(result.change_amount);
      fetchOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Payment failed");
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);

  const unpaidOrders = orders.filter((o) => o.status === "unpaid");
  const kitchenOrders = orders.filter((o) =>
    ["pending", "processing"].includes(o.status)
  );
  const readyOrders = orders.filter((o) => o.status === "done");
  const completedOrders = orders.filter((o) => ["completed", "paid"].includes(o.status));

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left Panel: Order List */}
      <div className="w-96 border-r border-border bg-card overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold">Pesanan Hari Ini</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsOrderModalOpen(true)}
              className="cursor-pointer h-8 px-2"
              title="Buat Pesanan Baru"
            >
              <Plus size={16} className="mr-1" />
              Baru
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchOrders}
              className="cursor-pointer h-8 w-8 p-0"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Memuat...
          </div>
        ) : (
          <div className="divide-y divide-border">
            {unpaidOrders.length === 0 && kitchenOrders.length === 0 && readyOrders.length === 0 && completedOrders.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Belum ada pesanan hari ini
              </div>
            ) : (
              <>
                {unpaidOrders.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-red-500/10 text-xs font-medium text-red-600">
                      Belum Lunas ({unpaidOrders.length})
                    </div>
                    {unpaidOrders.map((order) => (
                      <OrderListItem key={order.id} order={order} selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder} setChangeAmount={setChangeAmount} />
                    ))}
                  </>
                )}

                {kitchenOrders.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-blue-500/10 text-xs font-medium text-blue-600">
                      Dapur / Diproses ({kitchenOrders.length})
                    </div>
                    {kitchenOrders.map((order) => (
                      <OrderListItem key={order.id} order={order} selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder} setChangeAmount={setChangeAmount} />
                    ))}
                  </>
                )}

                {readyOrders.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-success/10 text-xs font-medium text-success">
                      Siap ({readyOrders.length})
                    </div>
                    {readyOrders.map((order) => (
                      <OrderListItem key={order.id} order={order} selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder} setChangeAmount={setChangeAmount} />
                    ))}
                  </>
                )}

                {completedOrders.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground">
                      Selesai ({completedOrders.length})
                    </div>
                    {completedOrders.slice(0, 10).map((order) => (
                      <OrderListItem key={order.id} order={order} selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder} setChangeAmount={setChangeAmount} isFaded />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Panel: Order Detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedOrder ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Clock size={48} className="mb-4 opacity-30" />
            <p>Pilih pesanan untuk melihat detail</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Order Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  Order #{selectedOrder.id}
                </h2>
                <p className="text-muted-foreground text-sm">
                  Meja {selectedOrder.table?.number || "-"}{" "}
                  {selectedOrder.customer_name &&
                    `• ${selectedOrder.customer_name}`}
                </p>
              </div>
              <Badge
                className={`text-sm px-3 py-1 ${
                  STATUS_MAP[selectedOrder.status]?.color || ""
                }`}
              >
                {STATUS_MAP[selectedOrder.status]?.label ||
                  selectedOrder.status}
              </Badge>
            </div>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Item Pesanan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {selectedOrder.order_items?.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {item.menu_item?.name}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground italic">
                            Catatan: {item.notes}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(item.unit_price)} × {item.quantity}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-sm">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border mt-2 pt-3 flex items-center justify-between">
                  <span className="font-bold">Total</span>
                  <span className="text-xl font-bold font-mono text-primary">
                    {formatPrice(selectedOrder.total_amount)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {selectedOrder.status !== "cancelled" && (
              <div className="flex gap-3 mt-4">
                {selectedOrder.status === "unpaid" && !selectedOrder.payment && (
                  <Button
                    onClick={() => {
                      setPaymentAmount(String(selectedOrder.total_amount));
                      setIsPaymentOpen(true);
                      setChangeAmount(null);
                    }}
                    className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground cursor-pointer"
                  >
                    <CreditCard size={16} className="mr-2" />
                    Proses Pembayaran
                  </Button>
                )}
                {selectedOrder.status === "pending" && (
                  <Button
                    onClick={() => handleStatusChange(selectedOrder.id, "processing")}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Proses Pesanan (Manual)
                  </Button>
                )}
                {selectedOrder.status === "processing" && (
                  <Button
                    onClick={() => handleStatusChange(selectedOrder.id, "done")}
                    className="flex-1 bg-success hover:bg-success/90 text-white cursor-pointer"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Tandai Siap (Manual)
                  </Button>
                )}
                {selectedOrder.status === "done" && (
                  <Button
                    onClick={() => handleStatusChange(selectedOrder.id, "completed")}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white cursor-pointer"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Pesanan Diberikan
                  </Button>
                )}
              </div>
            )}

            {/* If paid, show receipt link */}
            {selectedOrder.payment && (
              <Link href={`/kasir/struk/${selectedOrder.id}`}>
                <Button
                  variant="outline"
                  className="w-full mt-4 cursor-pointer border-secondary text-secondary hover:bg-secondary/10"
                >
                  <Receipt size={16} className="mr-2" />
                  Lihat Struk / Resi
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proses Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Total Tagihan</p>
              <p className="text-3xl font-bold font-mono text-primary">
                {selectedOrder && formatPrice(selectedOrder.total_amount)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-2">
                {["tunai", "qris", "transfer", "ewallet"].map((method) => (
                  <Button
                    key={method}
                    variant={paymentMethod === method ? "default" : "outline"}
                    onClick={() => setPaymentMethod(method)}
                    className="cursor-pointer capitalize"
                  >
                    {method === "tunai"
                      ? "💵 Tunai"
                      : method === "qris"
                      ? "📱 QRIS"
                      : method === "transfer"
                      ? "🏦 Transfer"
                      : "💳 E-Wallet"}
                  </Button>
                ))}
              </div>
            </div>

            {paymentMethod === "tunai" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Jumlah Bayar (Rp)
                </label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="text-xl font-mono h-14 text-center"
                />
                <div className="flex gap-2">
                  {[50000, 100000, 200000].map((val) => (
                    <Button
                      key={val}
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentAmount(String(val))}
                      className="flex-1 cursor-pointer"
                    >
                      {formatPrice(val)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {changeAmount !== null && changeAmount > 0 && (
              <div className="p-4 bg-success/10 rounded-lg text-center border border-success/20">
                <p className="text-sm text-success">Kembalian</p>
                <p className="text-2xl font-bold font-mono text-success">
                  {formatPrice(changeAmount)}
                </p>
              </div>
            )}

            {changeAmount !== null ? (
              <div className="flex gap-3">
                <Link
                  href={`/kasir/struk/${selectedOrder?.id}`}
                  className="flex-1"
                >
                  <Button className="w-full bg-primary hover:bg-primary/90 cursor-pointer">
                    <Receipt size={16} className="mr-2" />
                    Lihat Struk
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPaymentOpen(false);
                    setChangeAmount(null);
                    fetchOrders();
                  }}
                  className="cursor-pointer"
                >
                  Tutup
                </Button>
              </div>
            ) : (
              <Button
                onClick={handlePayment}
                className="w-full h-12 bg-secondary hover:bg-secondary/90 text-secondary-foreground cursor-pointer"
                disabled={
                  paymentMethod === "tunai" &&
                  Number(paymentAmount) <
                    (selectedOrder?.total_amount || 0)
                }
              >
                Konfirmasi Pembayaran
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Order Modal */}
      <KasirOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onOrderCreated={() => {
          fetchOrders();
          // Optionally we could try to select the new order, but fetchOrders is async
        }}
      />
    </div>
  );
}
