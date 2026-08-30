"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Briefcase, Building2, Mail, MapPin, MessageSquare, Phone, UserRound } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { initials, presenceLabel, type ChatContact } from "@/modules/chat/services/chat-contact";

function AvatarFace({ contact, size = "md" }: { contact: ChatContact; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <span className={cn("bs-chat-avatar", `bs-chat-avatar-${size}`)}>
      {contact.avatar ? <img src={contact.avatar} alt="" /> : initials(contact.name)}
      <span className={cn("bs-presence", `bs-presence-${contact.presence}`)} aria-hidden />
    </span>
  );
}

export function ContactProfileBody({
  contact,
  onChat,
  compact = false
}: {
  contact: ChatContact;
  onChat?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("min-w-0 px-4", compact ? "pt-2" : "pt-1 pb-4")}>
      <div className="flex items-start gap-3">
        <AvatarFace contact={contact} size={compact ? "lg" : "xl"} />
        <div className="min-w-0 pt-1">
          <p className="truncate text-base font-bold text-ink">{contact.name}</p>
          <p className={cn("text-xs font-semibold", contact.presence === "available" ? "text-emerald-600" : "text-slate-500")}>
            {presenceLabel(contact.presence)}
          </p>
          <p className="mt-1 truncate text-sm text-slate-600">{contact.title}</p>
          {contact.department ? <p className="truncate text-xs text-slate-500">{contact.department}</p> : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {onChat ? (
          <Button type="button" className="!min-h-9 !px-3 !text-xs" onClick={onChat}>
            <MessageSquare className="size-3.5" />
            Chat
          </Button>
        ) : null}
        <Button href={`mailto:${contact.email}`} variant="secondary" className="!min-h-9 !px-3 !text-xs">
          <Mail className="size-3.5" />
          Email
        </Button>
        {contact.phone ? (
          <Button href={`tel:${contact.phone.replace(/\s+/g, "")}`} variant="secondary" className="!min-h-9 !px-3 !text-xs">
            <Phone className="size-3.5" />
            Call
          </Button>
        ) : null}
        {contact.employeeId ? (
          <Button href={`/hrm/employees/${contact.employeeId}`} variant="ghost" className="!min-h-9 !px-3 !text-xs">
            <UserRound className="size-3.5" />
            Full profile
          </Button>
        ) : null}
      </div>

      <div className="mt-4 space-y-2.5 text-sm">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Contact</p>
        <p className="flex items-start gap-2 text-slate-700">
          <Mail className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
          <a className="break-all font-medium text-teal hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a>
        </p>
        {contact.phone ? (
          <p className="flex items-center gap-2 text-slate-700">
            <Phone className="size-3.5 shrink-0 text-slate-400" />
            <a className="font-medium text-teal hover:underline" href={`tel:${contact.phone.replace(/\s+/g, "")}`}>{contact.phone}</a>
          </p>
        ) : null}
        {contact.location ? (
          <p className="flex items-start gap-2 text-slate-700">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
            <span>{contact.location}</span>
          </p>
        ) : null}
        {contact.department || contact.designation ? (
          <>
            <p className="pt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Organization</p>
            {contact.department ? (
              <p className="flex items-center gap-2 text-slate-700">
                <Building2 className="size-3.5 shrink-0 text-slate-400" />
                {contact.department}
              </p>
            ) : null}
            {contact.designation ? (
              <p className="flex items-center gap-2 text-slate-700">
                <Briefcase className="size-3.5 shrink-0 text-slate-400" />
                {contact.designation}
              </p>
            ) : null}
            {contact.managerName ? (
              <p className="text-slate-600">Reports to <span className="font-semibold text-ink">{contact.managerName}</span></p>
            ) : null}
            {contact.employeeNo ? <p className="text-xs text-slate-500">Employee {contact.employeeNo}</p> : null}
          </>
        ) : null}
        {contact.bio ? <p className="pt-1 text-sm leading-6 text-slate-600">{contact.bio}</p> : null}
      </div>
    </div>
  );
}

export function PersonaHover({
  contact,
  onChat,
  children,
  className
}: {
  contact: ChatContact;
  onChat?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const cardId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<number>(0);
  const closeTimer = useRef<number>(0);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      window.clearTimeout(openTimer.current);
      window.clearTimeout(closeTimer.current);
    };
  }, []);

  function place() {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = 22.5 * 16;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    const below = r.bottom + 8;
    const estimated = 420;
    const top = below + estimated > window.innerHeight - 8 ? Math.max(8, r.top - estimated - 8) : below;
    setCoords({ top, left });
  }

  function scheduleOpen() {
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => {
      place();
      setOpen(true);
    }, 280);
  }

  function scheduleClose() {
    window.clearTimeout(openTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 180);
  }

  function toggle() {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    if (open) {
      setOpen(false);
      return;
    }
    place();
    setOpen(true);
  }

  return (
    <>
      <span
        ref={wrapRef}
        className={cn("inline-flex", className)}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={scheduleOpen}
        onBlur={scheduleClose}
      >
        <button
          type="button"
          className="bs-persona-hit"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? cardId : undefined}
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
        >
          {children}
        </button>
      </span>
      {mounted && open
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[79] bg-black/20 md:bg-transparent"
                aria-label="Close profile card"
                onClick={() => setOpen(false)}
              />
              <div
                ref={cardRef}
                id={cardId}
                role="dialog"
                aria-label={`${contact.name} profile`}
                className="bs-persona-card"
                style={{ top: coords.top, left: coords.left }}
                onMouseEnter={() => {
                  window.clearTimeout(closeTimer.current);
                }}
                onMouseLeave={scheduleClose}
              >
                <div className="bs-persona-banner" />
                <ContactProfileBody
                  contact={contact}
                  compact
                  onChat={
                    onChat
                      ? () => {
                          setOpen(false);
                          onChat();
                        }
                      : undefined
                  }
                />
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}

export function ChatPerson({
  contact,
  size = "md",
  onChat
}: {
  contact: ChatContact;
  size?: "sm" | "md" | "lg";
  onChat?: () => void;
}) {
  return (
    <PersonaHover contact={contact} onChat={onChat}>
      <AvatarFace contact={contact} size={size} />
    </PersonaHover>
  );
}
