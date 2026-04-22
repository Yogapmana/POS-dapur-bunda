"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getTables,
  createTable,
  deleteTable,
  updateTableStatus,
} from "@/lib/api";
import type { Table } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, QrCode, Download, Link as LinkIcon, RefreshCcw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function TablesManagementPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");

  // QR Code dialog state
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  
  const qrRef = useRef<HTMLDivElement>(null);

  const fetchTableData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getTables();
      setTables(data);
    } catch (err) {
      console.error("Failed to fetch tables:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTableData();
  }, [fetchTableData]);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber) return;
    
    try {
      // Generate a random token for the QR code
      const token = `meja-${newTableNumber}-token-${Math.floor(1000 + Math.random() * 9000)}`;
      
      await createTable({
        number: newTableNumber,
        qr_code_token: token,
        status: "available",
      });
      
      setNewTableNumber("");
      setIsCreateOpen(false);
      fetchTableData();
    } catch (err) {
      console.error("Failed to create table:", err);
      alert("Gagal menambahkan meja. Nomor meja mungkin sudah ada.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Yakin ingin menghapus meja ini?")) return;
    try {
      await deleteTable(id);
      fetchTableData();
    } catch (err) {
      console.error("Failed to delete table:", err);
      alert("Gagal menghapus meja. Pastikan tidak ada pesanan aktif.");
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "available" ? "occupied" : "available";
      await updateTableStatus(id, newStatus);
      fetchTableData();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const openQrDialog = (table: Table) => {
    setSelectedTable(table);
    setQrDialogOpen(true);
  };

  const downloadQR = () => {
    if (!qrRef.current || !selectedTable) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      // Add padding and text to the downloaded image
      canvas.width = img.width + 80;
      canvas.height = img.height + 120;
      
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR
        ctx.drawImage(img, 40, 40);
        
        // Draw Text
        ctx.fillStyle = "black";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`Meja ${selectedTable.number}`, canvas.width / 2, canvas.height - 30);
      }
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_Meja_${selectedTable.number}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const getOrderUrl = (token: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/order/${token}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Kelola Meja</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manajemen meja restoran dan QR code Self-Order
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-secondary hover:bg-secondary/90 text-secondary-foreground cursor-pointer"
        >
          <Plus size={18} className="mr-2" />
          Tambah Meja
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Meja Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTable} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nomor/Nama Meja</label>
              <Input
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                placeholder="Contoh: 1, 2, VIP-1"
                required
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 cursor-pointer"
            >
              Simpan Meja
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">QR Code Self-Order</DialogTitle>
          </DialogHeader>
          {selectedTable && (
            <div className="flex flex-col items-center justify-center space-y-6 pt-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold font-heading text-primary">
                  Meja {selectedTable.number}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Scan untuk memesan mandiri
                </p>
              </div>
              
              <div ref={qrRef} className="bg-white p-4 rounded-xl shadow-sm border">
                <QRCodeSVG
                  value={getOrderUrl(selectedTable.qr_code_token)}
                  size={200}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: "/favicon.ico",
                    x: undefined,
                    y: undefined,
                    height: 24,
                    width: 24,
                    excavate: true,
                  }}
                />
              </div>

              <div className="w-full space-y-3">
                <Button 
                  onClick={downloadQR} 
                  className="w-full cursor-pointer bg-primary"
                >
                  <Download size={16} className="mr-2" />
                  Download QR (PNG)
                </Button>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-2 rounded-md overflow-hidden">
                  <LinkIcon size={14} className="shrink-0" />
                  <span className="truncate">{getOrderUrl(selectedTable.qr_code_token)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tables Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="h-32 animate-pulse bg-muted/50 border-0" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>Belum ada meja.</p>
            <p className="text-sm">Klik &quot;Tambah Meja&quot; untuk memulai.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => (
            <Card 
              key={table.id} 
              className={`overflow-hidden transition-all duration-200 hover:shadow-md ${
                table.status === "occupied" ? "border-primary/50 bg-primary/5" : ""
              }`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <Badge 
                    variant="outline" 
                    className={
                      table.status === "available" 
                        ? "bg-success/10 text-success border-success/20" 
                        : "bg-primary/10 text-primary border-primary/20"
                    }
                  >
                    {table.status === "available" ? "Kosong" : "Terisi"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer -mr-2 -mt-2"
                    onClick={() => handleDelete(table.id)}
                    title="Hapus meja"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <CardTitle className="text-2xl font-bold text-center mt-2">
                  {table.number}
                </CardTitle>
              </CardHeader>
              <CardFooter className="p-0 border-t bg-muted/20">
                <div className="grid grid-cols-2 w-full divide-x">
                  <button
                    onClick={() => handleToggleStatus(table.id, table.status)}
                    className="flex flex-col items-center justify-center p-2 hover:bg-muted/50 transition-colors cursor-pointer text-xs font-medium text-muted-foreground"
                    title="Ubah Status"
                  >
                    <RefreshCcw size={16} className="mb-1" />
                    Toggle
                  </button>
                  <button
                    onClick={() => openQrDialog(table)}
                    className="flex flex-col items-center justify-center p-2 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer text-xs font-medium text-muted-foreground"
                    title="Lihat QR Code"
                  >
                    <QrCode size={16} className="mb-1" />
                    QR Code
                  </button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
