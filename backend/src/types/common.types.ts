export type ServiceResult<T> = {
  success: true;
  data: T;
};

export type JsonRecord = Record<string, unknown>;