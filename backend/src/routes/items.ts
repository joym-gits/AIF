import { Router } from "express";
import { supabaseAdmin } from "../supabase";

const router = Router();

router.get("/:id", async (req, res) => {
  const { data: item, error } = await supabaseAdmin
    .from("feed_items")
    .select("*, feeds:feed_id(id, title, domain, feed_url, author:user_id)")
    .eq("id", req.params.id)
    .single();
  if (error || !item) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json({ item });
});

export default router;
