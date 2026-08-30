"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AdminSubnav } from "@/components/admin/admin-subnav";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import { PageHeader } from "@/components/common/page-header";
import { DataListToolbar } from "@/components/common/data-list-toolbar";
import { StatusBadge } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { ExtraFieldsBlock } from "@/components/forms/extra-fields-block";
import { ExtraFieldsReadout } from "@/components/forms/extra-fields-readout";
import { Button, Field, Panel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { getStoredTenantId } from "@/lib/auth/session";
import { getSessionProfile } from "@/lib/auth/session-profile";
import { exportListCsv, exportListPdf } from "@/lib/list-export";
import { canMenu } from "@/modules/admin/services/acl.store";
import { deleteMenu, deletePage, ensureProductionSiteContent, listMenus, listPages, saveMenu, savePage, type CmsMenu, type CmsPage, type CmsStatus } from "@/modules/cms/services/cms.store";
import { getExtraFieldValues, persistExtraFields } from "@/modules/forms/services/extra-fields.store";

export default function AdminContentMenusPage() {
  const tenantId = getStoredTenantId() ?? "alpha";
  const actor = getSessionProfile();
  const allowed = canMenu(actor.role, actor.email, "settings.menus_pages", "view");
  const { askSave, askTrash, dialog } = useConfirm();
  const [menus, setMenus] = useState<CmsMenu[]>([]);
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string>("");
  const [menuFormOpen, setMenuFormOpen] = useState(false);
  const [pageFormOpen, setPageFormOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<CmsMenu | null>(null);
  const [editingPage, setEditingPage] = useState<CmsPage | null>(null);
  const [error, setError] = useState("");
  const [pageSearch, setPageSearch] = useState("");
  const [extraMenuJson, setExtraMenuJson] = useState("");
  const [extraPageJson, setExtraPageJson] = useState("");

  const [menuForm, setMenuForm] = useState({ label: "", description: "", sortOrder: 1, status: "draft" as CmsStatus });
  const [pageForm, setPageForm] = useState({ title: "", summary: "", content: "", sortOrder: 1, status: "draft" as CmsStatus });

  function refresh() {
    const nextMenus = listMenus(true);
    setMenus(nextMenus);
    const menuId = selectedMenuId || nextMenus[0]?.id || "";
    setSelectedMenuId(menuId);
    setPages(menuId ? listPages(menuId, true) : []);
  }

  useEffect(() => {
    ensureProductionSiteContent();
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPages(selectedMenuId ? listPages(selectedMenuId, true) : []);
  }, [selectedMenuId]);

  const selectedMenu = useMemo(() => menus.find((m) => m.id === selectedMenuId) ?? null, [menus, selectedMenuId]);

  function openCreateMenu() {
    setEditingMenu(null);
    setMenuForm({ label: "", description: "", sortOrder: menus.length + 1, status: "draft" });
    setExtraMenuJson("");
    setMenuFormOpen(true);
    setError("");
  }

  function openEditMenu(menu: CmsMenu) {
    setEditingMenu(menu);
    setMenuForm({ label: menu.label, description: menu.description, sortOrder: menu.sortOrder, status: menu.status });
    setExtraMenuJson(getExtraFieldValues(tenantId, "settings.cms_menu", menu.id));
    setMenuFormOpen(true);
    setError("");
  }

  function doSaveMenu() {
    setError("");
    try {
      const saved = saveMenu({
        id: editingMenu?.id,
        label: menuForm.label,
        description: menuForm.description,
        sortOrder: Number(menuForm.sortOrder) || 1,
        status: menuForm.status
      });
      persistExtraFields(tenantId, "settings.cms_menu", saved.id, extraMenuJson);
      setExtraMenuJson("");
      setMenuFormOpen(false);
      setSelectedMenuId(saved.id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save menu");
    }
  }

  function saveMenuForm(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editingMenu),
      entityLabel: "menu",
      onConfirm: doSaveMenu
    });
  }

  function openCreatePage() {
    if (!selectedMenuId) {
      setError("Create a menu first.");
      return;
    }
    setEditingPage(null);
    setPageForm({ title: "", summary: "", content: "", sortOrder: pages.length + 1, status: "draft" });
    setExtraPageJson("");
    setPageFormOpen(true);
    setError("");
  }

  function openEditPage(page: CmsPage) {
    setEditingPage(page);
    setPageForm({
      title: page.title,
      summary: page.summary,
      content: page.content,
      sortOrder: page.sortOrder,
      status: page.status
    });
    setExtraPageJson(getExtraFieldValues(tenantId, "settings.cms_page", page.id));
    setPageFormOpen(true);
    setError("");
  }

  function doSavePage() {
    setError("");
    try {
      const saved = savePage({
        id: editingPage?.id,
        menuId: selectedMenuId,
        title: pageForm.title,
        summary: pageForm.summary,
        content: pageForm.content,
        sortOrder: Number(pageForm.sortOrder) || 1,
        status: pageForm.status
      });
      persistExtraFields(tenantId, "settings.cms_page", saved.id, extraPageJson);
      setExtraPageJson("");
      setPageFormOpen(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save page");
    }
  }

  function savePageForm(e: React.FormEvent) {
    e.preventDefault();
    askSave({
      editing: Boolean(editingPage),
      entityLabel: "page",
      onConfirm: doSavePage
    });
  }

  const visiblePages = useMemo(() => {
    const q = pageSearch.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p) => [p.title, p.summary, p.content].join(" ").toLowerCase().includes(q));
  }, [pages, pageSearch]);

  if (!allowed) {
    return (
      <AppShell activeModule="settings">
        <AdminSubnav active="/settings/content" />
        <PageHeader title="Menus & Pages" description="Public website menus and pages are platform Super Admin tools. They are not included in a company package." />
      </AppShell>
    );
  }

  return (
    <AppShell activeModule="settings">
      <ModuleBreadcrumbs />
      <PageHeader
        title="Menus & Pages"
        description="Create public menus, then add pages under each menu."
      />
      <AdminSubnav active="/settings/content" />

      {error ? <p className="mb-4 text-sm text-[color:var(--bs-coral)]">{error}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-ink">Menus</h2>
            <Button className="!min-h-9 !text-xs" onClick={openCreateMenu}>Add menu</Button>
          </div>
          <ul className="space-y-2">
            {menus.map((menu) => (
              <li key={menu.id}>
                <button
                  type="button"
                  onClick={() => setSelectedMenuId(menu.id)}
                  className={`w-full rounded-[var(--bs-radius)] border px-3 py-3 text-left transition ${selectedMenuId === menu.id ? "border-ink bg-ink text-white" : "border-line bg-cloud hover:border-teal"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{menu.label}</span>
                    <StatusBadge status={menu.status} />
                  </div>
                  <p className={`mt-1 text-xs ${selectedMenuId === menu.id ? "text-slate-300" : "text-slate-500"}`}>{menu.description || `/${menu.slug}`}</p>
                </button>
                <div className="mt-1 flex gap-1 px-1">
                  <Button variant="ghost" className="!min-h-8 !px-2 !text-xs" onClick={() => openEditMenu(menu)}>Edit</Button>
                  <Button
                    variant="ghost"
                    className="!min-h-8 !px-2 !text-xs"
                    onClick={() =>
                      askTrash({
                        entityLabel: "menu",
                        name: menu.label,
                        onConfirm: () => {
                          deleteMenu(menu.id);
                          setSelectedMenuId("");
                          refresh();
                        }
                      })
                    }
                  >
                    Trash
                  </Button>
                </div>
                <ExtraFieldsReadout tenantId={tenantId} formKey="settings.cms_menu" recordId={menu.id} />
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-5">
          {menuFormOpen ? (
            <Panel className="p-5">
              <h3 className="mb-4 text-lg font-bold text-ink">{editingMenu ? "Edit menu" : "New menu"}</h3>
              <form onSubmit={saveMenuForm} className="grid gap-4 md:grid-cols-2">
                <Field label="Label"><TextInput required value={menuForm.label} onChange={(e) => setMenuForm({ ...menuForm, label: e.target.value })} /></Field>
                <Field label="Sort order"><TextInput type="number" value={menuForm.sortOrder} onChange={(e) => setMenuForm({ ...menuForm, sortOrder: Number(e.target.value) })} /></Field>
                <Field label="Description" className="md:col-span-2"><TextInput value={menuForm.description} onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} /></Field>
                <Field label="Status">
                  <SelectInput value={menuForm.status} onChange={(e) => setMenuForm({ ...menuForm, status: e.target.value as CmsStatus })}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </SelectInput>
                </Field>
                <ExtraFieldsBlock formKey="settings.cms_menu" valueJson={extraMenuJson} onChange={setExtraMenuJson} />
                <div className="flex items-end gap-2">
                  <Button type="submit">Save menu</Button>
                  <Button type="button" variant="secondary" onClick={() => { setExtraMenuJson(""); setMenuFormOpen(false); }}>Cancel</Button>
                </div>
              </form>
            </Panel>
          ) : null}

          <Panel className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink">Pages under {selectedMenu?.label ?? "…"}</h2>
                <p className="text-sm text-slate-500">Each page is nested under the selected menu and appears on the public site.</p>
              </div>
              <Button onClick={openCreatePage} disabled={!selectedMenuId}>Add page</Button>
            </div>

            <DataListToolbar
              search={pageSearch}
              onSearchChange={setPageSearch}
              searchPlaceholder="Search pages…"
              onExportCsv={() =>
                exportListCsv({
                  tenantId,
                  module: "settings",
                  filename: "cms-pages",
                  rows: visiblePages.map((p) => ({
                    Title: p.title,
                    Status: p.status,
                    Summary: p.summary
                  }))
                })
              }
              onExportPdf={() =>
                exportListPdf({
                  tenantId,
                  module: "settings",
                  title: "CMS Pages",
                  filename: "cms-pages",
                  columns: ["Title", "Status", "Summary"],
                  rows: visiblePages.map((p) => [p.title, p.status, p.summary || "—"])
                })
              }
            />

            {pageFormOpen ? (
              <form onSubmit={savePageForm} className="mb-5 grid gap-4 rounded-[var(--bs-radius)] border border-line bg-cloud p-4 md:grid-cols-2">
                <Field label="Title" className="md:col-span-2"><TextInput required value={pageForm.title} onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })} /></Field>
                <Field label="Summary" className="md:col-span-2"><TextInput value={pageForm.summary} onChange={(e) => setPageForm({ ...pageForm, summary: e.target.value })} /></Field>
                <Field label="Sort order"><TextInput type="number" value={pageForm.sortOrder} onChange={(e) => setPageForm({ ...pageForm, sortOrder: Number(e.target.value) })} /></Field>
                <Field label="Status">
                  <SelectInput value={pageForm.status} onChange={(e) => setPageForm({ ...pageForm, status: e.target.value as CmsStatus })}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </SelectInput>
                </Field>
                <Field label="Content" className="md:col-span-2"><TextArea required rows={7} value={pageForm.content} onChange={(e) => setPageForm({ ...pageForm, content: e.target.value })} /></Field>
                <ExtraFieldsBlock formKey="settings.cms_page" valueJson={extraPageJson} onChange={setExtraPageJson} />
                <div className="md:col-span-2 flex gap-2">
                  <Button type="submit">Save page</Button>
                  <Button type="button" variant="secondary" onClick={() => { setExtraPageJson(""); setPageFormOpen(false); }}>Cancel</Button>
                </div>
              </form>
            ) : null}

            <div className="space-y-3">
              {visiblePages.map((page) => (
                <div key={page.id} className="rounded-[var(--bs-radius)] border border-line px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{page.title}</p>
                      <p className="text-sm text-slate-500">{page.summary || "No summary"}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <StatusBadge status={page.status} />
                        {selectedMenu && page.status === "published" ? (
                          <Link href={`/site/${selectedMenu.slug}/${page.slug}`} className="text-xs font-semibold text-teal hover:underline">
                            /site/{selectedMenu.slug}/{page.slug}
                          </Link>
                        ) : null}
                      </div>
                      <ExtraFieldsReadout tenantId={tenantId} formKey="settings.cms_page" recordId={page.id} />
                    </div>
                    <div className="flex gap-1">
                      <Button variant="secondary" className="!min-h-8 !text-xs" onClick={() => openEditPage(page)}>Edit</Button>
                      <Button
                        variant="ghost"
                        className="!min-h-8 !text-xs"
                        onClick={() =>
                          askTrash({
                            entityLabel: "page",
                            name: page.title,
                            onConfirm: () => {
                              deletePage(page.id);
                              refresh();
                            }
                          })
                        }
                      >
                        Trash
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {visiblePages.length === 0 ? <p className="text-sm text-slate-500">No pages in this menu yet. Add the first page.</p> : null}
            </div>
          </Panel>
        </div>
      </div>

      {dialog}
    </AppShell>
  );
}
