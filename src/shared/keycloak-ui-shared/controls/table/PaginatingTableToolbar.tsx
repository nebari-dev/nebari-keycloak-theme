/**
 * This file has been claimed for ownership from @keycloakify/keycloak-ui-shared version 260502.0.0.
 * To relinquish ownership and restore this file to its original content, run the following command:
 *
 * $ npx keycloakify own --path "shared/keycloak-ui-shared/controls/table/PaginatingTableToolbar.tsx" --revert
 */

/* eslint-disable */

// @ts-nocheck

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon, XIcon } from "lucide-react";
import {
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { KeycloakPagination } from "./KeycloakDataTable";

type KeycloakPaginationProps = {
  id?: string;
  count: number;
  first: number;
  max: number;
  onNextClick: (page: number) => void;
  onPreviousClick: (page: number) => void;
  onPerPageSelect: (first: number, max: number) => void;
};

type TableToolbarProps = KeycloakPaginationProps & {
  searchTypeComponent?: ReactNode;
  toolbarItem?: ReactNode;
  subToolbar?: ReactNode;
  inputGroupName?: string;
  inputGroupPlaceholder?: string;
  inputGroupOnEnter?: (value: string) => void;
};

/**
 * Nebari toolbar and pager for specialized Keycloak tables that still own
 * their row markup. Search commits after a short pause, matching DataTable's
 * live filtering without flooding server-backed screens with requests.
 */
export const PaginatingTableToolbar = ({
  count,
  first,
  max,
  onNextClick,
  onPreviousClick,
  onPerPageSelect,
  searchTypeComponent,
  toolbarItem,
  subToolbar,
  children,
  inputGroupName,
  inputGroupPlaceholder,
  inputGroupOnEnter,
}: PropsWithChildren<TableToolbarProps>) => {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTouched = useRef(false);
  const onSearch = useRef(inputGroupOnEnter);
  onSearch.current = inputGroupOnEnter;

  useEffect(() => {
    if (!searchTouched.current || !onSearch.current) return;
    const timer = window.setTimeout(
      () => onSearch.current?.(searchValue.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [searchValue]);

  const visibleCount = Math.min(count, max);

  return (
    <div
      className="flex w-full flex-col gap-4 px-4 pt-4 pb-6 sm:px-6"
      data-slot="keycloak-table-toolbar"
    >
      <div
        className="flex min-h-8 flex-wrap items-center gap-2"
        data-testid="table-toolbar"
      >
        {inputGroupName ? (
          <div
            className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap"
            data-testid={inputGroupName}
          >
            {inputGroupPlaceholder ? (
              <div className="relative w-full sm:w-[280px] sm:shrink-0 [&_[data-slot=input-wrapper]>svg]:!hidden">
                <SearchIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 z-10 size-[18px] -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-label={t("search")}
                  className="h-8 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
                  data-testid="table-search-input"
                  onChange={(event) => {
                    searchTouched.current = true;
                    setSearchValue(event.target.value);
                  }}
                  placeholder={inputGroupPlaceholder}
                  ref={searchRef}
                  type="search"
                  value={searchValue}
                />
                {searchValue ? (
                  <Button
                    aria-label={t("clear")}
                    className="absolute top-1/2 right-1 z-10 -translate-y-1/2 focus-visible:ring-offset-0"
                    onClick={() => {
                      searchTouched.current = false;
                      setSearchValue("");
                      inputGroupOnEnter?.("");
                      searchRef.current?.focus();
                    }}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <XIcon />
                  </Button>
                ) : null}
              </div>
            ) : null}
            {searchTypeComponent}
          </div>
        ) : null}

        {toolbarItem ? (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {toolbarItem}
          </div>
        ) : null}
      </div>

      {subToolbar ? (
        <div className="flex flex-wrap items-center gap-2">{subToolbar}</div>
      ) : null}

      {children}

      {count !== 0 ? (
        <KeycloakPagination
          first={first}
          hasNext={count > max}
          max={max}
          onPageChange={(nextFirst) =>
            nextFirst > first
              ? onNextClick(nextFirst)
              : onPreviousClick(nextFirst)
          }
          onPageSizeChange={(nextMax) => onPerPageSelect(0, nextMax)}
          visibleCount={visibleCount}
        />
      ) : null}
    </div>
  );
};
