import { i18nBuilder } from "keycloakify/login";
import type { ThemeName } from "../kc.gen";

const { useI18n, ofTypeI18n } = i18nBuilder
    .withThemeName<ThemeName>()
    .withCustomTranslations({
    en: {
        loginTitle: "Sign in to {0}",
        loginTitleHtml: "Sign in to <strong>{0}</strong>",
        loginSubtitle: "Welcome back! Please enter your credentials.",
        // Keyed by theme where the product name appears, so the Collab theme
        // does not greet its users with Nebari's name. See themes.json.
        registerTitle: {
            template: "Create your account",
            nebari: "Create your Nebari account",
            collab: "Create your Collab account"
        },
        registerSubtitle: {
            template: "Create an account to continue",
            nebari: "Join the Nebari data science platform",
            collab: "Join OpenTeams Collab"
        },

        // Override default messages
        doLogIn: "Sign In",
        doRegister: "Create Account",
        noAccount: "Don't have an account?",
        doForgotPassword: "Forgot password?",

        // Custom messages
        nebariWelcome: "Your open source data science platform, hosted",
        poweredBy: {
            template: "",
            nebari: "Powered by Nebari",
            collab: "Powered by OpenTeams Collab"
        },

        // Runtime branding is stored as a realm localization override for this key.
        nebariBrandingConfig: "base64:e30=",

        alreadyHaveAnAccount: "Already have an account?",

        /* The `template` theme is deliberately unbranded, so it cannot reuse the
           Nebari-branded overrides above. Custom translations replace a message
           for every theme in the build, so the neutral wording needs its own key
           rather than a second override of `registerTitle`. */
        templateRegisterTitle: "Create your account"
    }
    })
    .build();

type I18n = typeof ofTypeI18n;
export { useI18n, type I18n };
