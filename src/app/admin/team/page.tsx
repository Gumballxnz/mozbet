import { supabaseAdmin } from "@/lib/auth-server";
import { AdminTeamTable } from "@/components/admin/AdminTeamTable";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  // 1. Identificar privilégios do administrador conectado
  const cookieStore = await cookies();
  const token = cookieStore.get("mozbet_session")?.value;
  let currentUserRole = "admin";
  
  if (token) {
    const payload = await verifyToken<{ id: string; role: string }>(token);
    if (payload?.id) {
       const { data: adminUser } = await supabaseAdmin
         .from("users")
         .select("role")
         .eq("id", payload.id)
         .single();
         
       if (adminUser?.role) currentUserRole = adminUser.role;
    }
  }

  // 2. Buscar membros administrativos da equipa (is_admin = true ou role de admin/super_admin)
  const { data: teamUsers } = await supabaseAdmin
    .from("users")
    .select("id, email, username, phone, created_at, is_active, is_admin, role")
    .or("is_admin.eq.true,role.eq.super_admin,role.eq.admin")
    .order("role", { ascending: true });

  const { data: authData } = await supabaseAdmin.auth.admin.listUsers();

  const mappedTeam = (teamUsers || []).map((u) => {
    const authUser = authData?.users.find((au) => au.id === u.id);
    return {
      id: u.id,
      phone: u.phone,
      email: u.email || authUser?.email || null,
      username: u.username || "Sem Utilizador",
      created_at: u.created_at,
      is_active: u.is_active,
      is_admin: u.is_admin,
      role: (u.role || (u.is_admin ? 'super_admin' : 'user')) as 'super_admin' | 'admin' | 'user',
    };
  });

  return (
    <AdminTeamTable initialTeam={mappedTeam} currentUserRole={currentUserRole} />
  );
}
