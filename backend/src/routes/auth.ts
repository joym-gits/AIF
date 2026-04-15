import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin, supabaseAnon } from "../supabase";

const router = Router();

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(2).max(32).optional(),
  display_name: z.string().max(64).optional(),
});

router.post("/register", async (req, res) => {
  const parsed = credsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }
  const { email, password, username, display_name } = parsed.data;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    res.status(400).json({ error: error?.message ?? "signup failed" });
    return;
  }

  await supabaseAdmin.from("profiles").insert({
    id: data.user.id,
    username: username ?? null,
    display_name: display_name ?? null,
  });

  res.status(201).json({ id: data.user.id, email: data.user.email });
});

router.post("/login", async (req, res) => {
  const parsed = z
    .object({ email: z.string().email(), password: z.string() })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.issues });
    return;
  }
  const { data, error } = await supabaseAnon.auth.signInWithPassword(parsed.data);
  if (error || !data.session) {
    res.status(401).json({ error: error?.message ?? "login failed" });
    return;
  }
  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: { id: data.user?.id, email: data.user?.email },
  });
});

export default router;
