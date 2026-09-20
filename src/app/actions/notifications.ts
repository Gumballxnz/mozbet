"use server";

import { supabaseAdmin, verifyToken } from "@/lib/auth-server";
import { cookies } from "next/headers";

export async function markNotificationsAsRead(unreadIds: string[]) {
  if (!unreadIds || unreadIds.length === 0) return { success: true };

  const cookieStore = await cookies();
  const token = cookieStore.get("mozbet_session")?.value;
  if (!token) return { success: false, error: "Sem sessão" };

  const user = await verifyToken<{ id: string }>(token);
  if (!user?.id) return { success: false, error: "Não autorizado" };

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ is_read: true })
    .in("id", unreadIds)
    .eq("user_id", user.id);

  if (error) {
    console.error("Erro ao marcar notificações:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

import { unstable_noStore as noStore } from "next/cache";

export async function getLatestNotifications(_cacheBuster?: number) {
  noStore();
  const cookieStore = await cookies();
  const token = cookieStore.get("mozbet_session")?.value;
  if (!token) return [];

  const user = await verifyToken<{ id: string }>(token);
  if (!user?.id) return [];

  const { data } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(10);

  return data || [];
}
