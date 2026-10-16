/**
 * `UserProfileFormFields` renders bare elements and asks for the class names to
 * put on them, so the shadcn look is supplied here as utility strings rather
 * than by swapping in components. Keep these in step with
 * `src/components/shadcn/{input,label}.tsx` if those are regenerated.
 */
export const kcClassesMap = {
    kcFormGroupClass: "flex w-full flex-col gap-3",
    /* `UserProfileFormFields` renders the required marker as a text node next to
       the label, so the wrapper is the flex row that keeps them on one line. */
    kcLabelClass: "text-sm leading-none font-medium select-none",
    kcLabelWrapperClass: "flex items-center gap-1",
    kcInputClass:
        "border-input bg-muted flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
    kcInputWrapperClass: "",
    kcInputErrorMessageClass: "text-destructive text-sm font-normal",
    kcInputHelperTextBeforeClass: "text-muted-foreground text-sm",
    kcInputHelperTextAfterClass: "text-muted-foreground text-sm",
    kcContentWrapperClass: "",
    kcInputGroup: "kc-input-group",
    kcFormPasswordVisibilityButtonClass: "kc-password-toggle",
    kcFormPasswordVisibilityIconShow: "kc-password-icon",
    kcFormPasswordVisibilityIconHide: "kc-password-icon kc-password-icon-hide",

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
