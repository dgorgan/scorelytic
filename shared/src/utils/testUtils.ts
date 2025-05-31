export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};
