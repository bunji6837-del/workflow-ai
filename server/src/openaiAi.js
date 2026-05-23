const OpenAI = require("openai");
const { generateRuleBasedPlan } = require("./ruleAi");

function extractJson(text) {
  if (!text) return null;

  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1]);
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(text.slice(firstBrace, lastBrace + 1));
  }

  return JSON.parse(text);
}

async function generateAiPlan(text) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      mode: "rule-based",
      plan: generateRuleBasedPlan(text),
    };
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `
너는 협업툴의 AI 프로젝트 매니저다.
사용자가 입력한 설명을 바탕으로 프로젝트와 업무를 JSON으로만 생성해라.

반드시 아래 JSON 스키마만 반환해라.
{
  "projects": [
    {
      "name": "프로젝트명",
      "description": "설명",
      "tasks": [
        {
          "title": "업무명",
          "assigneeName": "담당자명 또는 미배정",
          "dueDate": "YYYY-MM-DD 또는 null",
          "status": "대기|진행중|완료|지연",
          "priority": "낮음|보통|높음",
          "progress": 0
        }
      ]
    }
  ]
}

사용자 입력:
${text}
`.trim();

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "반드시 유효한 JSON만 반환한다. 설명 문장은 붙이지 않는다.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    const content = completion.choices?.[0]?.message?.content || "";
    const plan = extractJson(content);

    return {
      mode: "openai",
      plan,
    };
  } catch (error) {
    console.error("OpenAI generation failed. Falling back to rule-based parser.", error);
    return {
      mode: "rule-based-fallback",
      plan: generateRuleBasedPlan(text),
    };
  }
}

module.exports = {
  generateAiPlan,
};
