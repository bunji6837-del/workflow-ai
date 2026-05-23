const ExcelJS = require("exceljs");

function getValue(row, keys, fallback = "") {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  return fallback;
}

function toText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function excelSerialToDate(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial)) return null;
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const date = new Date(utcValue * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function toDate(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    return excelSerialToDate(value);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw
    .replace(/\./g, "-")
    .replace(/\//g, "-")
    .replace(/\s+/g, "");

  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;

  const [, y, m, d] = match;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function toProgress(value, status) {
  const raw = toText(value, "");
  if (raw) {
    const number = Number(raw.replace("%", ""));
    if (Number.isFinite(number)) {
      return Math.max(0, Math.min(100, Math.round(number)));
    }
  }

  if (String(status).includes("완료")) return 100;
  if (String(status).includes("진행")) return 50;
  return 0;
}

function normalizeRows(rows, fileName = "엑셀 기반 프로젝트") {
  const baseProjectName = fileName.replace(/\.(xlsx|csv)$/i, "") || "엑셀 기반 프로젝트";

  return rows
    .filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""))
    .map((row, index) => {
      const projectName = toText(
        getValue(row, ["프로젝트명", "프로젝트", "project", "Project", "PROJECT", "projectName"]),
        baseProjectName
      );

      const status = toText(
        getValue(row, ["상태", "진행상태", "진행 상태", "status", "Status"]),
        "대기"
      );

      const priority = toText(
        getValue(row, ["우선순위", "priority", "Priority"]),
        "보통"
      );

      const title = toText(
        getValue(row, ["업무명", "업무", "할일", "태스크", "task", "Task", "title", "Title"]),
        `업무 ${index + 1}`
      );

      const assigneeName = toText(
        getValue(row, ["담당자", "담당", "assignee", "Assignee", "owner", "Owner"]),
        "미배정"
      );

      const dueDate = toDate(
        getValue(row, ["마감일", "마감 일", "기한", "dueDate", "Due Date", "deadline", "Deadline"], null)
      );

      const progress = toProgress(
        getValue(row, ["진행률", "progress", "Progress"], ""),
        status
      );

      return {
        projectName,
        title,
        assigneeName,
        dueDate,
        status,
        priority,
        progress,
        sourceRow: row,
      };
    });
}

function cellToValue(cell) {
  const value = cell?.value;
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return value;
  if (typeof value !== "object") return value;

  if (Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text || "").join("");
  }

  if (Object.prototype.hasOwnProperty.call(value, "result")) {
    return value.result ?? "";
  }

  if (Object.prototype.hasOwnProperty.call(value, "text")) {
    return value.text ?? "";
  }

  if (Object.prototype.hasOwnProperty.call(value, "hyperlink")) {
    return value.text ?? value.hyperlink ?? "";
  }

  return String(value);
}

function worksheetToRows(worksheet) {
  const headerRow = worksheet.getRow(1);
  const headers = [];

  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const header = toText(cellToValue(cell), `column${colNumber}`);
    headers[colNumber] = header || `column${colNumber}`;
  });

  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const obj = {};
    let hasValue = false;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = headers[colNumber] || `column${colNumber}`;
      const value = cellToValue(cell);
      obj[key] = value;
      if (String(value ?? "").trim() !== "") hasValue = true;
    });

    if (hasValue) rows.push(obj);
  });

  return rows;
}

function parseCsvText(text) {
  const content = text.replace(/^\uFEFF/, "");
  const table = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      table.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    table.push(row);
  }

  const headers = (table[0] || []).map((header, index) => toText(header, `column${index + 1}`));
  return table.slice(1).map((values) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] ?? "";
    });
    return obj;
  });
}

async function parseWorkbookBuffer(buffer, originalName = "uploaded.xlsx") {
  const lowerName = String(originalName).toLowerCase();

  if (lowerName.endsWith(".csv")) {
    const rows = parseCsvText(buffer.toString("utf8"));
    return normalizeRows(rows, originalName);
  }

  if (!lowerName.endsWith(".xlsx")) {
    throw new Error("현재 업로드는 .xlsx 또는 .csv 파일만 지원합니다. .xls 파일은 .xlsx로 저장한 뒤 업로드해 주세요.");
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const rows = worksheetToRows(worksheet);
  return normalizeRows(rows, originalName);
}

module.exports = {
  parseWorkbookBuffer,
  normalizeRows,
};
