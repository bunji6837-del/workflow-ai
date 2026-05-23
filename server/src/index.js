require("dotenv").config();

const express = require("express");
const cors = require("cors");
const projectRoutes = require("./routes/projectRoutes");
const importRoutes = require("./routes/importRoutes");
const chatRoutes = require("./routes/chatRoutes");
const memberRoutes = require("./routes/memberRoutes");

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "workflow-ai-server" });
});

app.use("/api", projectRoutes);
app.use("/api", importRoutes);
app.use("/api", chatRoutes);
app.use("/api", memberRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "API 경로를 찾을 수 없습니다." });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "서버 오류가 발생했습니다.",
  });
});

app.listen(port, () => {
  console.log(`Workflow AI server running on http://localhost:${port}`);
});
