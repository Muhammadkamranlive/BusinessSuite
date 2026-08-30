import { demoUsers, type DemoUser } from "@/lib/permissions";

export const demoAuth = {
  storageKey: "businesssuite:user",
  tenantKey: "businesssuite:tenant",
  defaultUser: demoUsers.find((u) => u.role === "company_admin") ?? demoUsers[1],
  findUser(email: string | null): DemoUser | undefined {
    return demoUsers.find((user) => user.email === email);
  }
};
