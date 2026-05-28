const express = require("express");
const { authRequired } = require("../auth");
const { ensureProfile, upsertProfileForUser } = require("../profileHelpers");

const router = express.Router();

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

module.exports = router;