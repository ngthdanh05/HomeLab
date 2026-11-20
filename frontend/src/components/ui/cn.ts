/** Ghép class Tailwind, bỏ qua giá trị rỗng/false. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
