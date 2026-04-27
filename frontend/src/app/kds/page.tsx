"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getOrders, updateOrderStatus } from "@/lib/api";
import {
  ChefHat,
  Clock,
  CheckCircle,
  Wifi,
  WifiOff,
  Volume2,
} from "lucide-react";

interface OrderItem {
  id: number;
  menu_item: { name: string };
  quantity: number;
  notes: string;
}

interface KDSOrder {
  id: number;
  table: { number: string } | null;
  status: string;
  total_amount: number;
  customer_name: string;
  order_items: OrderItem[];
  created_at: string;
}

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8181/ws";
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8181/api";

function ElapsedTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const tick = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setElapsed(
        `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const start = new Date(createdAt).getTime();
  const diffMins = Math.floor((Date.now() - start) / 1000 / 60);
  const urgency =
    diffMins >= 15
      ? "text-red-400"
      : diffMins >= 10
      ? "text-yellow-400"
      : "text-zinc-400";

  return (
    <span className={`font-mono text-sm ${urgency}`}>
      <Clock size={12} className="inline mr-1" />
      {elapsed}
    </span>
  );
}

export default function KDSPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Fetch initial orders
  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem("token_kasir");
      if (!token) {
        router.push("/login");
        return;
      }
      
      const data = await getOrders();
      const active = data.filter((o: KDSOrder) =>
        ["pending", "processing"].includes(o.status)
      );
      setOrders(active);
    } catch (err) {
      console.error("Failed to fetch KDS orders:", err);
      toast.error("Gagal mengambil pesanan. Pastikan Anda sudah login.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Play notification sound
  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      // Use Web Audio API for a simple beep
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      // Second beep
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1100;
        osc2.type = "sine";
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.3);
      }, 350);
    } catch {
      // Audio not supported
    }
  }, [soundEnabled]);

  // WebSocket handler
  const handleWSMessage = useCallback(
    (message: { type: string; data: unknown }) => {
      console.log("KDS received WS message:", message);
      const order = message.data as KDSOrder;

      if (message.type === "new_order" || message.type === "order_update") {
        if (["pending", "processing"].includes(order.status)) {
          setOrders((prev) => {
            const exists = prev.find((o) => o.id === order.id);
            if (exists) {
              return prev.map((o) => (o.id === order.id ? order : o));
            }
            if (message.type === "new_order") playSound();
            return [order, ...prev];
          });
        } else {
          // If status is no longer pending/processing, remove it
          setOrders((prev) => prev.filter((o) => o.id !== order.id));
        }
      }
    },
    [playSound]
  );

  const { isConnected } = useWebSocket({
    url: WS_URL,
    onMessage: handleWSMessage,
  });

  // Update order status
  const updateStatus = async (orderId: number, newStatus: string) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      // WebSocket will handle the update, but also update locally for immediate feedback
      if (newStatus === "done") {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: newStatus } : o
          )
        );
      }
      toast.success("Status pesanan diperbarui");
    } catch (err: any) {
      console.error("Failed to update status:", err);
      toast.error(err.message || "Gagal memperbarui status");
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const processingOrders = orders.filter((o) => o.status === "processing");

  return (
    <>
      {/* Header */}
      <header className="h-14 bg-zinc-800 border-b border-zinc-700 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <ChefHat size={24} className="text-amber-400" />
          <h1 className="text-lg font-bold">Kitchen Display System</h1>
          <span className="text-xs text-zinc-500 border-l border-zinc-600 pl-3">
            Dapur Bunda
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              soundEnabled
                ? "text-amber-400 bg-amber-400/10"
                : "text-zinc-500 bg-zinc-700"
            }`}
            title={soundEnabled ? "Matikan suara" : "Nyalakan suara"}
          >
            <Volume2 size={16} />
          </button>
          <div
            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${
              isConnected
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isConnected ? "Live" : "Offline"}
          </div>
          <span className="text-xs text-zinc-500">
            {orders.length} pesanan aktif
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            <span className="animate-pulse">Memuat pesanan...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <ChefHat size={64} className="mb-4 opacity-30" />
            <p className="text-lg">Tidak ada pesanan aktif</p>
            <p className="text-sm mt-1">Pesanan baru akan muncul otomatis</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending Section */}
            {pendingOrders.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-yellow-400 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  BARU ({pendingOrders.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pendingOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onUpdateStatus={updateStatus}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Processing Section */}
            {processingOrders.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  DIPROSES ({processingOrders.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {processingOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onUpdateStatus={updateStatus}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

function OrderCard({
  order,
  onUpdateStatus,
}: {
  order: KDSOrder;
  onUpdateStatus: (id: number, status: string) => void;
}) {
  const borderColor =
    order.status === "pending"
      ? "border-yellow-500/50 bg-yellow-500/5"
      : "border-blue-500/50 bg-blue-500/5";

  return (
    <div
      className={`rounded-xl border-2 ${borderColor} overflow-hidden transition-all`}
    >
      {/* Card Header */}
      <div className="p-3 flex items-center justify-between border-b border-zinc-700/50">
        <div>
          <span className="font-bold text-lg">#{order.id}</span>
          <span className="text-zinc-400 text-sm ml-2">
            Meja {order.table?.number || "-"}
          </span>
        </div>
        <ElapsedTimer createdAt={order.created_at} />
      </div>

      {/* Items */}
      <div className="p-3 space-y-2">
        {order.order_items?.map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <Badge className="bg-zinc-700 text-zinc-200 shrink-0 text-xs font-mono">
              {item.quantity}×
            </Badge>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-tight truncate">
                {item.menu_item?.name}
              </p>
              {item.notes && (
                <p className="text-xs text-amber-300 italic mt-0.5">
                  ⚠ {item.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <div className="p-3 border-t border-zinc-700/50">
        {order.status === "pending" && (
          <Button
            onClick={() => onUpdateStatus(order.id, "processing")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            size="sm"
          >
            <ChefHat size={14} className="mr-2" />
            Mulai Masak
          </Button>
        )}
        {order.status === "processing" && (
          <Button
            onClick={() => onUpdateStatus(order.id, "done")}
            className="w-full bg-green-600 hover:bg-green-700 text-white cursor-pointer"
            size="sm"
          >
            <CheckCircle size={14} className="mr-2" />
            Selesai
          </Button>
        )}
      </div>
    </div>
  );
}
