import RequireAuth from "@/components/RequireAuth";

export default function CaixaLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
