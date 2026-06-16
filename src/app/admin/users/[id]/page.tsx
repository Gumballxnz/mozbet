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
  // 1. Validar se o admin atual está autenticado e tem permissões
  const cookieStore = await cookies();
  const token = cookieStore.get("mozbet_session")?.value;
  
  if (!token) {
    redirect("/admin/login");
  }

  const payload = await verifyToken<{ id: string; role: string }>(token);
  if (!payload?.id) {
    redirect("/admin/login");
  }

  // Obter role do administrador ativo
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

  // 2. Buscar dados do usuário específico
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (!user) {
    notFound();
  }

  // 3. Buscar dados adicionais do Auth (como e-mail se não estiver na tabela users)
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
