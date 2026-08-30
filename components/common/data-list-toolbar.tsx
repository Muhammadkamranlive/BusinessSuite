"use client";

import { Download, FileDown } from "lucide-react";
import { Button, SelectInput, TextInput } from "@/components/ui";

export type SortDir = "asc" | "desc";

export type DataListFilterOption = { value: string; label: string };

export function DataListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filterLabel,
  filterValue,
  filterOptions,
  onFilterChange,
  sortLabel,
  sortValue,
  sortOptions,
  onSortChange,
  sortDir,
  onSortDirChange,
  onExportCsv,
  onExportPdf,
  rightSlot
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filterLabel?: string;
  filterValue?: string;
  filterOptions?: DataListFilterOption[];
  onFilterChange?: (value: string) => void;
  sortLabel?: string;
  sortValue?: string;
  sortOptions?: DataListFilterOption[];
  onSortChange?: (value: string) => void;
  sortDir?: SortDir;
  onSortDirChange?: (dir: SortDir) => void;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 w-full flex-1 sm:min-w-[12rem]">
          <TextInput
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search"
          />
        </div>
        {filterOptions && onFilterChange ? (
          <div className="min-w-0 w-full sm:w-auto sm:min-w-[10rem]">
            <SelectInput value={filterValue ?? "all"} onChange={(e) => onFilterChange(e.target.value)} aria-label={filterLabel ?? "Filter"}>
              <option value="all">{filterLabel ? `All ${filterLabel}` : "All"}</option>
              {filterOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectInput>
          </div>
        ) : null}
        {sortOptions && onSortChange ? (
          <div className="flex min-w-0 w-full gap-2 sm:w-auto sm:min-w-[12rem]">
            <SelectInput
              className="min-w-0 flex-1"
              value={sortValue ?? sortOptions[0]?.value}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label={sortLabel ?? "Sort"}
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  Sort: {o.label}
                </option>
              ))}
            </SelectInput>
            {onSortDirChange ? (
              <Button type="button" variant="secondary" className="shrink-0" onClick={() => onSortDirChange(sortDir === "asc" ? "desc" : "asc")}>
                {sortDir === "asc" ? "Asc" : "Desc"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {onExportCsv ? (
          <Button type="button" variant="secondary" className="min-h-11 flex-1 sm:flex-none" onClick={onExportCsv}>
            <Download className="size-4" /> CSV
          </Button>
        ) : null}
        {onExportPdf ? (
          <Button type="button" variant="secondary" className="min-h-11 flex-1 sm:flex-none" onClick={onExportPdf}>
            <FileDown className="size-4" /> PDF
          </Button>
        ) : null}
        {rightSlot}
      </div>
    </div>
  );
}
