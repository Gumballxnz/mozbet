import { supabaseAdmin } from "@/lib/auth-server";
import { AdminUserDetails } from "@/components/admin/AdminUserDetails";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailsPage({ params }: PageProps) {

  const cookieStore = await cookies();
  const token = cookieStore.get("mozbet_session")?.value;

  if (!token) {
    notFound();
  }

  const payload = await verifyToken<{ id: string; role: string }>(token);
  if (!payload?.id) {
    notFound();
  }

  const { data: adminUser } = await supabaseAdmin
    .from("users")
    .select("role, is_admin")
    .eq("id", payload.id)
    .single();

  if (!adminUser?.is_admin) {
    redirect("/");
  }

  const currentUserRole = adminUser.role || "admin";
  const { id } = await params;

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (!user) {
    notFound();
  }

  const { data: authData } = await supabaseAdmin.auth.admin.getUserById(id).catch(() => ({ data: null }));

  const mappedUser = {
    ...user,
    role: user.role || (user.is_admin ? 'super_admin' : 'user'),
    email: user.email || authData?.user?.email || null,
  };

  return (
    <AdminUserDetails user={mappedUser} currentUserRole={currentUserRole} />
  );
}
