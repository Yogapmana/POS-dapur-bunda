"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  addInventoryTransaction,
  getInventoryTransactions,
  InventoryItem,
  InventoryTransaction,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [transactionType, setTransactionType] = useState<"in" | "out">("in");
  const [history, setHistory] = useState<InventoryTransaction[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Form states
  const [itemName, setItemName] = useState("");
  const [itemUnit, setItemUnit] = useState("");
  const [itemMinStock, setItemMinStock] = useState(0);
  const [transQuantity, setTransQuantity] = useState(0);
  const [transNotes, setTransNotes] = useState("");

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getInventory();
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleSaveItem = async () => {
    try {
      if (selectedItem) {
        await updateInventoryItem(selectedItem.id, {
          name: itemName,
          unit: itemUnit,
          min_stock: itemMinStock,
        });
      } else {
        await createInventoryItem({
          name: itemName,
          unit: itemUnit,
          min_stock: itemMinStock,
        });
      }
      setIsItemModalOpen(false);
      fetchInventory();
    } catch (err) {
      alert("Gagal menyimpan item");
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus item ini?")) return;
    try {
      await deleteInventoryItem(id);
      fetchInventory();
    } catch (err) {
      alert("Gagal menghapus item");
    }
  };

  const handleTransaction = async () => {
    if (!selectedItem) return;
    try {
      await addInventoryTransaction({
        inventory_item_id: selectedItem.id,
        type: transactionType,
        quantity: transQuantity,
        notes: transNotes,
      });
      setIsTransactionModalOpen(false);
      fetchInventory();
    } catch (err) {
      alert("Gagal mencatat transaksi");
    }
  };

  const viewHistory = async (item: InventoryItem) => {
    setSelectedItem(item);
    setIsHistoryModalOpen(true);
    setIsHistoryLoading(true);
    try {
      const data = await getInventoryTransactions(item.id);
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const openItemModal = (item?: InventoryItem) => {
    if (item) {
      setSelectedItem(item);
      setItemName(item.name);
      setItemUnit(item.unit);
      setItemMinStock(item.min_stock);
    } else {
      setSelectedItem(null);
      setItemName("");
      setItemUnit("");
      setItemMinStock(0);
    }
    setIsItemModalOpen(true);
  };

  const openTransactionModal = (item: InventoryItem, type: "in" | "out") => {
    setSelectedItem(item);
    setTransactionType(type);
    setTransQuantity(0);
    setTransNotes("");
    setIsTransactionModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-heading">Stok & Inventori</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola persediaan bahan baku restoran
          </p>
        </div>
        <Button onClick={() => openItemModal()} className="cursor-pointer">
          <Plus size={18} className="mr-2" />
          Tambah Item
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center items-center gap-2 text-muted-foreground">
              <Loader2 className="animate-spin" size={20} />
              Memuat data...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Bahan</TableHead>
                  <TableHead>Stok Saat Ini</TableHead>
                  <TableHead>Stok Min.</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!items || items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Belum ada data inventori.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="font-mono text-lg">{item.current_stock}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{item.min_stock}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>
                        {item.current_stock <= item.min_stock ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle size={12} />
                            Stok Rendah
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-success border-success/30 bg-success/5">
                            Aman
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Tambah Stok"
                            className="text-success hover:bg-success/10 cursor-pointer"
                            onClick={() => openTransactionModal(item, "in")}
                          >
                            <ArrowUpCircle size={18} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Catat Penggunaan"
                            className="text-destructive hover:bg-destructive/10 cursor-pointer"
                            onClick={() => openTransactionModal(item, "out")}
                          >
                            <ArrowDownCircle size={18} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Riwayat"
                            className="hover:bg-primary/10 cursor-pointer"
                            onClick={() => viewHistory(item)}
                          >
                            <History size={18} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Edit"
                            className="hover:bg-muted cursor-pointer"
                            onClick={() => openItemModal(item)}
                          >
                            <Edit size={18} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Hapus"
                            className="text-destructive hover:bg-destructive/10 cursor-pointer"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Item Modal */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? "Edit Item Bahan" : "Tambah Item Bahan Baru"}
            </DialogTitle>
            <DialogDescription>
              Informasi dasar bahan baku untuk pelacakan stok.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Bahan</label>
              <Input
                placeholder="Misal: Beras, Ayam, Minyak Goreng"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Satuan</label>
                <Input
                  placeholder="kg, liter, pcs"
                  value={itemUnit}
                  onChange={(e) => setItemUnit(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Stok Minimum</label>
                <Input
                  type="number"
                  value={itemMinStock}
                  onChange={(e) => setItemMinStock(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveItem}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Modal */}
      <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transactionType === "in" ? "Tambah Stok" : "Catat Penggunaan"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.name} ({selectedItem?.unit})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Jumlah</label>
              <Input
                type="number"
                value={transQuantity}
                onChange={(e) => setTransQuantity(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Catatan (Opsional)</label>
              <Input
                placeholder="Misal: Pembelian mingguan, Masak Nasi Goreng"
                value={transNotes}
                onChange={(e) => setTransNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransactionModalOpen(false)}>
              Batal
            </Button>
            <Button
              className={transactionType === "in" ? "bg-success hover:bg-success/90" : "bg-destructive hover:bg-destructive/90"}
              onClick={handleTransaction}
            >
              Simpan Transaksi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Riwayat Stok: {selectedItem?.name}</DialogTitle>
            <DialogDescription>
              Log aktivitas keluar masuk barang
            </DialogDescription>
          </DialogHeader>
          <div className="h-[400px] overflow-y-auto pr-2 mt-4">
            {isHistoryLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-muted-foreground" size={24} />
              </div>
            ) : !history || history.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Belum ada riwayat transaksi.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead>Oleh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">
                        {new Date(h.created_at).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell>
                        {h.type === "in" ? (
                          <span className="text-success text-xs font-bold uppercase">Masuk</span>
                        ) : (
                          <span className="text-destructive text-xs font-bold uppercase">Keluar</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">
                        {h.type === "in" ? "+" : "-"}{h.quantity}
                      </TableCell>
                      <TableCell className="text-xs italic text-muted-foreground">
                        {h.notes || "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {h.user?.name || "Admin"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsHistoryModalOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
