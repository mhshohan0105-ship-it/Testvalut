export type SectionItem = { id: string; parentId: string | null; name: string; order: number };
export type FlatSection = { item: SectionItem; depth: number; hasChildren: boolean };

function childrenOf(items: SectionItem[], parentId: string | null) {
  return items
    .filter((item) => item.parentId === parentId)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** Depth-first list of the tree. Children of ids in `collapsed` are left out. */
export function flattenSections(items: SectionItem[], collapsed: ReadonlySet<string> = new Set()) {
  const result: FlatSection[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const item of childrenOf(items, parentId)) {
      const hasChildren = items.some((other) => other.parentId === item.id);
      result.push({ item, depth, hasChildren });
      if (!collapsed.has(item.id)) walk(item.id, depth + 1);
    }
  };
  walk(null, 0);
  return result;
}

/** The section's id and the ids of everything nested under it. */
export function sectionSubtreeIds(items: SectionItem[], id: string) {
  const ids = [id];
  for (let index = 0; index < ids.length; index++) {
    for (const item of items) if (item.parentId === ids[index]) ids.push(item.id);
  }
  return ids;
}

export function sectionPath(items: SectionItem[], id: string) {
  const parts: string[] = [];
  let current = items.find((item) => item.id === id);
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? items.find((item) => item.id === current?.parentId) : undefined;
  }
  return parts.join(" > ");
}

/** Options for a section picker, indented to show nesting. */
export function sectionOptions(items: SectionItem[]) {
  return flattenSections(items).map(({ item, depth }) => ({ id: item.id, label: `${"   ".repeat(depth)}${item.name}` }));
}

/** Moves a section and renumbers its old and new siblings. Used for the optimistic UI and on the server. */
export function moveSectionInList(items: SectionItem[], id: string, parentId: string | null, index: number) {
  const moving = items.find((item) => item.id === id);
  if (!moving) return items;

  const siblings = childrenOf(items, parentId).filter((item) => item.id !== id);
  const clamped = Math.max(0, Math.min(index, siblings.length));
  siblings.splice(clamped, 0, { ...moving, parentId });
  const newOrders = new Map(siblings.map((item, order) => [item.id, order]));

  const oldSiblings = moving.parentId === parentId ? [] : childrenOf(items, moving.parentId).filter((item) => item.id !== id);
  oldSiblings.forEach((item, order) => newOrders.set(item.id, order));

  return items.map((item) => {
    const order = newOrders.get(item.id);
    if (order === undefined) return item;
    return { ...item, order, parentId: item.id === id ? parentId : item.parentId };
  });
}
