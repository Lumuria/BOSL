import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDocument } from "../node_modules/pdfjs-dist/legacy/build/pdf.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..");

const answerPattern = /الحل الصحيح\s*:\s*([ABCD])/;
const pageTagPattern = /\[PAGE\s+\d+\]/g;
const optionPattern = /(?:^|\s)([ABCD])\s*\.\s*/g;

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function parseBlock(blockText) {
  const cleaned = normalizeText(blockText.replace(pageTagPattern, " "));
  const answerMatch = cleaned.match(answerPattern);
  const body = answerMatch?.index !== undefined ? cleaned.slice(0, answerMatch.index).trim() : cleaned;
  const correctAnswer = answerMatch?.[1] ?? "";

  const optionMatches = [...body.matchAll(optionPattern)];
  let questionText = body;
  const options = [];

  if (optionMatches.length > 0) {
    questionText = body.slice(0, optionMatches[0].index).trim();
    for (let index = 0; index < optionMatches.length; index++) {
      const match = optionMatches[index];
      const start = match.index + match[0].length;
      const end = index + 1 < optionMatches.length ? optionMatches[index + 1].index : body.length;
      const optionText = body.slice(start, end).trim();
      options.push({
        letter: match[1],
        text: normalizeText(optionText),
      });
    }
  }

  return {
    text: normalizeText(questionText),
    options,
    correctAnswer,
    explanation: "",
    category: "نظم التشغيل",
  };
}

function getPdfPath() {
  const candidates = [
    path.join(workspaceRoot, "_تمارين_رفد_الامتحانية_لمخبر_نظم_التشغيل_RAFD_BOSL501.pdf"),
    path.join(workspaceRoot, "os-lab-quiz-app-main", "_تمارين_رفد_الامتحانية_لمخبر_نظم_التشغيل_RAFD_BOSL501.pdf"),
    ...fs.readdirSync(workspaceRoot)
      .filter((name) => name.endsWith(".pdf") && name.includes("RAFD_BOSL501"))
      .map((name) => path.join(workspaceRoot, name)),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("Could not locate the RAFD BOSL501 PDF file.");
}

async function main() {
  const pdfPath = getPdfPath();
  const pdfData = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await getDocument({ data: pdfData }).promise;

  let combinedText = "";
  for (let pageNumber = 4; pageNumber <= 49; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const text = (await page.getTextContent()).items.map((item) => item.str).join(" ");
    combinedText += ` [PAGE ${pageNumber}] ${text}`;
  }

  const questionPattern = /(?:^|\s):?\s*Q\s*([0-9\s]+)\s*([\s\S]*?)(?=(?:\s*:?\s*Q\s*[0-9\s]+)|$)/g;
  const parsedQuestions = [];

  for (const match of combinedText.matchAll(questionPattern)) {
    const id = Number(match[1].replace(/\s+/g, ""));
    if (!Number.isFinite(id)) {
      continue;
    }

    const parsed = parseBlock(match[2]);
    if (!parsed.text || parsed.options.length === 0 || !parsed.correctAnswer) {
      continue;
    }

    parsedQuestions.push({
      id,
      ...parsed,
    });
  }

  parsedQuestions.sort((a, b) => a.id - b.id);

  const objectiveIds = parsedQuestions.map((question) => question.id);
  const uniqueIds = new Set(objectiveIds);
  const missing = [];
  for (let id = 1; id <= 170; id++) {
    if (!uniqueIds.has(id)) {
      missing.push(id);
    }
  }

  const output = {
    pdfPath,
    totalParsed: parsedQuestions.length,
    uniqueParsed: uniqueIds.size,
    missingFrom1to170: missing,
    questions: parsedQuestions,
  };

  const outputPath = path.join(projectRoot, "scripts", "parsed-questions.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`Wrote ${outputPath}`);
  console.log(`Parsed ${parsedQuestions.length} questions (${uniqueIds.size} unique).`);
  console.log(`Missing IDs: ${missing.join(",")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
