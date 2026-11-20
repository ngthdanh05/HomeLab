// eslint-disable-next-line @typescript-eslint/no-require-imports -- file cấu hình CommonJS
const defaultTheme = require("tailwindcss/defaultTheme");

/** Màu theo vai trò, đọc từ CSS variables (kênh RGB) trong src/app/globals.css. */
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

/**
 * Khoảng cách theo bậc 4px: bỏ các bậc lẻ 2px của Tailwind (0.5, 1.5, 2.5, 3.5).
 * Giữ `px` (1px) cho đường kẻ.
 */
const spacing = Object.fromEntries(
  Object.entries(defaultTheme.spacing).filter(([key]) => !["0.5", "1.5", "2.5", "3.5"].includes(key)),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],

  theme: {
    // Thay hẳn bảng màu mặc định: class kiểu `bg-slate-900`, `text-emerald-400` không còn tồn tại.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      inherit: "inherit",
      white: "#FFFFFF",
      black: "#000000",
      bg: token("bg"),
      surface: token("surface"),
      border: {
        DEFAULT: token("border"),
        strong: token("border-strong"),
      },
      text: {
        DEFAULT: token("text"),
        muted: token("text-muted"),
      },
      primary: {
        DEFAULT: token("primary"),
        hover: token("primary-hover"),
        soft: token("primary-soft"),
      },
      accent: {
        DEFAULT: token("accent"),
        strong: token("accent-strong"),
        soft: token("accent-soft"),
      },
      warning: { DEFAULT: token("warning"), soft: token("warning-soft") },
      danger: { DEFAULT: token("danger"), soft: token("danger-soft") },
      info: { DEFAULT: token("info"), soft: token("info-soft") },
    },

    // Chỉ 3 mức bo góc: 8px (ô nhập, nhãn) · 12px (nút, thẻ nhỏ) · 20px (thẻ lớn, modal).
    borderRadius: {
      none: "0",
      sm: "8px",
      md: "12px",
      lg: "20px",
      full: "9999px",
    },

    spacing,

    extend: {
      fontFamily: {
        sans: ["var(--font-be-vietnam-pro)", "Arial", "sans-serif"],
      },

      boxShadow: {
        // Bóng nhẹ cho lớp nổi (modal, toast, menu); thẻ thường chỉ dùng viền.
        overlay: "0 12px 32px -8px rgb(var(--color-text) / 0.18)",
      },

      animation: {
        float: "float 6s ease-in-out infinite",
        "fade-in": "fade-in 0.25s ease-out",
      },

      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },

  plugins: [],
};
