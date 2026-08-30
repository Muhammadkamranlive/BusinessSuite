"use client";

import { MktButton } from "@/components/marketing/mkt-button";
import { Field, TextArea, TextInput } from "@/components/ui";
import { submitContactInquiry } from "@/modules/cms/services/cms.store";
import { useState } from "react";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", message: "" });
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Name, work email, and a short message are required.");
      return;
    }
    submitContactInquiry({
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      message: form.message.trim()
    });
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-[1.5rem] border border-[#e6ebf1] bg-white p-6 shadow-[0_20px_50px_rgba(10,37,64,0.08)] sm:p-8">
        <p className="text-lg font-semibold text-[#0a2540]">Message received</p>
        <p className="mt-2 text-sm leading-6 text-[#425466]">
          Thank you. A specialist will reply within one business day (Eastern Time). If you already subscribe, you can also manage billing from Administration → My company & billing.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-[#e6ebf1] bg-white p-6 shadow-[0_20px_50px_rgba(10,37,64,0.08)] sm:p-8">
      <h2 className="text-lg font-semibold text-[#0a2540]">Request a conversation</h2>
      <p className="mt-1 text-sm text-slate-500">We respond Monday–Friday, 8:00 a.m.–6:00 p.m. ET.</p>
      <form onSubmit={onSubmit} className="mt-5 grid gap-3 sm:grid-cols-2">
        {error ? (
          <p className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        <Field label="Full name">
          <TextInput required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Work email">
          <TextInput required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Company">
          <TextInput value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </Field>
        <Field label="Phone">
          <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1" />
        </Field>
        <Field label="How can we help?" className="sm:col-span-2">
          <TextArea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <MktButton type="submit" className="w-full sm:w-auto">
            Send message
          </MktButton>
        </div>
      </form>
    </div>
  );
}
