import { createGetKcContextMock } from "keycloakify/login/KcContext";
import type { KcContext as KcContextBase } from "keycloakify/login/KcContext";

export type KcContextExtension = {
    // Add any custom context properties here if needed
    // For example:
    // nebariVersion?: string;
};

export type KcContext = KcContextBase & KcContextExtension;

export const { getKcContextMock } = createGetKcContextMock({
    kcContextExtension: {},
    kcContextExtensionPerPage: {}
});

