import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ShoppingBag, CreditCard, LogIn, ChefHat } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="mb-2">
        <h1 className="text-5xl font-display text-primary">Dapur Bunda</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Sistem Point of Sales Terintegrasi
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mt-10">
        <Link href="/login" className="w-full">
          <Button className="w-full h-16 text-lg bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer gap-2">
            <LogIn size={20} />
            Login
          </Button>
        </Link>
        <Link href="/admin" className="w-full">
          <Button variant="outline" className="w-full h-16 text-lg cursor-pointer gap-2">
            <LayoutDashboard size={20} />
            Dashboard Admin
          </Button>
        </Link>
        <Link href="/kasir" className="w-full">
          <Button variant="outline" className="w-full h-16 text-lg cursor-pointer gap-2">
            <CreditCard size={20} />
            Panel Kasir
          </Button>
        </Link>
        <Link href="/kds" className="w-full">
          <Button variant="outline" className="w-full h-16 text-lg cursor-pointer gap-2">
            <ChefHat size={20} />
            Kitchen Display
          </Button>
        </Link>
        <Link href="/order/meja-1-token-1001" className="w-full sm:col-span-2">
          <Button className="w-full h-16 text-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground cursor-pointer gap-2">
            <ShoppingBag size={20} />
            Self-Order Meja 1
          </Button>
        </Link>
      </div>

      <p className="text-xs text-muted-foreground mt-8">
        Demo: admin@dapurbunda.com / admin123
      </p>
    </div>
  );
}
