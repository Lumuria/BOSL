import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { questions } from "@/data/questions";
import { CheckCircle2, XCircle, RotateCcw, BookOpen } from "lucide-react";

interface QuizState {
  currentQuestionIndex: number;
  selectedAnswer: string | null;
  answered: boolean;
  score: number;
  totalQuestions: number;
  showResult: boolean;
  quizFinished: boolean;
  answers: Array<{
    questionId: number;
    selected: string;
    correct: string;
    isCorrect: boolean;
  }>;
}

export default function Home() {
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    selectedAnswer: null,
    answered: false,
    score: 0,
    totalQuestions: questions.length,
    showResult: false,
    quizFinished: false,
    answers: [],
  });

  const currentQuestion = questions[quizState.currentQuestionIndex];

  const formatTextWithCode = (text: string) => {
    if (!text) return null;
    // This regex looks for common code patterns or things that should be LTR
    // For now, let's wrap segments that look like code in <code> tags
    // A simple heuristic: if it contains =, $, or common commands
    const parts = text.split(/(\s+[a-zA-Z0-9_$]+=[^\s]+|\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s+)/g);
    return parts.map((part, i) => {
      if (/^[a-zA-Z0-9_$]+=|[a-zA-Z_$][a-zA-Z0-9_$]*/.test(part.trim()) && part.length > 1) {
        return <code key={i} className="mx-1">{part}</code>;
      }
      return part;
    });
  };
  const progress = ((quizState.currentQuestionIndex + 1) / quizState.totalQuestions) * 100;
  const questionImages = currentQuestion.images ?? (currentQuestion.image ? [currentQuestion.image] : []);

  const handleAnswerClick = (letter: string) => {
    if (quizState.answered) return;

    const isCorrect = letter === currentQuestion.correctAnswer;
    const newAnswers = [
      ...quizState.answers,
      {
        questionId: currentQuestion.id,
        selected: letter,
        correct: currentQuestion.correctAnswer,
        isCorrect,
      },
    ];

    setQuizState((prev) => ({
      ...prev,
      selectedAnswer: letter,
      answered: true,
      showResult: true,
      score: isCorrect ? prev.score + 1 : prev.score,
      answers: newAnswers,
    }));
  };

  const handleNextQuestion = () => {
    if (quizState.currentQuestionIndex < quizState.totalQuestions - 1) {
      setQuizState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        selectedAnswer: null,
        answered: false,
        showResult: false,
      }));
    } else {
      setQuizState((prev) => ({
        ...prev,
        quizFinished: true,
      }));
    }
  };

  const handleRestartQuiz = () => {
    setQuizState({
      currentQuestionIndex: 0,
      selectedAnswer: null,
      answered: false,
      score: 0,
      totalQuestions: questions.length,
      showResult: false,
      quizFinished: false,
      answers: [],
    });
  };

  if (quizState.quizFinished) {
    const percentage = Math.round((quizState.score / quizState.totalQuestions) * 100);
    const passPercentage = 60;
    const isPassed = percentage >= passPercentage;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <BookOpen className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                كويز مخبر نظم التشغيل
              </h1>
            </div>
            <p className="text-slate-600">RAFD BOSL501</p>
          </div>

          {/* Results Card */}
          <Card className="p-8 mb-6 shadow-lg">
            <div className="text-center">
              {/* Score Circle */}
              <div className="mb-6 flex justify-center">
                <div
                  className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold ${
                    isPassed
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {percentage}%
                </div>
              </div>

              {/* Status Message */}
              <h2
                className={`text-2xl font-bold mb-2 ${
                  isPassed ? "text-green-600" : "text-red-600"
                }`}
              >
                {isPassed ? "ممتاز! لقد نجحت!" : "حاول مرة أخرى"}
              </h2>

              {/* Score Details */}
              <div className="bg-slate-50 rounded-lg p-6 mb-6">
                <p className="text-lg text-slate-700 mb-2">
                  لقد أجبت بشكل صحيح على{" "}
                  <span className="font-bold text-green-600">{quizState.score}</span> من{" "}
                  <span className="font-bold">{quizState.totalQuestions}</span> أسئلة
                </p>
                <p className="text-sm text-slate-600">
                  النسبة المئوية للنجاح: {passPercentage}%
                </p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-green-600 font-bold text-2xl">
                    {quizState.score}
                  </p>
                  <p className="text-green-700 text-sm">إجابات صحيحة</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-red-600 font-bold text-2xl">
                    {quizState.totalQuestions - quizState.score}
                  </p>
                  <p className="text-red-700 text-sm">إجابات خاطئة</p>
                </div>
              </div>

              {/* Restart Button */}
              <Button
                onClick={handleRestartQuiz}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-lg"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                إعادة الاختبار
              </Button>
            </div>
          </Card>

          {/* Detailed Results */}
          <Card className="p-6 shadow-lg">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              تفاصيل الإجابات
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {quizState.answers.map((answer, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    answer.isCorrect
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {answer.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">
                        السؤال {index + 1}
                      </p>
                      <p className="text-sm text-slate-700 mt-1">
                        إجابتك: <span className="font-bold">{answer.selected}</span>
                      </p>
                      {!answer.isCorrect && (
                        <p className="text-sm text-slate-700">
                          الإجابة الصحيحة:{" "}
                          <span className="font-bold text-green-600">
                            {answer.correct}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              كويز مخبر نظم التشغيل
            </h1>
          </div>
          <p className="text-slate-600">RAFD BOSL501</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-slate-700">
              السؤال {quizState.currentQuestionIndex + 1} من{" "}
              {quizState.totalQuestions}
            </span>
            <span className="text-sm font-semibold text-blue-600">
              النقاط: {quizState.score}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="p-6 md:p-8 mb-6 shadow-lg">
          {/* Question Text */}
          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-relaxed text-right" dir="rtl">
              {currentQuestion.text.split('\n').map((line, i) => (
                <div key={i} className="mb-2">
                  {line.split(/(`[^`]+`)/g).map((part, j) => {
                    if (part.startsWith('`') && part.endsWith('`')) {
                      return <code key={j}>{part.slice(1, -1)}</code>;
                    }
                    // Heuristic for code-like strings in the text
                    return line.includes('=') || line.includes('$') ? 
                      <span key={j} style={{ unicodeBidi: 'plaintext' }}>{part}</span> : part;
                  })}
                </div>
              ))}
            </h2>
            <p className="text-sm text-slate-500 mt-3">
              الفئة: {currentQuestion.category}
            </p>
            {questionImages.length > 0 && (
              <div className="mt-6 space-y-4">
                {questionImages.map((imageSrc, index) => (
                  <div
                    key={`${currentQuestion.id}-${index}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <img
                      src={imageSrc}
                      alt={`صورة السؤال ${currentQuestion.id}`}
                      className="w-full max-h-[32rem] object-contain bg-white"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {currentQuestion.options.map((option) => {
              const isSelected = quizState.selectedAnswer === option.letter;
              const isCorrect = option.letter === currentQuestion.correctAnswer;
              const isWrong =
                isSelected && option.letter !== currentQuestion.correctAnswer;

              let buttonClass =
                "w-full p-4 text-right rounded-lg border-2 transition-all duration-300 font-semibold text-slate-900 hover:shadow-md";

              if (!quizState.answered) {
                buttonClass +=
                  " border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 cursor-pointer";
              } else {
                if (isCorrect) {
                  buttonClass +=
                    " border-green-500 bg-green-50 text-green-700 cursor-default";
                } else if (isWrong) {
                  buttonClass +=
                    " border-red-500 bg-red-50 text-red-700 cursor-default";
                } else {
                  buttonClass +=
                    " border-slate-200 bg-white cursor-default opacity-60";
                }
              }

              return (
                <button
                  key={option.letter}
                  onClick={() => handleAnswerClick(option.letter)}
                  disabled={quizState.answered}
                  className={buttonClass}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-current flex items-center justify-center">
                      {option.letter}
                    </span>
                    <span className="flex-1" dir="ltr" style={{ textAlign: 'right' }}>{option.text}</span>
                    {quizState.answered && isCorrect && (
                      <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                    )}
                    {quizState.answered && isWrong && (
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Result Message and Explanation */}
          {quizState.showResult && (
            <div
              className={`p-6 rounded-lg mb-6 border-2 ${
                quizState.selectedAnswer === currentQuestion.correctAnswer
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                {quizState.selectedAnswer === currentQuestion.correctAnswer ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-bold text-green-700 text-lg">
                        ✓ إجابة صحيحة!
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-bold text-red-700 text-lg">
                        ✗ إجابة خاطئة
                      </p>
                      <p className="text-red-700 text-sm mt-1">
                        الإجابة الصحيحة:{" "}
                        <span className="font-bold">
                          {currentQuestion.correctAnswer}
                        </span>
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Explanation */}
              <div className="mt-4 pt-4 border-t-2 border-current border-opacity-20">
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  التعليل:
                </p>
                <p
                  className={`text-sm leading-relaxed ${
                    quizState.selectedAnswer === currentQuestion.correctAnswer
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                  dir="auto"
                >
                  {currentQuestion.explanation || (quizState.selectedAnswer === currentQuestion.correctAnswer ? "إجابة صحيحة بناءً على معطيات السؤال." : "الإجابة المختارة غير صحيحة، يرجى مراجعة المفاهيم المتعلقة بهذا السؤال.")}
                </p>
              </div>
            </div>
          )}

          {/* Next Button */}
          {quizState.answered && (
            <Button
              onClick={handleNextQuestion}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-lg"
            >
              {quizState.currentQuestionIndex === quizState.totalQuestions - 1
                ? "عرض النتائج"
                : "السؤال التالي"}
            </Button>
          )}
        </Card>

        {/* Category Info */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-700">
            <span className="font-bold">نصيحة:</span> اقرأ السؤال بعناية واختر
            الإجابة الصحيحة. ستحصل على تعليل مفصل لكل إجابة.
          </p>
        </Card>
      </div>
    </div>
  );
}
