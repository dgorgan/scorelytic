function toCamel<T = any>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map(toCamel) as any;
  }
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        toCamel(v)
      ])
    ) as T;
  }
  return obj;
}

function toSnake<T = any>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map(toSnake) as any;
  }
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`),
        toSnake(v)
      ])
    ) as T;
  }
  return obj;
}

export { toCamel, toSnake }; 