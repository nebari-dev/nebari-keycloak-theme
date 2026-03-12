import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";

export default function LoginVerifyEmail(props: PageProps<Extract<KcContext, { pageId: "login-verify-email.ftl" }>, I18n>) {
    const { kcContext, i18n, Template } = props;
    const { url, user } = kcContext;
    const { msg, msgStr } = i18n;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={false}
            classes={undefined}
            displayInfo
            headerNode={msg("emailVerifyTitle")}
            infoNode={
                <p>
                    {msg("emailVerifyInstruction2")}{" "}
                    <a href={url.loginAction} className="nebari-link">
                        {msgStr("doClickHere")}
                    </a>{" "}
                    {msg("emailVerifyInstruction3")}
                </p>
            }
        >
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
                {/* Email icon */}
                <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: "rgba(155, 61, 204, 0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 1.25rem"
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--nebari-purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                    </svg>
                </div>
                <p className="nebari-subtitle" style={{ marginBottom: 0 }}>
                    {msg("emailVerifyInstruction1", user?.email ?? "")}
                </p>
            </div>
        </Template>
    );
}
