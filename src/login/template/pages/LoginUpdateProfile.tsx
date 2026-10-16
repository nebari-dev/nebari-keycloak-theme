import type { LazyOrNot } from "keycloakify/tools/LazyOrNot";
import type { UserProfileFormFieldsProps } from "keycloakify/login/UserProfileFormFieldsProps";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";
import type { KcContext } from "../../KcContext";
import type { I18n } from "../../i18n";
import { Button } from "@/components/shadcn/button";
import { kcClassesMap } from "../userProfileClasses";


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
