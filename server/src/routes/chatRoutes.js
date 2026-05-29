const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { authRequired, ensureWorkspace } = require("../auth");
const { ensureProfile, getProfilesByUserIds, publicNameFromProfile } = require("../profileHelpers");

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

    const profileMap = await getProfilesByUserIds((data || []).map((message) => message.user_id));

    const messages = (data || []).map((message) => {
      const profile = profileMap.get(message.user_id);

      return {
        ...message,
        user_display_name: publicNameFromProfile(profile, message.user_email),
      };
    });

    res.json({ messages });
  } catch (error) {
    next(error);
  }
});

router.post("/messages", authRequired, async (req, res, next) => {
  try {
    const workspaceId = await ensureWorkspace(req.user);
    const profile = await ensureProfile(req.user);
    const { project_id, body } = req.body;

    if (!project_id || !body || !String(body).trim()) {
      return res.status(400).json({ message: "project_id와 메시지 내용이 필요합니다." });
    }

    const displayName = publicNameFromProfile(profile, req.user.email);

    const { data, error } = await supabaseAdmin
      .from("messages")
      .insert({
        workspace_id: workspaceId,
        project_id,
        user_id: req.user.id,
        user_email: req.user.email,
        user_display_name: displayName,
        body: String(body).trim(),
      })
      .select("*")
      .single();

    if (error) throw error;

    res.json({
      message: {
        ...data,
        user_display_name: displayName,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/messages/:id", authRequired, async (req, res, next) => {
  try {
    const workspaceId = await ensureWorkspace(req.user);
    const { id } = req.params;
    const body = String(req.body.body || "").trim();

    if (!body) {
      return res.status(400).json({ message: "수정할 메시지 내용을 입력하세요." });
    }

    const { data: existing, error: selectError } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .maybeSingle();

    if (selectError) throw selectError;

    if (!existing) {
      return res.status(404).json({ message: "수정할 메시지를 찾을 수 없습니다." });
    }

    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ message: "내가 작성한 메시지만 수정할 수 있습니다." });
    }

    const profile = await ensureProfile(req.user);
    const displayName = publicNameFromProfile(profile, req.user.email);

    const { data, error } = await supabaseAdmin
      .from("messages")
      .update({
        body,
        user_display_name: displayName,
      })
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select("*")
      .single();

    if (error) throw error;

    res.json({
      message: {
        ...data,
        user_display_name: displayName,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/messages/:id", authRequired, async (req, res, next) => {
  try {
    const workspaceId = await ensureWorkspace(req.user);
    const { id } = req.params;

    const { data: existing, error: selectError } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .maybeSingle();

    if (selectError) throw selectError;

    if (!existing) {
      return res.status(404).json({ message: "삭제할 메시지를 찾을 수 없습니다." });
    }

    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ message: "내가 작성한 메시지만 삭제할 수 있습니다." });
    }

    const { error } = await supabaseAdmin
      .from("messages")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) throw error;

    res.json({
      message: "메시지가 삭제됐습니다.",
      id,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;