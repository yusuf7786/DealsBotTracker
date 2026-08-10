export function EmptyState({ emoji = '🕵️', title, message }: { emoji?: string; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-14 text-center">
      <span className="text-3xl">{emoji}</span>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-xs text-muted">{message}</p>
    </div>
  );
}
