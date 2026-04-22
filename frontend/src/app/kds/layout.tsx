export default function KDSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 flex flex-col">
      {children}
    </div>
  );
}
