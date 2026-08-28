import type { LazyOrNot } from "keycloakify/tools/LazyOrNot";
import type { UserProfileFormFieldsProps } from "keycloakify/login/UserProfileFormFieldsProps";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";
import type { KcContext } from "../../KcContext";
import type { I18n } from "../../i18n";
import { Button } from "@/components/shadcn/button";

/**
 * `UserProfileFormFields` renders bare elements and asks for the class names to
 * put on them, so the shadcn look is supplied here as utility strings rather
 * than by swapping in components. Keep these in step with
 * `src/components/shadcn/{input,label}.tsx` if those are regenerated.
 */
const kcClassesMap = {
    kcFormGroupClass: "flex w-full flex-col gap-3",
    /* `UserProfileFormFields` renders the required marker as a text node next to
       the label, so the wrapper is the flex row that keeps them on one line. */
    kcLabelClass: "text-sm leading-none font-medium select-none",
    kcLabelWrapperClass: "flex items-center gap-1",
    kcInputClass:
        "border-input bg-muted flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
    kcInputWrapperClass: "",
    kcInputErrorMessageClass: "text-destructive text-sm font-normal",
    kcSelectClass:
        "border-input bg-muted flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    kcFormClass: "",
    kcFormButtonsClass: "",
    kcButtonClass: "",
    kcButtonPrimaryClass: "",
    kcButtonDefaultClass: "",
    kcButtonLargeClass: "",
    kcButtonBlockClass: ""
} as const;

type Props = PageProps<
    Extract<KcContext, { pageId: "login-update-profile.ftl" }>,
    I18n
> & {
    UserProfileFormFields: LazyOrNot<
        (props: UserProfileFormFieldsProps) => React.ReactElement
    >;
    doMakeUserConfirmPassword: boolean;
};

export default function LoginUpdateProfile(props: Props) {
    const {
        kcContext,
        i18n,
        doUseDefaultCss,
        Template,
        classes,
        UserProfileFormFields,
        doMakeUserConfirmPassword
    } = props;
    const { url, messagesPerField } = kcContext;
    const { msg, msgStr } = i18n;

    const { kcClsx } = getKcClsx({ doUseDefaultCss: false, classes: kcClassesMap });

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={messagesPerField.exists("global")}
            headerNode={msg("loginProfileTitle")}
        >
            <form
                id="kc-update-profile-form"
                action={url.loginAction}
                method="post"
                className="flex flex-col gap-6"
            >
                <UserProfileFormFields
                    kcContext={kcContext}
                    i18n={i18n}
                    kcClsx={kcClsx}
                    onIsFormSubmittableValueChange={() => {}}
                    doMakeUserConfirmPassword={doMakeUserConfirmPassword}
                />

                <Button className="w-full" type="submit">
                    {msgStr("doSubmit")}
                </Button>
            </form>
        </Template>
    );
}
