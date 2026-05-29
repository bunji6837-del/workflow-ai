const { supabaseAdmin } = require("./supabaseAdmin");

function fallbackNameFromEmail(email) {
  return String(email || "user").split("@")[0] || "user";
}

function cleanText(value, max = 60) {
  return String(value || "").trim().slice(0, max);
}

function publicNameFromProfile(profile, fallbackEmail) {
  return (
    cleanText(profile?.nickname) ||
    cleanText(profile?.display_name) ||
    fallbackNameFromEmail(profile?.email || fallbackEmail)
  );
}

async function ensureProfile(user) {
  const email = user.email || null;
  const fallbackDisplayName = fallbackNameFromEmail(email);

  const { data: existing, error: selectError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    if (!existing.email && email) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ email })
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (updateError) throw updateError;
      return updated;
    }

    return existing;
  }

  const { data: created, error: insertError } = await supabaseAdmin
    .from("profiles")
    .insert({
      user_id: user.id,
      email,
      display_name: fallbackDisplayName,
      nickname: "",
      avatar_url: "",
    })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return created;
}

async function getProfilesByUserIds(userIds) {
  const uniqueIds = Array.from(new Set((userIds || []).filter(Boolean)));

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .in("user_id", uniqueIds);

  if (error) throw error;

  const map = new Map();

  for (const profile of data || []) {
    map.set(profile.user_id, profile);
  }

  return map;
}

async function upsertProfileForUser(user, payload = {}) {
  const current = await ensureProfile(user);

  const next = {
    user_id: user.id,
    email: user.email || current.email || null,
    display_name: cleanText(payload.display_name ?? current.display_name),
    nickname: cleanText(payload.nickname ?? current.nickname),
    avatar_url: cleanText(payload.avatar_url ?? current.avatar_url, 500),
  };

  if (!next.display_name) {
    next.display_name = fallbackNameFromEmail(user.email);
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .upsert(next, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

async function updateProfileByUserId(userId, payload = {}) {
  const allowed = {};

  if (payload.display_name !== undefined) {
    allowed.display_name = cleanText(payload.display_name);
  }

  if (payload.nickname !== undefined) {
    allowed.nickname = cleanText(payload.nickname);
  }

  if (payload.avatar_url !== undefined) {
    allowed.avatar_url = cleanText(payload.avatar_url, 500);
  }

  if (Object.keys(allowed).length === 0) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(allowed)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  ensureProfile,
  getProfilesByUserIds,
  upsertProfileForUser,
  updateProfileByUserId,
  publicNameFromProfile,
  fallbackNameFromEmail,
};