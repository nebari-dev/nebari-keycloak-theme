import { kcSanitize } from "keycloakify/lib/kcSanitize";
import type { KcContext } from "./KcContext";
import type { I18n } from "./i18n";

type InfoKcContext = Extract<KcContext, { pageId: "info.ftl" }>;

/**
 * The `info.ftl` page's message and navigation contract, shared by both themes
 * so the two cannot disagree about it.
 *
 * Keycloak drives all of this from server state, and each piece has a rule that
 * is easy to get subtly wrong:
 *
 * - `skipLink` means "offer no way onward", and it outranks every target. A
 *   check that only guarded some of them would still show a link on a page whose
 *   whole point is that the flow continues elsewhere (an email link, say).
 * - The message and header are *message keys or HTML*, not plain text. Rendered
 *   as text, an advanced key shows up as the key itself and a message with
 *   markup shows its tags. `advancedMsgStr` resolves the key, and `kcSanitize`
 *   is what makes it safe to insert as HTML — it is Keycloak's own allow-list.
 */
export type InfoContinueTarget = {
    href: string;
    label: "proceedWithAction" | "backToApplication";
};

export function getInfoContinueTarget(
    kcContext: InfoKcContext
): InfoContinueTarget | undefined {
    const { skipLink, pageRedirectUri, actionUri, client } = kcContext;

    /* Checked first and on its own: no target may survive it. */
    if (skipLink) {
        return undefined;
    }

    if (pageRedirectUri) {
        return { href: pageRedirectUri, label: "backToApplication" };
    }

    if (actionUri) {
        return { href: actionUri, label: "proceedWithAction" };
    }

    if (client.baseUrl) {
        return { href: client.baseUrl, label: "backToApplication" };
    }

    return undefined;
}

/** Sanitized HTML for the page heading. */
export function getInfoHeaderHtml(
    kcContext: InfoKcContext,
    i18n: Pick<I18n, "advancedMsgStr">
): string {
    const { messageHeader, message } = kcContext;

    return kcSanitize(
        messageHeader !== undefined
            ? i18n.advancedMsgStr(messageHeader)
            : (message.summary ?? "")
    );
}

/**
 * Sanitized HTML for the message body, with any required actions appended in
 * bold — the same shape Keycloak's own template produces.
 */
export function getInfoMessageHtml(
    kcContext: InfoKcContext,
    i18n: Pick<I18n, "advancedMsgStr">
): string {
    const { message, requiredActions } = kcContext;

    let html = message.summary?.trim() ?? "";

    if (requiredActions !== undefined && requiredActions.length !== 0) {
        html += ` <b>${requiredActions
            .map(requiredAction => i18n.advancedMsgStr(`requiredAction.${requiredAction}`))
            .join(", ")}</b>`;
    }

    return kcSanitize(html);
}
