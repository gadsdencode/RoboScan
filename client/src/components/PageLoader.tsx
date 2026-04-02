export function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <div
        className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"
        aria-hidden
      />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}
