import React from "react";

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="w-full max-w-[460px]">
        <div className="text-center mb-8">
          <p className="font-serif text-[28px] font-semibold text-ink tracking-tight">Forgeday</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-faint">Personal OS</p>
          <h1 className="mt-6 font-serif text-[22px] font-semibold text-ink">{title}</h1>
          {subtitle && <p className="text-caption mt-2 text-sm">{subtitle}</p>}
        </div>
        <div className="editorial-card p-6">
          {children}
        </div>
        {footer && (
          <div className="text-center text-sm text-caption mt-6">{footer}</div>
        )}
      </div>
    </div>
  );
}
