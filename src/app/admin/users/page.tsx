import { supabaseAdmin } from "@/lib/auth-server";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";

export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-server";

export default async function AdminUsersPage() {
  // Obter quem é o admin atual
  const token = cookies().get("mozbet_session")?.value;
  let currentUserRole = "admin";
  if (token) {
    const payload = await verifyToken<{ id: string; role: string }>(token);
    if (payload?.id) {
       const { data: adminUser } = await supabaseAdmin.from("users").select("role").eq("id", payload.id).single();
       if (adminUser?.role) currentUserRole = adminUser.role;
    }
  }

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
  
  const mappedUsers = (users || []).map((u) => {
    const authUser = authData?.users.find((au) => au.id === u.id);
    return {
      ...u,
      role: u.role || (u.is_admin ? 'super_admin' : 'user'), // fallback seguro
      email: u.email || authUser?.email || null,
    };
  });

  return (
    <AdminUsersTable initialUsers={mappedUsers} currentUserRole={currentUserRole} />
  );
}
