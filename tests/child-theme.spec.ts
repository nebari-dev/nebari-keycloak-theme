import { expect, test } from "@playwright/test";
import { getChildBrand, getChildStylesheets } from "../src/themes/childTheme";

test.describe("child theme properties", () => {
    test("take a well-formed brand and reject anything else", () => {
        expect(getChildBrand({ brand: "acme" })).toBe("acme");
        expect(getChildBrand({ brand: " acme-corp " })).toBe("acme-corp");
        expect(getChildBrand({})).toBeUndefined();
        expect(getChildBrand(undefined)).toBeUndefined();
        // It becomes a CSS attribute value, so nothing that could break out of one.
        expect(getChildBrand({ brand: 'acme"] body {' })).toBeUndefined();
        expect(getChildBrand({ brand: "Acme" })).toBeUndefined();
        expect(getChildBrand({ brand: "a".repeat(41) })).toBeUndefined();
    });

    test("load only relative stylesheet paths, in order", () => {
        expect(getChildStylesheets({ styles: "css/acme.css  css/extra.css" })).toEqual([
            "css/acme.css",
            "css/extra.css"
        ]);
        expect(
            getChildStylesheets({
                styles: [
                    "https://evil.example/x.css",
                    "//evil.example/x.css",
                    "/absolute.css",
                    "css/../../../etc/x.css",
                    "css/script.js",
                    "css/ok.css"
                ].join(" ")
            })
        ).toEqual(["css/ok.css"]);
        expect(getChildStylesheets({})).toEqual([]);
        expect(getChildStylesheets(undefined)).toEqual([]);
    });
});
