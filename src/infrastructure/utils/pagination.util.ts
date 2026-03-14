export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  links?: Record<string, string>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class PaginationUtil {
  static createPagination(options: PaginationOptions): PaginationMeta {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    return {
      page,
      limit,
      total: 0, // To be set by caller
      totalPages: 0, // To be calculated by caller
      hasNext: false, // To be calculated by caller
      hasPrev: page > 1,
    };
  }

  static createResult<T>(
    data: T[],
    total: number,
    options: PaginationOptions
  ): PaginationResult<T> {
    const { page, limit } = options;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  static validatePagination(options: PaginationOptions): PaginationOptions {
    const { page, limit } = options;

    // Ensure page is at least 1
    const validPage = Math.max(1, page);

    // Ensure limit is between 1 and 100
    const validLimit = Math.min(100, Math.max(1, limit));

    return {
      page: validPage,
      limit: validLimit,
    };
  }

  static getPrismaQuery(options: PaginationOptions) {
    const { page, limit } = this.validatePagination(options);
    const skip = (page - 1) * limit;

    return {
      skip,
      take: limit,
    };
  }

  static addLinks(result: PaginationResult<any>, baseUrl: string): PaginationResult<any> {
    const { page, limit, totalPages } = result.pagination;

    const links: Record<string, string> = {
      self: `${baseUrl}?page=${page}&limit=${limit}`,
    };

    if (result.pagination.hasPrev) {
      links.prev = `${baseUrl}?page=${page - 1}&limit=${limit}`;
    }

    if (result.pagination.hasNext) {
      links.next = `${baseUrl}?page=${page + 1}&limit=${limit}`;
    }

    links.first = `${baseUrl}?page=1&limit=${limit}`;
    links.last = `${baseUrl}?page=${totalPages}&limit=${limit}`;

    return {
      ...result,
      links,
    };
  }
}
