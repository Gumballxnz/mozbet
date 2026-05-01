import { supabaseAdmin } from "@/lib/auth-server";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, phone, balance, created_at, is_active, is_admin")
    .order("created_at", { ascending: false });

  return (
    <AdminUsersTable initialUsers={users || []} />
  );
}
