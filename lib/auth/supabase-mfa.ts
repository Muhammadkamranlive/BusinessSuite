import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function isSupabaseAuthEnabled() {
  return isSupabaseConfigured();
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOutSupabase() {
  if (!isSupabaseConfigured()) return;
  await getSupabaseClient().auth.signOut();
}

export async function getSupabaseSession() {
  if (!isSupabaseConfigured()) return null;
  const { data } = await getSupabaseClient().auth.getSession();
  return data.session;
}

export async function listMfaFactors() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error(error.message);
  return data;
}

export async function enrollTotp(friendlyName = "BusinessSuite Authenticator") {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function challengeAndVerifyTotp(factorId: string, code: string) {
  const supabase = getSupabaseClient();
  const challenge = await supabase.auth.mfa.challenge({ factorId });
  if (challenge.error) throw new Error(challenge.error.message);
  const verify = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code
  });
  if (verify.error) throw new Error(verify.error.message);
  return verify.data;
}

export async function unenrollFactor(factorId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw new Error(error.message);
}

/** Returns true when AAL2 (MFA completed) is required but session is only AAL1. */
export async function needsMfaChallenge() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return false;
  return data.currentLevel === "aal1" && data.nextLevel === "aal2";
}
