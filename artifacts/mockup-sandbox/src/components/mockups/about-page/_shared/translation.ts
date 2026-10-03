import content from "./content.json";
export function useTranslation() { return { t: (key: string) => key.split(".").reduce((value: any, part) => value?.[part], content as any) ?? key }; }
