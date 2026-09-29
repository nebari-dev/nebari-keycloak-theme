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
            nebari: "Create your Nebari account",
            collab: "Create your Collab account"
        },
        registerSubtitle: {
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
            nebari: "Powered by Nebari",
            collab: "Powered by OpenTeams Collab"
        },

        alreadyHaveAnAccount: "Already have an account?"
    }
    })
    .build();

type I18n = typeof ofTypeI18n;
export { useI18n, type I18n };
