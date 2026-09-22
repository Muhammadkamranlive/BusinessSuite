"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Calendar, FileText, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { useConfirm } from "@/components/common/use-confirm";
import { ActionCard, Button, Field, Panel, SectionHeader, SelectInput, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import {
  createMessageThread,
  pullHmsClinicalFromSupabase,
  sendMessage,
  subscribeHmsClinical
} from "@/modules/healthcare/services/hms-clinical.store";
import { listInvoices, listPatients, pullHmsFromSupabase, subscribeHms } from "@/modules/healthcare/services/hms.store";

export default function HmsPatientPortalPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const { askSave, dialog } = useConfirm();
  const [patients, setPatients] = useState(listPatients(tenantId));
  const [patientId, setPatientId] = useState("");
  const [threadSubject, setThreadSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [bookForm, setBookForm] = useState({ doctor_name: "", department: "General", scheduled_at: "" });
  const [bookMsg, setBookMsg] = useState("");
  const [bookBusy, setBookBusy] = useState(false);

  function refresh() {
    setPatients(listPatients(tenantId));
  }
  useEffect(() => {
    void pullHmsClinicalFromSupabase(tenantId).finally(() => refresh());
    void pullHmsFromSupabase(tenantId).finally(() => refresh());
    const u1 = subscribeHmsClinical(() => refresh());
    const u2 = subscribeHms(() => refresh());
    return () => {
      u1();
      u2();
    };
  }, [tenantId]);

  useEffect(() => {
    if (!patientId && patients[0]) setPatientId(patients[0].id);
  }, [patients, patientId]);

  const patient = patients.find((p) => p.id === patientId);
  const invoices = patient ? listInvoices(tenantId).filter((i) => i.patient_id === patient.id).slice(0, 5) : [];

  async function doBookAppointment() {
    if (!patient || !bookForm.scheduled_at) return;
    setBookBusy(true);
    setBookMsg("");
    try {
      const res = await fetch("/api/healthcare/portal-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          patient_id: patient.id,
          doctor_name: bookForm.doctor_name || null,
          department: bookForm.department || null,
          scheduled_at: bookForm.scheduled_at
        })
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; approved?: boolean };
      if (!res.ok || !data.ok) {
        setBookMsg(data.error ?? "Booking not approved. Try again later.");
        return;
      }
      const { createAppointment } = await import("@/modules/healthcare/services/hms.store");
      createAppointment(tenantId, {
        patient_id: patient.id,
        patient_name: patient.full_name,
        doctor_name: bookForm.doctor_name || "Unassigned",
        department: bookForm.department || null,
        scheduled_at: bookForm.scheduled_at,
        status: "scheduled",
        cancel_reason: null,
        notes: "Portal self-service booking",
        created_by: "patient_portal"
      });
      setBookForm({ doctor_name: "", department: "General", scheduled_at: "" });
      setBookMsg("Appointment request submitted.");
      refresh();
    } catch {
      setBookMsg("Booking failed.");
    } finally {
      setBookBusy(false);
    }
  }

  function doCreateThread() {
    if (!threadSubject.trim() || !messageBody.trim() || !patient) return;
    const thread = createMessageThread(tenantId, {
      subject: threadSubject.trim(),
      participant_emails: [patient.email ?? "patient@portal.local", "care@hospital.local"]
    });
    sendMessage(tenantId, {
      thread_id: thread.id,
      sender_email: patient.email ?? "patient@portal.local",
      body: messageBody.trim()
    });
    setThreadSubject("");
    setMessageBody("");
  }

  return (
    <AppShell activeModule="healthcare">
      {dialog}
      <ModuleBreadcrumbs />
      <PageHeader
        title="Patient portal (Phase 1 stub)"
        description="Self-service shortcuts — book OPD, view invoices, message care team."
      />
      <Field label="Acting as patient" className="mb-4 max-w-md">
        <SelectInput value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.mrn} · {p.full_name}
            </option>
          ))}
        </SelectInput>
      </Field>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <ActionCard href="/healthcare/opd" title="Book OPD visit" detail="Opens clinic queue registration" icon={Calendar} />
        <ActionCard href="/healthcare/billing" title="View invoices" detail="Clinical billing & payments" icon={FileText} />
        <ActionCard href="/healthcare/notifications" title="Notifications" detail="Prefs and message threads" icon={MessageSquare} />
      </div>
      <Panel className="mb-4">
        <SectionHeader title="Book appointment" eyebrow="Rate-limited portal booking" />
        {bookMsg ? <p className="mt-2 text-sm text-slate-600">{bookMsg}</p> : null}
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            askSave({ editing: false, entityLabel: "portal appointment", onConfirm: () => void doBookAppointment() });
          }}
        >
          <Field label="Doctor (optional)">
            <TextInput value={bookForm.doctor_name} onChange={(e) => setBookForm({ ...bookForm, doctor_name: e.target.value })} />
          </Field>
          <Field label="Department">
            <TextInput value={bookForm.department} onChange={(e) => setBookForm({ ...bookForm, department: e.target.value })} />
          </Field>
          <Field label="Preferred date/time" className="md:col-span-2">
            <TextInput
              type="datetime-local"
              required
              value={bookForm.scheduled_at}
              onChange={(e) => setBookForm({ ...bookForm, scheduled_at: e.target.value })}
            />
          </Field>
          <div className="md:col-span-2">
            <Button type="submit" disabled={bookBusy || !patient}>
              Request appointment
            </Button>
          </div>
        </form>
      </Panel>
      <Panel className="mb-4">
        <SectionHeader title="My invoices (stub)" eyebrow={patient ? `MRN ${patient.mrn}` : ""} />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-3 py-2">Invoice</th>
                <th>Date</th>
                <th>Status</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length ? (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-line">
                    <td className="px-3 py-3 font-semibold">{inv.invoice_no}</td>
                    <td>{inv.invoice_date}</td>
                    <td>{inv.status}</td>
                    <td>{inv.total_amount - inv.paid_amount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-slate-500">
                    No invoices for this patient.{" "}
                    <Link href="/healthcare/billing" className="text-teal underline">
                      Go to billing
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel>
        <SectionHeader title="Message care team" eyebrow="Creates thread in Notifications" />
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            askSave({ editing: false, entityLabel: "portal message", onConfirm: doCreateThread });
          }}
        >
          <Field label="Subject" className="md:col-span-2">
            <TextInput required value={threadSubject} onChange={(e) => setThreadSubject(e.target.value)} />
          </Field>
          <Field label="Message" className="md:col-span-2">
            <TextInput required value={messageBody} onChange={(e) => setMessageBody(e.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <Button type="submit">Send message</Button>
          </div>
        </form>
      </Panel>
    </AppShell>
  );
}
