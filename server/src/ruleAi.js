function splitLines(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function generateRuleBasedPlan(text) {
  const lines = splitLines(text);

  const projectName =
    lines.find((line) => line.includes("프로젝트"))?.replace(/^프로젝트\s*[:：-]?\s*/, "") ||
    "AI 자동 생성 프로젝트";

  const tasks = lines
    .filter((line) => !line.includes("프로젝트"))
    .map((line, index) => {
      const parts = line.split(/[,\t|]/).map((part) => part.trim()).filter(Boolean);

      return {
        title: parts[0] || line || `업무 ${index + 1}`,
        assigneeName: parts[1] || "미배정",
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(parts[2] || "") ? parts[2] : null,
        status: parts[3] || "대기",
        priority: parts[4] || "보통",
        progress: Number(parts[5]) || 0,
      };
    });

  if (tasks.length === 0) {
    return {
      projects: [
        {
          name: projectName,
          description: "규칙 기반으로 생성된 프로젝트입니다.",
          tasks: [
            {
              title: "요구사항 정리",
              assigneeName: "미배정",
              dueDate: null,
              status: "대기",
              priority: "높음",
              progress: 0,
            },
            {
              title: "담당자 배정",
              assigneeName: "미배정",
              dueDate: null,
              status: "대기",
              priority: "보통",
              progress: 0,
            },
          ],
        },
      ],
    };
  }

  return {
    projects: [
      {
        name: projectName,
        description: "규칙 기반으로 생성된 프로젝트입니다.",
        tasks,
      },
    ],
  };
}

module.exports = {
  generateRuleBasedPlan,
};
