import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/auth-server";

const ADMIN_USERS = [
  { phone: "840683435", password: "Roman700" },
  { phone: "858148698", password: "Roman700" },
];

export async function POST(req: Request) {

  const authKey = req.headers.get("x-seed-key");
  if (authKey !== process.env.JWT_SECRET) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const results = [];

  for (const admin of ADMIN_USERS) {

    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", admin.phone)
      .single();

    if (existing) {

      await supabaseAdmin
        .from("users")
        .update({ is_admin: true, is_verified: true })
        .eq("phone", admin.phone);

      results.push({ phone: admin.phone, status: "atualizado para admin" });
      continue;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(admin.password, salt);

    const { error } = await supabaseAdmin
      .from("users")
      .insert({
        phone: admin.phone,
        password_hash: hashedPassword,
        balance: 0.00,
        has_deposited: false,
        is_admin: true,
        is_verified: true,
      });

    if (error) {
      results.push({ phone: admin.phone, status: "ERRO", error: error.message });
    } else {
      results.push({ phone: admin.phone, status: "criado com sucesso" });
    }
  }

  return NextResponse.json({
    message: "Seed de administradores concluída.",
    results
  });
}
