<#--
    Keycloakify gathers messages while serializing kcContext, but a custom message
    key that is only referenced by React is not otherwise visible to that process.
    Add the realm-localized branding payload to x-keycloakify exactly once so the
    login application can read it before authentication.

    This snippet is injected into Keycloakify's serialization loop through the
    kcContextExclusionsFtl extension point. It does not exclude any kcContext data.
-->
<#if
    xKeycloakify.themeType == "login" &&
    areSamePath(path, []) &&
    key == "url"
>
    <@addToXKeycloakifyMessagesIfMessageKey str="nebariBrandingConfig" />
</#if>
