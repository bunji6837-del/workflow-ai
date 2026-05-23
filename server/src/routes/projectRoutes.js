const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { authRequired, ensureWorkspace } = require("../auth");

const router = express.Router();

router.get("/workspace", authRequired, async (req, res, next) => {
  try {
    const workspaceId = await ensureWorkspace(req.user);

    const { data: workspace, error } = await supabaseAdmin
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();

    if (error) throw error;

    res.json({ workspace });
  } catch (error) {
    next(error);
  }
});

router.get("/projects", authRequired, async (req, res, next) => {
  try {
    const workspaceId = await ensureWorkspace(req.user);

    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ projects: data || [] });
  } catch (error) {
    next(error);
  }
});

router.get("/tasks", authRequired, async (req, res, next) => {
  try {
    const workspaceId = await ensureWorkspace(req.user);
    const { project_id } = req.query;

    let query = supabaseAdmin
      .from("tasks")
      .select("*, projects(name)")
      .eq("workspace_id", workspaceId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (project_id && project_id !== "all") {
      query = query.eq("project_id", project_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ tasks: data || [] });
  } catch (error) {
    next(error);
  }
});

router.patch("/tasks/:id", authRequired, async (req, res, next) => {
  try {
    const workspaceId = await ensureWorkspace(req.user);
    const { id } = req.params;

    const allowed = {};
    for (const key of ["title", "assignee_name", "due_date", "status", "priority", "progress"]) {
      if (req.body[key] !== undefined) allowed[key] = req.body[key];
    }

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .update(allowed)
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    res.json({ task: data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
