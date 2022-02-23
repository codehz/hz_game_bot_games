export type BuilderUnion<T extends Record<string, (...args: any) => any>> =
  ReturnType<T[keyof T]>;

export type PickByType<T, Value> = {
  [P in keyof T as T[P] extends Value ? P : never]: T[P];
};

export type UpdateMapped<T> = {
  [P in keyof T]: (old: T[P], raw: T) => T[P];
};
