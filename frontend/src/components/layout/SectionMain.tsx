import React from "react";

/** Khung `<main>` thống nhất cho các trang nội dung (header, banner và tab đáy nằm ở root layout). */
export function SectionMain({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {children}
    </main>
  );
}
