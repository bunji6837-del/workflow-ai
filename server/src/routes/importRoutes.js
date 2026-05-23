const express = require("express");
const multer = require("multer");
const { parseWorkbookBuffer } = require("../excelParser");
const { supabaseAdmin } = require("../supabaseAdmin");
const { authRequired, ensureWorkspace } = require("../auth");
const { generateAiPlan } = require("../openaiAi");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function findOrCreateProject({ workspaceId, userId, name, description = "" }) {
  const safeName = String(name || "자동 생성 프로젝트").trim();

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("name", safeName)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: created, error: createError } = await supabaseAdmin
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      name: safeName,
      description,
      created_by: userId,
    })
    .select("*")
    .single();

  if (createError) throw createError;
  return created;
}

async function insertTasks({ workspaceId, projectId, userId, tasks }) {
  if (!tasks || tasks.length === 0) return [];

  const payload = tasks.map((task) => ({
    workspace_id: workspaceId,
    project_id: projectId,
    title: task.title || "업무",
    assignee_name: task.assigneeName || task.assignee_name || "미배정",
    due_date: task.dueDate || task.due_date || null,
    status: task.status || "대기",
    priority: task.priority || "보통",
    progress: Math.max(0, Math.min(100, Number(task.progress) || 0)),
    source_row: task.sourceRow || task.source_row || null,
    created_by: userId,
  }));

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .insert(payload)
    .select("*");

  if (error) throw error;
  return data || [];
}

router.post("/import/excel", authRequired, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "업로드할 엑셀 파일이 없습니다." });
    }

    const workspaceId = await ensureWorkspace(req.user);
    const normalizedRows = await parseWorkbookBuffer(req.file.buffer, req.file.originalname);

    if (normalizedRows.length === 0) {
      return res.status(400).json({ message: "엑셀에서 읽을 수 있는 업무 데이터가 없습니다." });
    }

    const byProject = new Map();
    for (const row of normalizedRows) {
      if (!byProject.has(row.projectName)) {
        byProject.set(row.projectName, []);
      }
      byProject.get(row.projectName).push(row);
    }

    const createdProjectIds = [];
    let taskCount = 0;

    for (const [projectName, rows] of byProject.entries()) {
      const project = await findOrCreateProject({
        workspaceId,
        userId: req.user.id,
        name: projectName,
        description: `${req.file.originalname} 파일에서 자동 생성됨`,
      });

      createdProjectIds.push(project.id);

      const inserted = await insertTasks({
        workspaceId,
        projectId: project.id,
        userId: req.user.id,
        tasks: rows,
      });

      taskCount += inserted.length;
    }

    res.json({
      message: "엑셀 업로드가 완료되었습니다.",
      fileName: req.file.originalname,
      projectCount: byProject.size,
      taskCount,
      projectIds: createdProjectIds,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/ai/generate", authRequired, async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || String(text).trim().length < 5) {
      return res.status(400).json({ message: "AI가 분석할 설명을 5글자 이상 입력하세요." });
    }

    const workspaceId = await ensureWorkspace(req.user);
    const result = await generateAiPlan(text);

    const generatedProjects = [];
    let taskCount = 0;

    for (const projectInput of result.plan.projects || []) {
      const project = await findOrCreateProject({
        workspaceId,
        userId: req.user.id,
        name: projectInput.name,
        description: projectInput.description || "",
      });

      const inserted = await insertTasks({
        workspaceId,
        projectId: project.id,
        userId: req.user.id,
        tasks: projectInput.tasks || [],
      });

      taskCount += inserted.length;
      generatedProjects.push(project);
    }

    res.json({
      message: "AI 프로젝트 생성이 완료되었습니다.",
      mode: result.mode,
      projectCount: generatedProjects.length,
      taskCount,
      projects: generatedProjects,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
