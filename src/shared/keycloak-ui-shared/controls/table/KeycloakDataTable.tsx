/**
 * This file has been claimed for ownership from @keycloakify/keycloak-ui-shared version 260502.0.0.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/controls/table/KeycloakDataTable.tsx" --revert
 */

import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumnDef } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  MoreVerticalIcon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { get, intersectionBy } from "lodash-es";
import {
  type ComponentClass,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import { useTranslation } from "react-i18next";
import { ButtonVariant } from "../../../@patternfly/react-core";
import type { SVGIconProps } from "@patternfly/react-icons/dist/js/createIcon";
import type {
  IAction,
  IActionsResolver,
  IFormatter,
  IFormatterValueType,
  ITransform,
  TableProps,
} from "../../../@patternfly/react-table";
import { useFetch } from "../../utils/useFetch";
import { useStoredState } from "../../utils/useStoredState";
import { ListEmptyState } from "./ListEmptyState";

type RowData = Record<string, unknown>;

export type Field<T> = {
  name: string;
  displayKey?: string;
  cellFormatters?: IFormatter[];
  transforms?: ITransform[];
  cellRenderer?: (row: T) => JSX.Element | string;
};

export type DetailField<T> = {
  name: string;
  enabled?: (row: T) => boolean;
  cellRenderer?: (row: T) => JSX.Element | string;
};

export type Action<T> = IAction & {
  onRowClick?: (row: T) => Promise<boolean | void> | void;
};

/**
 * A bare array is upstream's contract, and every loader in the tree returns one
 * — so the pager currently always works out "next page?" from the `max + 1`
 * sentinel row rather than from a total.
 *
 * The object form is a seam for a Nebari-owned screen that can cheaply ask
 * Keycloak for a count and wants the pager to read "of N". It has no callers
 * today; it is kept because it costs one branch in the fetch handler and the
 * alternative — reintroducing it later — means re-diverging this file from
 * upstream. `total` stays optional so an endpoint that cannot supply one can
 * still use the object shape.
 */
export type LoaderResult<T> = T[] | { rows: T[]; total?: number };

export type LoaderFunction<T> = (
  first?: number,
  max?: number,
  search?: string,
) => Promise<LoaderResult<T>>;

export type DataListProps<T> = Omit<TableProps, "rows" | "cells" | "onSelect"> & {
  loader: T[] | LoaderFunction<T>;
  onSelect?: (value: T[]) => void;
  canSelectAll?: boolean;
  detailColumns?: DetailField<T>[];
  isRowDisabled?: (value: T) => boolean;
  isPaginated?: boolean;
  ariaLabelKey: string;
  searchPlaceholderKey?: string;
  columns: Field<T>[];
  actions?: Action<T>[];
  actionResolver?: IActionsResolver;
  searchTypeComponent?: ReactNode;
  /** Controls rendered at the leading edge of the toolbar. */
  toolbarLeadingItem?: ReactNode;
  toolbarItem?: ReactNode;
  subToolbar?: ReactNode;
  emptyState?: ReactNode;
  icon?: ComponentClass<SVGIconProps>;
  isNotCompact?: boolean;
  isRadio?: boolean;
  isSearching?: boolean;
  /**
   * Forwarded to the table wrapper. Kept as an explicit prop rather than a
   * blanket `...rest` spread: the remaining `TableProps` are PatternFly table
   * options with no Nebari equivalent, and spreading them onto a `div` would
   * put unknown attributes in the DOM. Six Admin Console tables pass this one,
   * and Keycloak's own end-to-end selectors depend on it.
   */
  "data-testid"?: string;
  /**
   * Opts *out* of per-row action menus.
   *
   * Upstream has no such flag — PatternFly renders the kebab whenever `actions`
   * or `actionResolver` is supplied — so this defaults to that behaviour and
   * exists only for a screen that deliberately replaces the menu with something
   * else. Thirty-two Admin Console screens supply row actions, so a `false`
   * default silently removes real functionality from all of them.
   */
  showRowActions?: boolean;
};

/** Turns arbitrary Keycloak response values into client-filterable text. */
function getSearchText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(getSearchText).join(" ");
  if (typeof value === "object") return Object.values(value).map(getSearchText).join(" ");
  return "";
}

function rowId<T>(row: T, index: number): string {
  return String(get(row, "id") ?? get(row, "clientId") ?? index);
}

type RowActionsProps = {
  actions: IAction[];
  disabled: boolean;
  onAction: (action: IAction, event: React.MouseEvent) => void;
  rowLabel: string;
};

/** Nebari menu used for Keycloak's existing per-row action definitions. */
function RowActions({ actions, disabled, onAction, rowLabel }: RowActionsProps) {
  const supportedActions = actions
    .filter((action) => action.isSeparator || typeof action.onClick === "function")
    .filter(
      (action, index, filtered) =>
        !action.isSeparator ||
        (index > 0 &&
          index < filtered.length - 1 &&
          !filtered[index - 1].isSeparator &&
          !filtered[index + 1].isSeparator),
    );
  if (disabled || supportedActions.every((action) => action.isSeparator)) return null;

  return (
    <DropdownMenu>
      {/* Same override as `ProfileMenu`: the registry's trigger renders the
          Nebari `Button`, which takes `ref` as a plain prop (React 19), and this
          app is on React 18 — so Base UI's anchor ref came back null and the menu
          never positioned itself. A DOM element gives it a real node, and
          `buttonVariants` reapplies the styling, including the compact `icon-sm`
          sizing the trigger's own props cannot express. */}
      <DropdownMenuTrigger
        aria-label={`Actions for ${rowLabel}`}
        className={cn(
          buttonVariants({ size: "icon-sm", variant: "ghost" }),
          "focus-visible:ring-offset-0",
        )}
        render={<button type="button" />}
        variant="ghost"
      >
        <MoreVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end" className="min-w-44">
          {supportedActions.map((action, index) =>
            action.isSeparator ? (
              <DropdownMenuSeparator key={`separator-${index}`} />
            ) : (
              <DropdownMenuItem
                disabled={action.isDisabled || action.isAriaDisabled}
                key={action.itemKey ?? `action-${index}`}
                onClick={(event) => {
                  /* The menu renders through a portal, so in the DOM it sits on
                     `document.body` — but React bubbles portal events up the
                     *React* tree, which puts this click on the table row that
                     owns the cell. `DataTable`'s row-navigation guard skips
                     clicks on interactive elements via
                     `currentTarget.contains(target)`, a DOM check that a
                     portalled node fails, so without this the row followed its
                     primary link and "Delete" navigated to the detail page
                     instead of opening the confirm dialog. Stopping propagation
                     here keeps the fix at the call site; `data-table.tsx` is
                     registry-managed and not ours to edit. */
                  event.stopPropagation();
                  onAction(action, event as React.MouseEvent);
                }}
                variant={action.variant === "danger" ? "destructive" : "default"}
              >
                {action.title}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}

type PaginationProps = {
  first: number;
  hasNext: boolean;
  knownCount?: number;
  max: number;
  onPageChange: (first: number) => void;
  onPageSizeChange: (max: number) => void;
  selectedCount?: number;
  visibleCount: number;
};

/**
 * Nebari-style pager that also supports Keycloak endpoints without a total.
 * Those endpoints return `max + 1` rows, so next-page availability is known
 * even though a last-page number is not.
 */
export function KeycloakPagination({
  first,
  hasNext,
  knownCount,
  max,
  onPageChange,
  onPageSizeChange,
  selectedCount,
  visibleCount,
}: PaginationProps) {
  const page = Math.floor(first / max);
  const pageCount =
    knownCount === undefined ? undefined : Math.max(1, Math.ceil(knownCount / max));
  const lastPageFirst = pageCount === undefined ? undefined : (pageCount - 1) * max;
  const previousRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const pressedDirection = useRef<"backward" | "forward">();

  useEffect(() => {
    const direction = pressedDirection.current;
    pressedDirection.current = undefined;
    if (direction === "backward" && first === 0) nextRef.current?.focus();
    if (direction === "forward" && !hasNext) previousRef.current?.focus();
  }, [first, hasNext]);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 pt-4"
      data-slot="data-table-pagination"
    >
      {selectedCount !== undefined ? (
        <p aria-live="polite" className="text-muted-foreground text-sm">
          {selectedCount} of {visibleCount} {visibleCount === 1 ? "row" : "rows"}{" "}
          selected
        </p>
      ) : null}
      <div className="ml-auto flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[11px] text-muted-foreground">
            Rows per page
          </span>
          <Select
            onValueChange={(value) => onPageSizeChange(Number(value))}
            value={String(max)}
          >
            <SelectTrigger
              aria-label="Rows per page"
              className="h-8 w-[76px] py-1"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="font-medium text-foreground text-sm whitespace-nowrap">
          {pageCount === undefined
            ? `Page ${page + 1}`
            : `Page ${page + 1} of ${pageCount}`}
        </p>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Go to first page"
            disabled={first === 0}
            onClick={() => {
              pressedDirection.current = "backward";
              onPageChange(0);
            }}
            size="icon-sm"
            variant="outline"
          >
            <ChevronsLeftIcon />
          </Button>
          <Button
            aria-label="Go to previous page"
            disabled={first === 0}
            onClick={() => {
              pressedDirection.current = "backward";
              onPageChange(Math.max(0, first - max));
            }}
            ref={previousRef}
            size="icon-sm"
            variant="outline"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            aria-label="Go to next page"
            disabled={!hasNext}
            onClick={() => {
              pressedDirection.current = "forward";
              onPageChange(first + max);
            }}
            ref={nextRef}
            size="icon-sm"
            variant="outline"
          >
            <ChevronRightIcon />
          </Button>
          <Button
            aria-label="Go to last page"
            disabled={lastPageFirst === undefined || page >= pageCount! - 1}
            onClick={() => {
              if (lastPageFirst === undefined) return;
              pressedDirection.current = "forward";
              onPageChange(lastPageFirst);
            }}
            size="icon-sm"
            variant="outline"
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Compatibility layer between Keycloak's loader contract and Nebari's Data
 * Table. Existing screens keep their server requests and row definitions while
 * the rendered table, filtering, selection, actions and pagination use Nebari
 * primitives and focus styles.
 */
export function KeycloakDataTable<T extends RowData>({
  ariaLabelKey,
  searchPlaceholderKey,
  isPaginated = false,
  onSelect,
  canSelectAll = false,
  isNotCompact,
  isRadio,
  detailColumns,
  isRowDisabled,
  loader,
  columns,
  actions,
  actionResolver,
  searchTypeComponent,
  toolbarLeadingItem,
  toolbarItem,
  subToolbar,
  emptyState,
  icon,
  isSearching = false,
  showRowActions = true,
  className,
  "data-testid": dataTestId,
}: DataListProps<T>) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<T[]>([]);
  const [loadedData, setLoadedData] = useState<T[]>();
  const [serverCount, setServerCount] = useState<number>();
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [defaultPageSize, setDefaultPageSize] = useStoredState(
    localStorage,
    "pageSize",
    10,
  );
  const [max, setMax] = useState(defaultPageSize);
  const [first, setFirst] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [key, setKey] = useState(0);
  const previousSearch = useRef("");
  const loadedKey = useRef<number>();
  const searchRef = useRef<HTMLInputElement>(null);

  // Nebari's DataTable filters as text changes. Debouncing retains that feel
  // without issuing a Keycloak request for every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setFirst(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useFetch(
    async () => {
      setLoading(true);
      const searchStarted = previousSearch.current === "" && search !== "";
      previousSearch.current = search;
      const pageFirst = searchStarted ? 0 : first;
      return typeof loader === "function"
        ? !isPaginated && loadedKey.current === key && loadedData
          ? loadedData
          : await loader(pageFirst, max + 1, search)
        : loader;
    },
    (result: LoaderResult<T>) => {
      loadedKey.current = key;
      if (Array.isArray(result)) {
        setLoadedData(result);
        setServerCount(undefined);
      } else {
        setLoadedData(result.rows);
        setServerCount(result.total);
      }
      setLoading(false);
    },
    [key, first, max, search, typeof loader !== "function" ? loader : undefined],
  );

  const filteredData = useMemo(() => {
    if (!loadedData) return undefined;
    if (isPaginated || search === "") return loadedData;
    const needle = search.toLocaleLowerCase();
    return loadedData.filter((row) =>
      getSearchText(row).toLocaleLowerCase().includes(needle),
    );
  }, [isPaginated, loadedData, search]);

  // Memoised so that re-renders driven by unrelated local state (search input
  // keystrokes, selection toggles) keep a stable identity for `visibleData`.
  // `tableColumns` and DataTable's `data` both key off it, so recomputing the
  // array on every render made TanStack rebuild the whole table each keystroke.
  const pageWithSentinel = useMemo(
    () =>
      isPaginated
        ? filteredData ?? []
        : (filteredData ?? []).slice(first, first + max + 1),
    [filteredData, first, isPaginated, max],
  );
  const visibleData = useMemo(
    () => pageWithSentinel.slice(0, max),
    [max, pageWithSentinel],
  );
  const hasNext = pageWithSentinel.length > max;
  const knownCount = isPaginated
    ? serverCount ?? (!hasNext ? first + visibleData.length : undefined)
    : filteredData?.length;
  const searching = search !== "" || isSearching;
  const noData = !loading && visibleData.length === 0;
  const rowsSelectedOnPage = useMemo(
    () => intersectionBy(selected, visibleData, "id"),
    [selected, visibleData],
  );
  /*
   * `isRowDisabled` is an authorization signal on several screens, not just a
   * styling one — Users marks rows the admin has no `manage` access to, Role
   * mapping marks inherited roles, User groups marks indirect memberships — and
   * upstream expressed it as PatternFly's `disableSelection`, which excluded
   * those rows from "select all". Select-all here therefore operates on the
   * selectable subset only, so a bulk Delete/Unassign can never be handed a row
   * the screen declared off limits.
   */
  const selectableData = useMemo(
    () => (isRowDisabled ? visibleData.filter((row) => !isRowDisabled(row)) : visibleData),
    [isRowDisabled, visibleData],
  );
  const selectedSelectableCount = useMemo(
    () => intersectionBy(selected, selectableData, "id").length,
    [selectableData, selected],
  );

  const updateSelected = useCallback((next: T[]) => {
    setSelected(next);
    onSelect?.(next);
  }, [onSelect]);

  const toggleRow = useCallback((row: T, checked: boolean) => {
    if (isRadio) {
      updateSelected(checked ? [row] : []);
      return;
    }
    const id = get(row, "id");
    updateSelected(
      checked
        ? [...selected, row]
        : selected.filter((candidate) => get(candidate, "id") !== id),
    );
  }, [isRadio, selected, updateSelected]);

  const refresh = useCallback(() => setKey((value) => value + 1), []);

  const resolveActions = useCallback((row: T): IAction[] => {
    if (actionResolver) return actionResolver({ data: row } as never, {} as never);
    return (actions ?? []).map((action) => ({
      ...action,
      onClick: async () => {
        const shouldRefresh = await action.onRowClick?.(row);
        if (shouldRefresh) {
          if (!isPaginated) setSearchInput("");
          refresh();
        }
      },
    }));
  }, [actionResolver, actions, isPaginated, refresh]);

  const renderCell = useCallback((column: Field<T> | DetailField<T>, row: T): ReactNode => {
    if ("cellFormatters" in column && column.cellFormatters) {
      /* PatternFly's formatters are a loosely typed pipeline: `IFormatter`
         returns a value its own parameter type does not accept, so chaining
         them — the entire point of `cellFormatters` — does not type-check
         unaided. The casts restate the chain rather than widen it; every
         formatter Keycloak ships here returns a renderable value. */
      return column.cellFormatters.reduce<IFormatterValueType | undefined>(
        (value, formatter) => formatter(value) as IFormatterValueType,
        get(row, column.name) as IFormatterValueType | undefined,
      ) as ReactNode;
    }
    if (column.cellRenderer) {
      const Component = column.cellRenderer;
      return <Component {...row} />;
    }
    return get(row, column.name) as ReactNode;
  }, []);

  const tableColumns = useMemo<DataTableColumnDef<T>[]>(() => {
    const result: DataTableColumnDef<T>[] = [];

    if (detailColumns) {
      result.push({
        id: "keycloak-expand",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">{t("expandRow")}</span>,
        cell: ({ row }) => {
          const original = row.original;
          const enabled = detailColumns[0]?.enabled?.(original) ?? true;
          const id = rowId(original, row.index);
          const expanded = expandedRows.includes(id);
          return enabled ? (
            <Button
              aria-expanded={expanded}
              aria-label={expanded ? t("collapse") : t("expand")}
              onClick={() =>
                setExpandedRows((current) =>
                  current.includes(id)
                    ? current.filter((value) => value !== id)
                    : [...current, id],
                )
              }
              size="icon-sm"
              variant="ghost"
            >
              <ChevronDownIcon
                className={cn(
                  "motion-safe:transition-transform",
                  !expanded && "-rotate-90",
                )}
              />
            </Button>
          ) : null;
        },
      });
    }

    if (onSelect) {
      result.push({
        id: "keycloak-select",
        enableHiding: false,
        enableSorting: false,
        header: () =>
          canSelectAll && !isRadio ? (
            <Checkbox
              aria-label={t("selectAll")}
              checked={
                selectableData.length > 0 &&
                selectedSelectableCount === selectableData.length
              }
              disabled={selectableData.length === 0}
              indeterminate={
                selectedSelectableCount > 0 &&
                selectedSelectableCount < selectableData.length
              }
              onCheckedChange={(checked) => {
                const pageIds = new Set(selectableData.map((row) => get(row, "id")));
                updateSelected(
                  checked
                    ? [
                        ...selected,
                        ...selectableData.filter(
                          (row) =>
                            !selected.some(
                              (item) => get(item, "id") === get(row, "id"),
                            ),
                        ),
                      ]
                    : selected.filter((row) => !pageIds.has(get(row, "id"))),
                );
              }}
            />
          ) : (
            <span className="sr-only">{t("select")}</span>
          ),
        cell: ({ row }) => {
          const original = row.original;
          const id = rowId(original, row.index);
          const checked = selected.some(
            (item) => get(item, "id") === get(original, "id"),
          );
          const disabled = isRowDisabled?.(original) ?? false;
          const label = `${t("select")} ${
            getSearchText(original).slice(0, 80) || id
          }`;
          return isRadio ? (
            <RadioGroupItem aria-label={label} disabled={disabled} value={id} />
          ) : (
            <Checkbox
              aria-label={label}
              checked={checked}
              disabled={disabled}
              onCheckedChange={(next) => toggleRow(original, next)}
            />
          );
        },
      });
    }

    columns.forEach((column, columnIndex) => {
      result.push({
        id: column.name,
        accessorFn: (row) => get(row, column.name),
        enableHiding: false,
        enableSorting: false,
        header: t(column.displayKey || column.name),
        cell: ({ row }) => {
          const original = row.original;
          const id = rowId(original, row.index);
          const expanded = expandedRows.includes(id);
          return (
            <div
              className="min-w-0"
              data-row-primary={columnIndex === 0 ? "" : undefined}
            >
              {renderCell(column, original)}
              {columnIndex === 0 && expanded && detailColumns ? (
                <div className="mt-3 grid gap-2 border-border border-t pt-3 text-sm">
                  {detailColumns.map((detail) => (
                    <div key={detail.name}>{renderCell(detail, original)}</div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        },
      });
    });

    if (showRowActions && (actions || actionResolver)) {
      result.push({
        id: "keycloak-actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">{t("actions")}</span>,
        cell: ({ row }) => {
          const original = row.original;
          return (
            <RowActions
              actions={resolveActions(original)}
              disabled={isRowDisabled?.(original) ?? false}
              onAction={(action, event) =>
                action.onClick?.(
                  event,
                  row.index,
                  { data: original } as never,
                  {} as never,
                )
              }
              rowLabel={getSearchText(original).slice(0, 80) || row.id}
            />
          );
        },
      });
    }

    return result;
  }, [
    actionResolver,
    actions,
    canSelectAll,
    columns,
    detailColumns,
    expandedRows,
    isRadio,
    isRowDisabled,
    onSelect,
    renderCell,
    resolveActions,
    selectableData,
    selected,
    selectedSelectableCount,
    showRowActions,
    t,
    toggleRow,
    updateSelected,
  ]);

  const table = (
    <DataTable
      ariaLabel={t(ariaLabelKey)}
      clickPrimaryRowLinks
      className={cn(
        "gap-0 [&_[data-slot=data-table-pagination]]:hidden [&_[data-slot=data-table-toolbar]]:hidden",
        isNotCompact && "[&_[data-slot=table-cell]]:h-12",
        className,
      )}
      columns={tableColumns}
      data={visibleData}
      getRowId={rowId}
      initialPageSize={max}
      key={`table-${key}-${first}-${max}-${search}`}
      loading={loading}
      selectable={false}
      showColumnVisibility={false}
      showPagination={false}
    />
  );

  return (
    <div
      className="flex w-full flex-col gap-4 px-4 pt-4 pb-6 sm:px-6"
      data-slot="keycloak-data-table"
      data-testid={dataTestId}
    >
      <div
        className="flex min-h-8 flex-wrap items-center gap-2"
        data-testid="table-toolbar"
      >
        {toolbarLeadingItem ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {toolbarLeadingItem}
          </div>
        ) : null}
        {searchPlaceholderKey ? (
          <div
            className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap"
            data-testid={`${ariaLabelKey}input`}
          >
            <div className="relative w-full sm:w-[280px] sm:shrink-0 [&_[data-slot=input-wrapper]>svg]:!hidden">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 z-10 size-[18px] -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label={t("search")}
                className="h-8 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
                data-testid="table-search-input"
                disabled={loading}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t(searchPlaceholderKey)}
                ref={searchRef}
                type="search"
                value={searchInput}
              />
              {searchInput ? (
                <Button
                  aria-label={t("clear")}
                  className="absolute top-1/2 right-1 z-10 -translate-y-1/2 focus-visible:ring-offset-0"
                  disabled={loading}
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setFirst(0);
                    searchRef.current?.focus();
                  }}
                  size="icon-xs"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              ) : null}
            </div>
            {searchTypeComponent}
          </div>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {toolbarItem}
          <Button data-testid="refresh" onClick={refresh} size="sm" variant="ghost">
            <RefreshCwIcon />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {subToolbar ? (
        <div className="flex flex-wrap items-center gap-2">{subToolbar}</div>
      ) : null}

      {noData && searching ? (
        <ListEmptyState
          hasIcon
          icon={icon}
          instructions={t("noSearchResultsInstructions")}
          isSearchVariant
          message={t("noSearchResults")}
          secondaryActions={
            !isSearching
              ? [
                  {
                    text: t("clearAllFilters"),
                    onClick: () => {
                      setSearchInput("");
                      setSearch("");
                      setFirst(0);
                      searchRef.current?.focus();
                    },
                    type: ButtonVariant.link,
                  },
                ]
              : []
          }
        />
      ) : noData && !searching ? (
        emptyState
      ) : isRadio ? (
        <RadioGroup
          aria-label={t(ariaLabelKey)}
          onValueChange={(value) => {
            const row = visibleData.find(
              (item, index) => rowId(item, index) === value,
            );
            if (row) updateSelected([row]);
          }}
          value={selected[0] ? rowId(selected[0], 0) : ""}
        >
          {table}
        </RadioGroup>
      ) : (
        table
      )}

      {!loading && (!noData || searching) ? (
        <KeycloakPagination
          first={first}
          hasNext={hasNext}
          knownCount={knownCount}
          max={max}
          onPageChange={setFirst}
          onPageSizeChange={(nextMax) => {
            setFirst(0);
            setMax(nextMax);
            setDefaultPageSize(nextMax);
          }}
          selectedCount={onSelect ? rowsSelectedOnPage.length : undefined}
          visibleCount={visibleData.length}
        />
      ) : null}
    </div>
  );
}
