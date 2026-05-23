const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { authRequired, ensureWorkspace } = require("../auth");

const router = express.Router();

router.get("/messages", authRequired, async (req, res, next) => {
  try {
    const workspaceId = await ensureWorkspace(req.user);
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({ message: "project_id가 필요합니다." });
    }

    const { data, error } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("project_id", project_id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    res.json({ messages: data || [] });
  } catch (error) {
    next(error);
  }
});

router.post("/messages", authRequired, async (req, res, next) => {
  try {
    const workspaceId = await ensureWorkspace(req.user);
    const { project_id, body } = req.body;

    if (!project_id || !body || !String(body).trim()) {
      return res.status(400).json({ message: "project_id와 메시지 내용이 필요합니다." });
    }

    const { data, error } = await supabaseAdmin
      .from("messages")
      .insert({
        workspace_id: workspaceId,
        project_id,
        user_id: req.user.id,
        user_email: req.user.email,
        body: String(body).trim(),
      })
      .select("*")
      .single();

    if (error) throw error;

    res.json({ message: data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
