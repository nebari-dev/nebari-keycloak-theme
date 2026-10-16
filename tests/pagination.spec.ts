import { expect, test } from "@playwright/test";
import {
    correctedFirst,
    lastPageStart
} from "../src/shared/keycloak-ui-shared/controls/table/pagination";

test("last page starts on a page boundary", () => {
    // 25 rows at 10 per page: pages start at 0, 10, 20.
    expect(lastPageStart(25, 10)).toBe(20);
    // An exact multiple must not spill onto an empty page.
    expect(lastPageStart(30, 10)).toBe(20);
    expect(lastPageStart(10, 10)).toBe(0);
    expect(lastPageStart(1, 10)).toBe(0);
});

test("last page start degrades safely", () => {
    expect(lastPageStart(0, 10)).toBe(0);
    expect(lastPageStart(-5, 10)).toBe(0);
    expect(lastPageStart(25, 0)).toBe(0);
});

test("an offset that still points at rows is left alone", () => {
    expect(correctedFirst(25, 0, 10)).toBeUndefined();
    expect(correctedFirst(25, 10, 10)).toBeUndefined();
    expect(correctedFirst(25, 20, 10)).toBeUndefined();
});

test("an offset past the end snaps to the last populated page", () => {
    // Was on page 4 (offset 30); a delete left 25 rows, so page 3 is the last.
    expect(correctedFirst(25, 30, 10)).toBe(20);
    // Shrinking far past the offset still lands on a real page.
    expect(correctedFirst(5, 90, 10)).toBe(0);
});

test("losing every row returns to the first page", () => {
    expect(correctedFirst(0, 40, 10)).toBe(0);
});

test("an offset exactly at the row count is past the end", () => {
    // 20 rows, offset 20 -> the page holds nothing, so it must be corrected.
    expect(correctedFirst(20, 20, 10)).toBe(10);
});
