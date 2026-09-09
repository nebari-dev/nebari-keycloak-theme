import { useLayoutEffect } from "react";

declare global {
    interface Window {
        /**
         * Installed by `useRecaptchaSubmitCallback` for the action-based
         * reCAPTCHA, which Google's script invokes by this global name.
         */
        onSubmitRecaptcha?: () => void;
    }
}

/**
 * Wire up the action-based ("invisible") reCAPTCHA.
 *
 * That variant has no checkbox for the visitor to tick: Google scores the
 * visitor in the background and then calls a global function, named by the
 * submit button's `data-callback`, which is expected to submit the form. So the
 * page has to publish that global for the duration — the alternative is a
 * submit button that silently does nothing on a realm configured this way.
 *
 * `requestSubmit` rather than `submit`, so the browser still runs constraint
 * validation and fires `submit` handlers.
 */
export function useRecaptchaSubmitCallback(formId: string): void {
    useLayoutEffect(() => {
        window.onSubmitRecaptcha = () => {
            const form = document.getElementById(formId);

            if (form instanceof HTMLFormElement) {
                form.requestSubmit();
            }
        };

        return () => {
            delete window.onSubmitRecaptcha;
        };
    }, [formId]);
}
