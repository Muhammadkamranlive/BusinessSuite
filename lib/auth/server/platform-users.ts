import { DEMO_PASSWORD } from "@/lib/auth/constants";
import { roleKeyFromName, roleNameFromKey } from "@/lib/auth/server/role-map";
import { validatePassword } from "@/lib/auth/server/password-policy";
import type { RoleKey } from "@/lib/permissions";
import { getSupabaseAdminClient, getSupabaseAuthClient, hasSecretKey } from "@/lib/supabase/server";
import { toDbTenantId, toUiTenantId } from "@/lib/tenants/ids";

export type ServerUserProfile = {
  id: string;
  email: string;
  name: string;
  role: RoleKey;
  title: string;
  tenantId: string;
  status: "active" | "invited" | "blocked";
  phone?: string;
  authUserId?: string | null;
};

function mapProfile(row: {
  id: string;
  email: string;
  full_name: string;
  job_title: string | null;
  tenant_id: string;
  status: string;
  phone: string | null;
  auth_user_id: string | null;
}): ServerUserProfile {
  const role = roleKeyFromName(row.job_title ?? "viewer");
  return {
    id: row.id,
    email: row.email.toLowerCase(),
    name: row.full_name,
    role,
    title: row.job_title ?? roleNameFromKey(role),
    tenantId: toUiTenantId(row.tenant_id),
    status: row.status as ServerUserProfile["status"],
    phone: row.phone ?? undefined,
    authUserId: row.auth_user_id
  };
}

export function isServerAuthEnabled() {
  return hasSecretKey();
}

export async function ensureAuthUser(email: string, password: string, name: string) {
  const admin = getSupabaseAdminClient();
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
  if (listed.error) throw new Error(listed.error.message);

  const existing = listed.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    return existing.id;
  }

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name }
  });
  if (created.error) throw new Error(created.error.message);
  return created.data.user.id;
}

export async function signInWithEmailPassword(email: string, password: string) {
  const authClient = getSupabaseAuthClient();
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function findProfileByEmail(email: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .select("id, email, full_name, job_title, tenant_id, status, phone, auth_user_id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapProfile(data);
}

export async function listProfilesForTenant(tenantSlug: string) {
  const admin = getSupabaseAdminClient();
  const tenantId = toDbTenantId(tenantSlug);
  const { data, error } = await admin
    .from("user_profiles")
    .select("id, email, full_name, job_title, tenant_id, status, phone, auth_user_id")
    .eq("tenant_id", tenantId)
    .order("full_name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapProfile(row));
}

export async function listMembershipsByEmailServer(email: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_profiles")
    .select("id, email, full_name, job_title, tenant_id, status, phone, auth_user_id")
    .eq("email", email.toLowerCase());

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapProfile(row));
}

async function findRoleId(tenantId: string, roleKey: RoleKey) {
  const admin = getSupabaseAdminClient();
  const roleName = roleNameFromKey(roleKey);
  const { data, error } = await admin
    .from("roles")
    .select("id")
    .eq("tenant_id", tenantId)
    .ilike("name", roleName)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.id) return data.id as string;

  const { data: created, error: createErr } = await admin
    .from("roles")
    .insert({ tenant_id: tenantId, name: roleName, description: roleName, is_system_role: false })
    .select("id")
    .single();
  if (createErr) throw new Error(createErr.message);
  return created.id as string;
}

export async function invitePlatformUser(input: {
  name: string;
  email: string;
  role: RoleKey;
  title?: string;
  tenantId: string;
  password: string;
}) {
  if (input.role === "super_admin") {
    throw new Error("Super Admin is the platform operator role. It is not assigned inside a company package.");
  }

  const email = input.email.trim().toLowerCase();
  const tenantUuid = toDbTenantId(input.tenantId);
  const admin = getSupabaseAdminClient();

  const { data: existing } = await admin
    .from("user_profiles")
    .select("id")
    .eq("email", email)
    .eq("tenant_id", tenantUuid)
    .maybeSingle();

  if (existing) throw new Error("This email is already a user in this company.");

  const password = input.password.trim();
  const policyCheck = validatePassword(password);
  if (!policyCheck.ok) throw new Error(policyCheck.error);

  const authUserId = await ensureAuthUser(email, password, input.name.trim());
  const title = roleNameFromKey(input.role);

  const { data: profile, error: profileErr } = await admin
    .from("user_profiles")
    .insert({
      auth_user_id: authUserId,
      tenant_id: tenantUuid,
      full_name: input.name.trim(),
      email,
      job_title: input.title?.trim() || title,
      status: "active"
    })
    .select("id, email, full_name, job_title, tenant_id, status, phone, auth_user_id")
    .single();

  if (profileErr) throw new Error(profileErr.message);

  const roleId = await findRoleId(tenantUuid, input.role);
  const { error: urErr } = await admin.from("user_roles").insert({
    tenant_id: tenantUuid,
    user_profile_id: profile.id,
    role_id: roleId
  });
  if (urErr) throw new Error(urErr.message);

  return {
    ...mapProfile(profile),
    role: input.role,
    title: input.title?.trim() || title
  };
}

/** Login: Supabase Auth + profile lookup. Creates auth user for seeded profiles on first login. */
export async function loginPlatformUser(email: string, password: string) {
  const addr = email.trim().toLowerCase();
  let profile = await findProfileByEmail(addr);

  if (!profile && addr.endsWith("@demo.com")) {
    throw new Error("No account found for this email.");
  }

  try {
    await signInWithEmailPassword(addr, password);
  } catch (firstErr) {
    if (!profile) throw firstErr instanceof Error ? firstErr : new Error("Login failed.");

    const authUserId = await ensureAuthUser(addr, password, profile.name);
    await getSupabaseAdminClient()
      .from("user_profiles")
      .update({ auth_user_id: authUserId })
      .eq("id", profile.id);

    profile = { ...profile, authUserId };
    await signInWithEmailPassword(addr, password);
  }

  if (!profile) {
    profile = await findProfileByEmail(addr);
  }
  if (!profile) throw new Error("No account found for this email.");
  if (profile.status === "blocked") throw new Error("This account is blocked. Contact an administrator.");

  return profile;
}

export async function bootstrapDemoAuthUsers() {
  if (!hasSecretKey()) return { ok: false as const, reason: "no_secret" };

  const admin = getSupabaseAdminClient();
  const demos: Array<{ email: string; name: string; role: RoleKey; title: string; tenant: string }> = [
    { email: "admin@demo.com", name: "Ayesha Khan", role: "super_admin", title: "Super Admin", tenant: "alpha" },
    { email: "manager@demo.com", name: "Omar Farooq", role: "company_admin", title: "Company Admin", tenant: "alpha" },
    { email: "hr@demo.com", name: "Sana Malik", role: "hr_manager", title: "HR Manager", tenant: "alpha" },
    { email: "sales@demo.com", name: "Bilal Ahmed", role: "sales_manager", title: "Sales Manager", tenant: "alpha" },
    { email: "warehouse@demo.com", name: "Nadia Raza", role: "warehouse_manager", title: "Warehouse Manager", tenant: "alpha" },
    { email: "finance@demo.com", name: "Mariam Ali", role: "finance_manager", title: "Finance Manager", tenant: "alpha" },
    { email: "viewer@demo.com", name: "Imran Shah", role: "viewer", title: "Viewer", tenant: "alpha" },
    { email: "employee@demo.com", name: "Hassan Tariq", role: "employee", title: "Employee", tenant: "alpha" }
  ];

  for (const d of demos) {
    const existing = await findProfileByEmail(d.email);
    if (!existing) continue;
    try {
      await ensureAuthUser(d.email, DEMO_PASSWORD, d.name);
    } catch {
      /* ignore individual bootstrap failures */
    }
  }

  return { ok: true as const };
}

/**
 * De-provision a platform user: block profile, revoke Supabase Auth sessions.
 * Uses global sign-out + optional ban to invalidate refresh tokens.
 */
export async function deprovisionPlatformUser(profileId: string, actorEmail: string) {
  const admin = getSupabaseAdminClient();
  const { data: profile, error: fetchErr } = await admin
    .from("user_profiles")
    .select("id, email, auth_user_id, status")
    .eq("id", profileId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!profile) throw new Error("User profile not found.");

  const patch: Record<string, unknown> = {
    status: "blocked",
    updated_at: new Date().toISOString()
  };
  let updateResult = await admin
    .from("user_profiles")
    .update({ ...patch, deprovisioned_at: new Date().toISOString() })
    .eq("id", profileId);
  if (updateResult.error?.message?.includes("deprovisioned_at")) {
    updateResult = await admin.from("user_profiles").update(patch).eq("id", profileId);
  }
  if (updateResult.error) throw new Error(updateResult.error.message);

  const authUserId = profile.auth_user_id as string | null;
  if (authUserId) {
    try {
      await admin.auth.admin.signOut(authUserId, "global");
    } catch {
      /* signOut may fail on older SDK — fall through to ban */
    }
    try {
      await admin.auth.admin.updateUserById(authUserId, { ban_duration: "876600h" });
    } catch {
      /* ban optional */
    }
  }

  return {
    profileId: profile.id as string,
    email: (profile.email as string).toLowerCase(),
    actorEmail,
    authRevoked: Boolean(authUserId)
  };
}
