import Link from "next/link";

type Props = {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  searchParams?: Record<string, string | string[] | undefined>;
};

export function Pagination({ currentPage, totalPages, baseUrl, searchParams = {} }: Props) {
  if (totalPages <= 1) return null;

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key === "page") return; // Skip page param, we'll add it below
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, v));
      } else if (value) {
        params.set(key, value);
      }
    });
    params.set("page", String(page));
    return `${baseUrl}?${params.toString()}`;
  };

  const pages = [];
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <Link
        href={buildUrl(currentPage - 1)}
        className={`px-3 py-2 rounded-md border text-sm ${
          currentPage === 1
            ? "border-[var(--ic-gray-200)] text-[var(--ic-gray-400)] cursor-not-allowed pointer-events-none"
            : "border-[var(--ic-gray-300)] text-[var(--ic-navy)] hover:bg-[var(--ic-gray-50)]"
        }`}
        aria-disabled={currentPage === 1}
      >
        Previous
      </Link>

      {startPage > 1 && (
        <>
          <Link
            href={buildUrl(1)}
            className={`px-3 py-2 rounded-md border text-sm ${
              currentPage === 1
                ? "border-[var(--ic-navy)] bg-[var(--ic-navy)] text-white"
                : "border-[var(--ic-gray-300)] text-[var(--ic-navy)] hover:bg-[var(--ic-gray-50)]"
            }`}
          >
            1
          </Link>
          {startPage > 2 && <span className="px-2 text-[var(--ic-gray-500)]">...</span>}
        </>
      )}

      {pages.map((page) => (
        <Link
          key={page}
          href={buildUrl(page)}
          className={`px-3 py-2 rounded-md border text-sm ${
            currentPage === page
              ? "border-[var(--ic-navy)] bg-[var(--ic-navy)] text-white"
              : "border-[var(--ic-gray-300)] text-[var(--ic-navy)] hover:bg-[var(--ic-gray-50)]"
          }`}
        >
          {page}
        </Link>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-2 text-[var(--ic-gray-500)]">...</span>}
          <Link
            href={buildUrl(totalPages)}
            className={`px-3 py-2 rounded-md border text-sm ${
              currentPage === totalPages
                ? "border-[var(--ic-navy)] bg-[var(--ic-navy)] text-white"
                : "border-[var(--ic-gray-300)] text-[var(--ic-navy)] hover:bg-[var(--ic-gray-50)]"
            }`}
          >
            {totalPages}
          </Link>
        </>
      )}

      <Link
        href={buildUrl(currentPage + 1)}
        className={`px-3 py-2 rounded-md border text-sm ${
          currentPage === totalPages
            ? "border-[var(--ic-gray-200)] text-[var(--ic-gray-400)] cursor-not-allowed pointer-events-none"
            : "border-[var(--ic-gray-300)] text-[var(--ic-navy)] hover:bg-[var(--ic-gray-50)]"
        }`}
        aria-disabled={currentPage === totalPages}
      >
        Next
      </Link>
    </div>
  );
}






