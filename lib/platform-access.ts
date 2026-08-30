/** Menus only the platform Super Admin may use — never a customer package. */
export const SUPER_ADMIN_ONLY_MENU_IDS = [
  "settings.companies_tenants",
  "settings.blogs",
  "settings.menus_pages",
  "settings.subscription_packages"
] as const;

export function isSuperAdminRole(role: string) {
  return role === "super_admin";
}

export function isPlatformOnlyMenu(menuId: string) {
  return (SUPER_ADMIN_ONLY_MENU_IDS as readonly string[]).includes(menuId);
}
