"use client";

import { CATEGORY_GROUPS } from "@/lib/categories";

export default function CategorySelect({
  value,
  onChange,
  includeAll = false,
  allLabel = "All categories",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  includeAll?: boolean;
  allLabel?: string;
  className?: string;
}) {
  return (
    <select
      className={className || "rounded-xl border px-4 py-3"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {includeAll && <option value="__all__">{allLabel}</option>}
      {CATEGORY_GROUPS.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
