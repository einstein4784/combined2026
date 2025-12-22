/**
 * Pagination utility functions
 */

export function parsePaginationParams(searchParams: URLSearchParams | Record<string, string | string[] | undefined>) {
  const getParam = (key: string): string => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) || '';
    }
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] || '' : value || '';
  };

  const page = Math.max(1, parseInt(getParam('page') || '1') || 1);
  const limit = Math.min(100, Math.max(1, parseInt(getParam('limit') || '20') || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function createPaginatedResponse<T>(items: T[], total: number, page: number, limit: number) {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  };
}



