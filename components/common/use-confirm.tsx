"use client";

import { useCallback, useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

export type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  onConfirm: () => void;
};

/** Professional ERP confirm gate for create / update / trash / restore / purge. */
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const ask = useCallback((next: ConfirmRequest) => {
    setRequest(next);
  }, []);

  const askSave = useCallback(
    (opts: { editing?: boolean; entityLabel?: string; onConfirm: () => void }) => {
      const label = opts.entityLabel ?? "record";
      setRequest({
        title: opts.editing ? `Update ${label}?` : `Save new ${label}?`,
        message: opts.editing
          ? `Confirm updating this ${label}. Changes are written to the company database and audit log.`
          : `Confirm creating this ${label}. It will be saved for the current company.`,
        confirmLabel: opts.editing ? "Update" : "Save",
        onConfirm: opts.onConfirm
      });
    },
    []
  );

  const askTrash = useCallback((opts: { entityLabel?: string; name?: string; onConfirm: () => void }) => {
    const label = opts.entityLabel ?? "record";
    setRequest({
      title: `Move ${label} to recycle bin?`,
      message: opts.name
        ? `"${opts.name}" will be moved to the recycle bin. You can restore it later.`
        : `This ${label} will be moved to the recycle bin. You can restore it later.`,
      confirmLabel: "Move to trash",
      tone: "danger",
      onConfirm: opts.onConfirm
    });
  }, []);

  const askRestore = useCallback((opts: { entityLabel?: string; name?: string; onConfirm: () => void }) => {
    const label = opts.entityLabel ?? "record";
    setRequest({
      title: `Restore ${label}?`,
      message: opts.name ? `Restore "${opts.name}" back into active records?` : `Restore this ${label} back into active records?`,
      confirmLabel: "Restore",
      onConfirm: opts.onConfirm
    });
  }, []);

  const askPurge = useCallback((opts: { entityLabel?: string; name?: string; onConfirm: () => void }) => {
    const label = opts.entityLabel ?? "record";
    setRequest({
      title: `Permanently delete ${label}?`,
      message: opts.name
        ? `"${opts.name}" will be permanently deleted and cannot be recovered.`
        : `This ${label} will be permanently deleted and cannot be recovered.`,
      confirmLabel: "Delete forever",
      tone: "danger",
      onConfirm: opts.onConfirm
    });
  }, []);

  const dialog = (
    <ConfirmDialog
      open={Boolean(request)}
      title={request?.title ?? ""}
      message={request?.message ?? ""}
      confirmLabel={request?.confirmLabel}
      cancelLabel={request?.cancelLabel}
      tone={request?.tone}
      onCancel={() => setRequest(null)}
      onConfirm={() => {
        const fn = request?.onConfirm;
        setRequest(null);
        fn?.();
      }}
    />
  );

  return { ask, askSave, askTrash, askRestore, askPurge, dialog, clear: () => setRequest(null) };
}
