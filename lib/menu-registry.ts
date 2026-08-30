import { navGroups, type ModuleKey } from "@/lib/permissions";

export type MenuRight = "view" | "create" | "update" | "delete";

export type MenuDefinition = {
  id: string;
  module: ModuleKey;
  label: string;
  href: string;
  keywords: string[];
  parentLabel?: string;
};

/** Flatten every sidebar menu into a searchable, ACL-gated registry. */
export function buildMenuRegistry(): MenuDefinition[] {
  const menus: MenuDefinition[] = [];

  for (const group of navGroups) {
    menus.push({
      id: `${group.key}.root`,
      module: group.key,
      label: group.label,
      href: group.href,
      keywords: [group.label, group.key, "module"],
      parentLabel: undefined
    });

    for (const child of group.children) {
      const slug = child.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      menus.push({
        id: `${group.key}.${slug}`,
        module: group.key,
        label: child.label,
        href: child.href,
        keywords: [child.label, group.label, group.key, child.permission ?? "", slug],
        parentLabel: group.label
      });
    }
  }

  return menus;
}

export const menuRegistry = buildMenuRegistry();

export const menuRights: MenuRight[] = ["view", "create", "update", "delete"];

export const menuRightLabels: Record<MenuRight, string> = {
  view: "View",
  create: "Add",
  update: "Update",
  delete: "Delete"
};

export function getMenuById(id: string) {
  return menuRegistry.find((m) => m.id === id);
}

function pathWithoutHash(href: string) {
  return href.split("#")[0] || href;
}

/** Longest matching registry entry for the current URL (exact path, then nested). */
export function menusMatchingPath(pathname: string) {
  return menuRegistry
    .filter((menu) => {
      const href = pathWithoutHash(menu.href);
      if (!href || href === "/") return pathname === href;
      return pathname === href || pathname.startsWith(`${href}/`);
    })
    .sort((a, b) => pathWithoutHash(b.href).length - pathWithoutHash(a.href).length);
}

export function searchMenus(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return menuRegistry;
  return menuRegistry.filter((m) => {
    const hay = [m.label, m.parentLabel ?? "", m.href, m.module, ...m.keywords].join(" ").toLowerCase();
    return hay.includes(q);
  });
}
