const express = require("express");
const multer = require("multer");
const { authRequired } = require("../auth");
const { supabaseAdmin } = require("../supabaseAdmin");
const { ensureProfile, upsertProfileForUser } = require("../profileHelpers");

const router = express.Router();

const AVATAR_BUCKET = process.env.SUPABASE_AVATAR_BUCKET || "profile-avatars";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("이미지 파일만 업로드할 수 있습니다."));
      return;
    }

    cb(null, true);
  },
});

function extensionFromMime(mimetype) {
  if (mimetype === "image/png") return "png";
  if (mimetype === "image/webp") return "webp";
  if (mimetype === "image/gif") return "gif";
  return "jpg";
}

router.get("/profile", authRequired, async (req, res, next) => {
  try {
    const profile = await ensureProfile(req.user);

    res.json({
      profile: {
        ...profile,
        email: profile.email || req.user.email || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/profile", authRequired, async (req, res, next) => {
  try {
    const profile = await upsertProfileForUser(req.user, {
      display_name: req.body.display_name,
      nickname: req.body.nickname,
      avatar_url: req.body.avatar_url,
    });

    res.json({
      message: "프로필이 저장됐습니다.",
      profile,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/profile/avatar", authRequired, upload.single("avatar"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "업로드할 이미지 파일이 없습니다." });
    }

    await ensureProfile(req.user);

    const ext = extensionFromMime(req.file.mimetype);
    const filePath = `${req.user.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath);

    const avatarUrl = publicData.publicUrl;

    const profile = await upsertProfileForUser(req.user, {
      avatar_url: avatarUrl,
    });

    res.json({
      message: "프로필 이미지가 업로드됐습니다.",
      avatar_url: avatarUrl,
      profile,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;