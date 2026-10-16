<#--
    Keycloakify gathers messages while serializing kcContext, but a custom message
    key that is only referenced by React is not otherwise visible to that process.
    Add the realm-localized branding payload to x-keycloakify exactly once so the
    login application can read it before authentication.

    The same goes for the keys a child theme lists in `messageOverrides` in its
    theme.properties. The login strings are bundled into this theme's JavaScript,
    so neither a child theme's messages_*.properties nor a realm's localization
    overrides reach them otherwise. Keycloak resolves each listed key itself
    (realm override, then the child theme's messages, then the parent's), and
    Keycloakify ranks server-sent messages above the bundled ones. The macro
    accepts only keys of [a-zA-Z0-9-_.] up to 200 characters.

    This snippet is injected into Keycloakify's serialization loop through the
    kcContextExclusionsFtl extension point. It does not exclude any kcContext data.
-->
<#if
    xKeycloakify.themeType == "login" &&
    areSamePath(path, []) &&
    key == "url"
>
    <@addToXKeycloakifyMessagesIfMessageKey str="nebariBrandingConfig" />
    <#list (properties.messageOverrides!"")?split(" ") as messageKey>
        <#if messageKey?trim?has_content>
            <@addToXKeycloakifyMessagesIfMessageKey str=messageKey?trim />
        </#if>
    </#list>
</#if>
