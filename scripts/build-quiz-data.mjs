import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvas } from "../node_modules/@napi-rs/canvas/index.js";
import { getDocument } from "../node_modules/pdfjs-dist/legacy/build/pdf.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..");

const currentQuestionsPath = path.join(projectRoot, "client", "src", "data", "questions.json");
const parsedQuestionsPath = path.join(projectRoot, "scripts", "parsed-questions.json");
const outputImageDir = path.join(projectRoot, "client", "public", "question-images");
const outputImagePath = path.join(outputImageDir, "q57.png");
const answerPattern = /الحل الصحيح\s*:\s*([ABCD])/;
const pageTagPattern = /\[PAGE\s+\d+\]/g;
const optionPattern = /(?:^|\s)([ABCD])\s*\.\s*/g;

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function getPdfPath() {
  const candidates = [
    path.join(workspaceRoot, "_تمارين_رفد_الامتحانية_لمخبر_نظم_التشغيل_RAFD_BOSL501.pdf"),
    path.join(workspaceRoot, "os-lab-quiz-app-main", "_تمارين_رفد_الامتحانية_لمخبر_نظم_التشغيل_RAFD_BOSL501.pdf"),
    ...fs
      .readdirSync(workspaceRoot)
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
      options.push({
        letter: match[1],
        text: normalizeText(body.slice(start, end)),
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

function isValidQuestion(question) {
  if (!question || !Array.isArray(question.options) || question.options.length < 2) {
    return false;
  }

  const letters = question.options.map((option) => option.letter);
  if (!letters.every((letter) => ["A", "B", "C", "D"].includes(letter))) {
    return false;
  }

  return letters.includes(question.correctAnswer);
}

function fixReversedTrueFalse(question) {
  const looksReversed =
    Array.isArray(question.options) &&
    question.options.length === 2 &&
    question.options.every((option) => ["True", "False"].includes(option.letter) && ["A", "B"].includes(option.text));

  if (!looksReversed) {
    return question;
  }

  return {
    ...question,
    options: question.options.map((option) => ({
      letter: option.text,
      text: option.letter,
    })),
  };
}

function mergeQuestions(currentQuestions, parsedQuestions) {
  const parsedMap = new Map();
  for (const question of parsedQuestions) {
    if (!parsedMap.has(question.id)) {
      parsedMap.set(question.id, question);
    }
  }

  const mergedMap = new Map();

  for (const currentQuestion of currentQuestions) {
    const parsedQuestion = parsedMap.get(currentQuestion.id);

    if (isValidQuestion(currentQuestion)) {
      mergedMap.set(currentQuestion.id, currentQuestion);
      continue;
    }

    if (parsedQuestion) {
      mergedMap.set(currentQuestion.id, {
        ...parsedQuestion,
        text: currentQuestion.text || parsedQuestion.text,
        category: currentQuestion.category || parsedQuestion.category,
        explanation: currentQuestion.explanation ?? parsedQuestion.explanation,
      });
      continue;
    }

    mergedMap.set(currentQuestion.id, fixReversedTrueFalse(currentQuestion));
  }

  for (const parsedQuestion of parsedQuestions) {
    if (!mergedMap.has(parsedQuestion.id)) {
      mergedMap.set(parsedQuestion.id, parsedQuestion);
    }
  }

  return [...mergedMap.values()].sort((a, b) => a.id - b.id);
}

async function renderQuestionImage(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await getDocument({ data }).promise;
  const page = await pdf.getPage(19);
  const viewport = page.getViewport({ scale: 1.5 });

  const sourceCanvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const sourceContext = sourceCanvas.getContext("2d");
  await page.render({ canvasContext: sourceContext, viewport }).promise;

  const crop = {
    x: 100,
    y: 95,
    width: 730,
    height: 350,
  };

  const cropCanvas = createCanvas(crop.width, crop.height);
  const cropContext = cropCanvas.getContext("2d");
  cropContext.drawImage(
    sourceCanvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  fs.mkdirSync(outputImageDir, { recursive: true });
  fs.writeFileSync(outputImagePath, cropCanvas.toBuffer("image/png"));
}

async function main() {
  const currentQuestions = JSON.parse(fs.readFileSync(currentQuestionsPath, "utf8"));
  const parsedQuestions = JSON.parse(fs.readFileSync(parsedQuestionsPath, "utf8")).questions;
  const pdfPath = getPdfPath();

  const mergedQuestions = mergeQuestions(currentQuestions, parsedQuestions).map((question) =>
    question.id === 57
      ? {
          ...question,
          image: "./question-images/q57.png",
        }
      : question,
  );

  await renderQuestionImage(pdfPath);

  fs.writeFileSync(currentQuestionsPath, `${JSON.stringify(mergedQuestions, null, 2)}\n`, "utf8");
  console.log(`Wrote ${currentQuestionsPath}`);
  console.log(`Wrote ${outputImagePath}`);
  console.log(`Questions: ${mergedQuestions.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
