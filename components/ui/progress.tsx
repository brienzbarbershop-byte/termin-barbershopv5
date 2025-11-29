"use client";
import React from "react";

export default function Progress({ value, indicatorColor, className }: Readonly<{ value?: number; indicatorColor?: string; className?: string }>) {
  const v = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  return (
    <div className={className ? className : "h-2 w-full bg-neutral-800 rounded"}>
      <div className="h-2 rounded" style={{ width: `${v}%`, backgroundColor: indicatorColor ?? "#C5A059" }} />
    </div>
  );
}
