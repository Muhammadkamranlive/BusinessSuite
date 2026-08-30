"use client";

import { Button } from "@/components/ui";

export function RecordRowActions({
  onEdit,
  onTrash,
  editLabel = "Edit",
  trashLabel = "Trash"
}: {
  onEdit?: () => void;
  onTrash?: () => void;
  editLabel?: string;
  trashLabel?: string;
}) {
  if (!onEdit && !onTrash) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {onEdit ? (
        <Button type="button" variant="secondary" className="!min-h-8 !px-3 !text-xs" onClick={onEdit}>
          {editLabel}
        </Button>
      ) : null}
      {onTrash ? (
        <Button type="button" variant="danger" className="!min-h-8 !px-3 !text-xs" onClick={onTrash}>
          {trashLabel}
        </Button>
      ) : null}
    </div>
  );
}
