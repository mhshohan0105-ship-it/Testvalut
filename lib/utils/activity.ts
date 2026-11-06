type ActivityEntry = { action: string; entityType: string; meta: unknown };

/** Turns a log row into the words after the person's name, such as "failed C12 Checkout total". */
export function describeActivity({ action, entityType, meta }: ActivityEntry) {
  const { name, count } = (typeof meta === "object" && meta !== null ? meta : {}) as { name?: unknown; count?: unknown };
  const parts: string[] = [action];
  if (typeof count === "number" && entityType === "case") parts.push(`${count} ${count === 1 ? "case" : "cases"}`);
  else if (entityType !== "case" && entityType !== "member") parts.push(entityType);
  if (typeof name === "string") parts.push(name);
  if (typeof count === "number" && entityType !== "case") parts.push(`(${count} ${count === 1 ? "case" : "cases"})`);
  return parts.join(" ");
}
