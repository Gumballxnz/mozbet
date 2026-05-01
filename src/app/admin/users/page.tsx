import { supabaseAdmin } from "@/lib/auth-server";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  // Puxar os emails registados no Painel Auth principal do Supabase
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
  
  // Mapear e juntar os emails aos utilizadores da tabela pública
  const mappedUsers = (users || []).map((u) => {
    const authUser = authData?.users.find((au) => au.id === u.id);
    return {
      ...u,
      email: authUser?.email || null,
    };
  });

  return (
    <AdminUsersTable initialUsers={mappedUsers} />
  );
}
