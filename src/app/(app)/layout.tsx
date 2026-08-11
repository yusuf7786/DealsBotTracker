import { TopBar, BottomNav } from '@/components/Nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <TopBar title="DealsBotTracker" />
      <main className="flex-1 px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
