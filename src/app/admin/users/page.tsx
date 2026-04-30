import { supabaseAdmin } from "@/lib/auth-server";
import { formatMZN } from "@/lib/utils";
import { Search, ShieldAlert, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, phone, balance, created_at, is_active, is_admin")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Utilizadores</h1>
          <p className="text-muted-foreground">Gerencie contas, saldos e bloqueios.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por telefone..." 
            className="pl-9 bg-surface border-white/10 h-10"
          />
        </div>
      </div>

      <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium">Telefone</th>
                <th className="px-6 py-4 font-medium">Saldo Real</th>
                <th className="px-6 py-4 font-medium">Data de Registo</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-mono-data font-medium text-white flex items-center gap-2">
                    {user.is_admin && <ShieldAlert className="w-4 h-4 text-primary" />}
                    +258 {user.phone}
                  </td>
                  <td className="px-6 py-4 font-mono-data font-bold text-primary">
                    {formatMZN(user.balance)}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("pt-MZ")}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user.is_active 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "bg-red-500/10 text-red-500 border border-red-500/20"
                    }`}>
                      {user.is_active ? "Ativo" : "Bloqueado"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="outline" size="sm" className="h-8 border-white/10 hover:bg-white/10">
                      Ver Detalhes
                    </Button>
                  </td>
                </tr>
              ))}
              
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum utilizador encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
