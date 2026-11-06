// Public, publisher-provided illustrations only. Never add customer uploads here.
export const FLASHCARD_CATALOG: Record<string, readonly string[]> = {
  animals: ["cat","dog","bird","fish","elephant","lion","giraffe","monkey","rabbit","horse"],
  numbers: ["one","two","three","four","five","six","seven","eight","nine","ten"],
  colors: ["red","blue","green","yellow","orange","purple","pink","white"],
  shapes: ["circle","square","triangle","rectangle","star","heart","diamond","oval"],
  fruits: ["apple","banana","orange","strawberry","mango","grapes","watermelon","pineapple"],
  vegetables: ["carrot","broccoli","tomato","potato","onion","corn","pea","mushroom"],
  weather: ["sunny","cloudy","rainy","snowy","windy","stormy","foggy","rainbow"],
  body: ["head","eyes","nose","mouth","ears","hands","feet","arms"],
  classroom: ["pencil","book","ruler","eraser","scissors","bag","desk","chair"],
  transport: ["car","bus","airplane","boat","bicycle","train","truck","helicopter"],
  clothes: ["shirt","pants","dress","shoes","hat","jacket","socks","gloves"],
  actions: ["run","jump","eat","sleep","read","write","sing","dance"],
  days: ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"],
  food: ["bread","milk","egg","juice","rice","soup","cheese","pizza"],
};

export function publicFlashcard(set: unknown, word: unknown): boolean {
  return typeof set === "string" && typeof word === "string" &&
    Object.hasOwn(FLASHCARD_CATALOG, set) && FLASHCARD_CATALOG[set].includes(word);
}
