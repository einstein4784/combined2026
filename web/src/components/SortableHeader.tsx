import Link from "next/link";

type SortableHeaderProps = {
  field: string;
  currentSort: string;
  currentOrder: number;
  label: string;
  basePath?: string;
  searchParams?: Record<string, string | string[] | undefined>;
};

export function SortableHeader({
  field,
  currentSort,
  currentOrder,
  label,
  basePath = "",
  searchParams = {},
}: SortableHeaderProps) {
  const isActive = currentSort === field;
  const nextOrder = isActive && currentOrder === -1 ? "asc" : "desc";
  
  // Build search params preserving existing params
  const params = new URLSearchParams();
  
  // Preserve existing search params (like q, page, etc.)
  Object.entries(searchParams).forEach(([key, value]) => {
    if (key !== "sortBy" && key !== "sortOrder") {
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, v));
      } else if (value) {
        params.set(key, value);
      }
    }
  });
  
  // Set sort params
  params.set("sortBy", field);
  params.set("sortOrder", nextOrder);
  
  return (
    <Link
      href={`${basePath}?${params.toString()}`}
      className="flex items-center gap-1.5 hover:text-[var(--ic-navy)] cursor-pointer select-none font-medium group"
      title={`Click to sort by ${label} ${nextOrder === "asc" ? "(ascending)" : "(descending)"}`}
    >
      <span className="group-hover:underline">{label}</span>
      {isActive ? (
        <span className="text-[var(--ic-navy)] font-bold text-base" title={`Sorted ${currentOrder === -1 ? "descending" : "ascending"}`}>
          {currentOrder === -1 ? "↓" : "↑"}
        </span>
      ) : (
        <span className="text-[var(--ic-gray-500)] text-sm font-normal opacity-70 group-hover:opacity-100" title="Click to sort">
          ⇅
        </span>
      )}
    </Link>
  );
}

