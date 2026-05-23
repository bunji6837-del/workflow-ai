const express = require("express");
const { supabaseAdmin } = require("../supabaseAdmin");
const { authRequired, ensureWorkspace } = require("../auth");

const router = express.Router();

async function listAuthUsersMap() {
  const userMap = new Map();
  let page = 1;
  const perPage = 1000;

  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users || [];
    for (const user of users) {
      userMap.set(user.id, user);
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return userMap;
}

async function findAuthUserByEmail(email) {
  const target = String(email || "").trim().toLowerCase();
  if (!target) return null;

  const userMap = await listAuthUsersMap();
  return Array.from(userMap.values()).find((user) => String(user.email || "").toLowerCase() === target) || null;
}

async function getCurrentMembership(workspaceId, userId) {
  const { data, error } = await supabaseAdmin
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

router.get("/members", authRequired, async (req, res, next) => {
  try {
    const workspaceId = await ensureWorkspace(req.user);

    const { data: members, error } = await supabaseAdmin
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const userMap = await listAuthUsersMap();
    const enriched = (members || []).map((member) => {
      const user = userMap.get(member.user_id);
      return {
        ...member,
        email: user?.email || null,
        last_sign_in_at: user?.last_sign_in_at || null,
      };
    });

    res.json({ members: enriched });
  } catch (error) {
    next(error);
  }
});

router.post("/members", authRequired, async (req, res, next) => {
  try {
    const workspaceId = await ensureWorkspace(req.user);
    const currentMembership = await getCurrentMembership(workspaceId, req.user.id);

    if (!currentMembership || !["owner", "admin"].includes(currentMembership.role)) {
      return res.status(403).json({ message: "팀원을 추가할 권한이 없습니다. owner 또는 admin만 가능합니다." });
    }

    const email = String(req.body.email || "").trim().toLowerCase();
    const role = ["admin", "member"].includes(req.body.role) ? req.body.role : "member";

    if (!email) {
      return res.status(400).json({ message: "추가할 팀원의 이메일이 필요합니다." });
    }

    const targetUser = await findAuthUserByEmail(email);

    if (!targetUser) {
      return res.status(404).json({
        message: "해당 이메일로 회원가입된 유저가 없습니다. 먼저 그 이메일로 회원가입한 뒤 다시 추가하세요.",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("workspace_members")
      .upsert(
        {
          workspace_id: workspaceId,
          user_id: targetUser.id,
          role,
        },
        { onConflict: "workspace_id,user_id" }
      )
      .select("*")
      .single();

    if (error) throw error;

    res.json({
      message: `${targetUser.email} 팀원이 ${role} 권한으로 추가됐습니다.`,
      member: {
        ...data,
        email: targetUser.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
