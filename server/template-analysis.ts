import { z } from "zod";

const label = z.string().trim().min(1).max(500);
const point = z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) });
const analysis = z.object({
  schoolName: z.string().max(500).optional(),
  className: z.string().max(500).optional(),
  teacherName: z.string().max(500).optional(),
  period: z.string().max(500).optional(),
  title: z.string().max(500).optional(),
  categories: z.array(label).min(1).max(50),
  ratingScale: z.array(label).min(1).max(20),
  nameField: point.nullable().optional(),
  commentField: point.extend({ w: z.number().positive().max(100) }).nullable().optional(),
  ratings: z.array(z.object({
    category: label,
    positions: z.record(z.string(), point),
  })).max(50).optional(),
});
export function checkedTemplateAnalysis(value: unknown, requirePositions = false) {
  const result = analysis.safeParse(value);
  if (!result.success) throw new Error("The template could not be read reliably. Upload a clearer template or enter its details manually.");
  if (requirePositions && (!result.data.nameField ||
      result.data.categories.some(category => !result.data.ratingScale.every(rating =>
        result.data.ratings?.some(row => row.category === category && row.positions[rating]))))) {
    throw new Error("The template's name or rating fields could not be located reliably. Try a clearer template or create a report manually.");
  }
  return result.data;
}
