import { createUseI18n } from "keycloakify/login";

export const { useI18n, ofTypeI18n } = createUseI18n({
    en: {
        // Custom translations for Nebari
        loginTitle: "Sign in to {0}",
        loginTitleHtml: "Sign in to <strong>{0}</strong>",
        loginSubtitle: "Welcome back! Please enter your credentials.",
        registerTitle: "Create your Nebari account",
        registerSubtitle: "Join the Nebari data science platform",

        // Override default messages
        doLogIn: "Sign In",
        doRegister: "Create Account",
        noAccount: "Don't have an account?",
        doForgotPassword: "Forgot password?",

        // Custom messages
        nebariWelcome: "Your open source data science platform, hosted",
        poweredBy: "Powered by Nebari",

        alreadyHaveAnAccount: "Already have an account?"
    }
});

export type I18n = typeof ofTypeI18n;
