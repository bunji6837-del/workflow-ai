const { supabaseAuth, supabaseAdmin } = require("./supabaseAdmin");

async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ message: "유효하지 않은 로그인 세션입니다." });
    }

    req.user = data.user;
    next();
  } catch (error) {
    next(error);
  }
}

async function ensureWorkspace(user) {
  const { data: existingMember, error: memberError } = await supabaseAdmin
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (memberError) {
    throw memberError;
  }

  if (existingMember?.workspace_id) {
    return existingMember.workspace_id;
  }

  const fallbackName = user.email?.split("@")[0] || "my";
  const { data: workspace, error: workspaceError } = await supabaseAdmin
    .from("workspaces")
    .insert({
      name: `${fallbackName} workspace`,
      owner_id: user.id,
    })
    .select("id")
    .single();

  if (workspaceError) {
    throw workspaceError;
  }

  const { error: insertMemberError } = await supabaseAdmin
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
    });

  if (insertMemberError) {
    throw insertMemberError;
  }

  return workspace.id;
}

module.exports = {
  authRequired,
  ensureWorkspace,
};
