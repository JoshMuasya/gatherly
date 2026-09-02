// Deliberately no nav/shell here — public forms must stay fully isolated
// from the rest of the app, even if a future change adds global nav to
// the root layout.
export default function PublicFormLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-muted/30">{children}</div>;
}
