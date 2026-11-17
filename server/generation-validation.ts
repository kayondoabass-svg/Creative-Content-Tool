import { slideSchema } from "../shared/schema";
import { validateWorksheet } from "../shared/worksheet-quality";

const text = (v: unknown): v is string => typeof v === "string" && !!v.trim();
const rows = (value: unknown, label: string): any[] => {
  if (!Array.isArray(value) || !value.length) throw new Error(`The generated ${label} is incomplete. Please retry.`);
  return value;
};
export function validateGameContent(data: any, type: string) {
  if (!data || !text(data.title)) throw new Error("The generated game has no title. Please retry.");
  if (type === "jeopardy") {
    for (const category of rows(data.categories, "game categories")) {
      if (!text(category.name)) throw new Error("A game category is missing its name.");
      for (const clue of rows(category.clues, "clues")) {
        if (!text(clue.clue) || !text(clue.answer) || !Number.isFinite(clue.points)) throw new Error("A game clue is missing its answer or points.");
      }
    }
  } else if (type === "spinTheWheel") {
    for (const category of rows(data.categories, "wheel categories")) {
      for (const word of rows(category.words, "wheel words")) {
        if (!text(word.word) || !text(word.definition)) throw new Error("A wheel word is missing its definition.");
      }
    }
  } else if (["pictureMatch", "memoryMatch"].includes(type)) {
    for (const pair of rows(data.pairs, "matching pairs")) {
      if (!text(pair.word) || !text(type === "pictureMatch" ? pair.imagePrompt : pair.definition)) throw new Error("A matching pair is incomplete.");
    }
  } else if (type === "oddOneOut") {
    for (const round of rows(data.rounds, "game rounds")) {
      if (!Array.isArray(round.items) || round.items.length !== 4 || !round.items.every(text) ||
          !Number.isInteger(round.oddIndex) || round.oddIndex < 0 || round.oddIndex > 3 || !text(round.reason)) throw new Error("An odd-one-out round has an invalid answer.");
    }
  } else {
    if (type === "hiddenPicture" && (!text(data.imagePrompt) || !text(data.revealText))) throw new Error("The hidden-picture game is incomplete.");
    for (const q of rows(data.questions, "game questions")) {
      if (type === "vocabularyQuiz") {
        if (!text(q.question) || !["a", "b", "c", "d"].includes(q.correct) ||
            !["a", "b", "c", "d"].every(key => text(q[key]))) throw new Error("A quiz question has an invalid answer.");
      } else if (type === "trueOrFalse") {
        if (!text(q.statement) || typeof q.answer !== "boolean" || !text(q.explanation)) throw new Error("A true-or-false question has no checked answer.");
      } else if (type === "fillInTheBlank") {
        if (!text(q.sentence) || !q.sentence.includes("___") || !text(q.answer)) throw new Error("A fill-in-the-blank question is incomplete.");
      } else if (!text(q.question) || !text(q.answer)) throw new Error("A game question is incomplete.");
    }
  }
}

export function validateGeneratedContent(type: string, title: string, value: string) {
  if (!text(title)) throw new Error("The generated document has no title.");
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("The generated document is incomplete.");
  if (type === "presentation") {
    for (const slide of rows(parsed.slides, "slides")) {
      if (!slideSchema.safeParse(slide).success || !text(slide.title)) throw new Error("The presentation contains an incomplete slide.");
    }
  }
  if (type === "worksheet") validateWorksheet(parsed);
  return parsed;
}
