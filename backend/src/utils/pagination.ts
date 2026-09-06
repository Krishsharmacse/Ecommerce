import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_PAGE_LIMIT } from "../lib/constants.js";
import type { PaginationMeta } from "../types/pagination.types.js";

export function parsePagination(input: Record<string, unknown>): { page: number; limit: number; sort: string; order: "asc" | "desc" } {
  const page = Math.max(Number(input.page) || DEFAULT_PAGE, 1);
  const limit = Math.min(Math.max(Number(input.limit) || DEFAULT_LIMIT, 1), MAX_PAGE_LIMIT);
  const order = input.order === "asc" ? "asc" : "desc";
  const sort = typeof input.sort === "string" && /^[a-zA-Z][a-zA-Z0-9_]*$/.test(input.sort) ? input.sort : "createdAt";
  return { page, limit, sort, order };
}

export function paginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}