"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { MktButton } from "@/components/marketing/mkt-button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui";
import { submitContactInquiry } from "@/modules/cms/services/cms.store";

const TOPICS: { value: string; label: string; starter: string }[] = [
  { value: "demo", label: "Book a live demo", starter: "We would like a guided demo of BusinessSuite for our team." },
  {
    value: "dedicated",
    label: "Dedicated cloud / VPS",
    starter: "We are evaluating a dedicated cloud or VPS deployment with our own database and domain."
  },
  {
    value: "self-hosted",
    label: "Self-hosted license",
    starter: "We want to run BusinessSuite with our own hosting provider under a commercial license."
  },
  {
    value: "intranet",
    label: "Intranet / on-premise",
    starter: "We need a fully offline intranet installation inside our facility."
  },
  {
    value: "professional",
    label: "Professional package",
    starter: "Please scope the Professional package (separate database, domain, and stack) for our company."
  },
  { value: "pricing", label: "Pricing & app selection", starter: "Help us choose a package and the right pay-per apps." },
  { value: "support", label: "Existing customer support", starter: "" },
  { value: "other", label: "Something else", starter: "" }
];

function topicFromParam(raw: string | null): string {
  if (!raw) return "demo";
  return TOPICS.some((t) => t.value === raw) ? raw : "other";
}

function ContactFormInner() {
  const params = useSearchParams();
  const initialTopic = topicFromParam(params.get("topic"));
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    topic: initialTopic,
    message: TOPICS.find((t) => t.value === initialTopic)?.starter ?? ""
  });
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const next = topicFromParam(params.get("topic"));
    setForm((f) => {
      if (f.topic === next) return f;
      const starter = TOPICS.find((t) => t.value === next)?.starter ?? "";
      const untouched = !f.message.trim() || TOPICS.some((t) => t.starter === f.message);
      return { ...f, topic: next, message: untouched ? starter : f.message };
    });
  }, [params]);

  function onTopicChange(value: string) {
    const starter = TOPICS.find((t) => t.value === value)?.starter ?? "";
    setForm((f) => {
      const untouched = !f.message.trim() || TOPICS.some((t) => t.starter === f.message);
      return { ...f, topic: value, message: untouched ? starter : f.message };
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Name, work email, and a short message are required.");
      return;
    }
    const topicLabel = TOPICS.find((t) => t.value === form.topic)?.label ?? form.topic;
    submitContactInquiry({
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      message: `[${topicLabel}] ${form.message.trim()}`
    });
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-[1.5rem] border border-[color:var(--bs-line)] bg-white p-6 shadow-[0_20px_50px_rgba(10,37,64,0.08)] sm:p-8">
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-[color:var(--bs-teal)]/10 text-[color:var(--bs-teal)]">
          <CheckCircle2 className="size-6" aria-hidden />
        </span>
        <p className="mt-4 text-lg font-semibold text-[color:var(--bs-ink)]">Message received</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Thank you. A specialist will reply within one business day. If you already subscribe, you can also manage
          billing from Administration → My company &amp; billing.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-[color:var(--bs-line)] bg-white p-6 shadow-[0_20px_50px_rgba(10,37,64,0.08)] sm:p-8">
      <h2 className="text-lg font-semibold text-[color:var(--bs-ink)]">Request a conversation</h2>
      <p className="mt-1 text-sm text-slate-500">We reply within one business day and schedule demos at your local time.</p>
      <form onSubmit={onSubmit} className="mt-5 grid gap-3 sm:grid-cols-2">
        {error ? (
          <p className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
            {error}
          </p>
        ) : null}
        <Field label="What is this about?" className="sm:col-span-2">
          <SelectInput value={form.topic} onChange={(e) => onTopicChange(e.target.value)}>
            {TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Full name">
          <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
        </Field>
        <Field label="Work email">
          <TextInput
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />
        </Field>
        <Field label="Company">
          <TextInput value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} autoComplete="organization" />
        </Field>
        <Field label="Phone (optional)">
          <TextInput
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Include country code"
            autoComplete="tel"
          />
        </Field>
        <Field label="How can we help?" className="sm:col-span-2">
          <TextArea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </Field>
        <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <MktButton type="submit" className="w-full sm:w-auto">
            Send message
          </MktButton>
          <p className="text-xs text-slate-400">No spam. We only use this to reply to your request.</p>
        </div>
      </form>
    </div>
  );
}

export function ContactForm() {
  return (
    <Suspense fallback={<div className="h-96 rounded-[1.5rem] border border-[color:var(--bs-line)] bg-white/70" aria-busy="true" />}>
      <ContactFormInner />
    </Suspense>
  );
}
