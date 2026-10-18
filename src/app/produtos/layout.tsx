import RequireAdmin from "@/components/RequireAdmin";
import RequireAuth from "@/components/RequireAuth";

export default function ProdutosLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <RequireAdmin>{children}</RequireAdmin>
    </RequireAuth>
  );
}
