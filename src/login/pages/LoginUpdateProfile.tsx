import type { LazyOrNot } from "keycloakify/tools/LazyOrNot";
import type { UserProfileFormFieldsProps } from "keycloakify/login/UserProfileFormFieldsProps";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";

// Map keycloak logical class names → our nebari CSS classes
const kcClassesMap = {
    kcFormGroupClass: "nebari-form-group",
    kcLabelClass: "nebari-label",
    kcLabelWrapperClass: "",
    kcInputClass: "nebari-input",
    kcInputWrapperClass: "",
    kcInputErrorMessageClass: "nebari-field-error",
    kcSelectClass: "nebari-input",
    kcFormClass: "",
    kcFormButtonsClass: "",
    kcButtonClass: "nebari-button",
    kcButtonPrimaryClass: "nebari-button-primary nebari-button-full",
    kcButtonDefaultClass: "nebari-button nebari-button-secondary",
    kcButtonLargeClass: "",
    kcButtonBlockClass: "",
} as const;

type Props = PageProps<Extract<KcContext, { pageId: "login-update-profile.ftl" }>, I18n> & {
    UserProfileFormFields: LazyOrNot<(props: UserProfileFormFieldsProps) => React.ReactElement>;
    doMakeUserConfirmPassword: boolean;
};

export default function LoginUpdateProfile(props: Props) {
    const { kcContext, i18n, Template, UserProfileFormFields, doMakeUserConfirmPassword } = props;
    const { url, messagesPerField } = kcContext;
    const { msg, msgStr } = i18n;

    const { kcClsx } = getKcClsx({ doUseDefaultCss: false, classes: kcClassesMap });

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={false}
            classes={undefined}
            displayMessage={messagesPerField.exists("global")}
            headerNode={msg("loginProfileTitle")}
        >
            <form id="kc-update-profile-form" action={url.loginAction} method="post">
                <UserProfileFormFields
                    kcContext={kcContext}
                    i18n={i18n}
                    kcClsx={kcClsx}
                    onIsFormSubmittableValueChange={() => { }}
                    doMakeUserConfirmPassword={doMakeUserConfirmPassword}
                />

                <div className="nebari-form-actions" style={{ marginTop: "1.5rem" }}>
                    <button type="submit" className="nebari-button nebari-button-primary nebari-button-full">
                        {msgStr("doSubmit")}
                    </button>
                </div>
            </form>
        </Template>
    );
}
