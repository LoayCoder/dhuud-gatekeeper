import { useState, useEffect } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    defaultCountry?: string; // e.g. "SA"
    disabled?: boolean;
}

export function DhuudPhoneInput({
    value,
    onChange,
    placeholder,
    className,
    defaultCountry = "SA",
    disabled,
}: PhoneInputProps) {
    const { i18n } = useTranslation();
    const isRTL = i18n.language === "ar";

    // We need to override some styles to match shadcn/ui
    // and handle RTL for the input specifically if needed

    return (
        <div className={cn("flex", className)} dir="ltr">
            <PhoneInput
                international
                defaultCountry={defaultCountry as any}
                value={value}
                onChange={(v) => onChange(v as string)}
                placeholder={placeholder}
                disabled={disabled}
                numberInputProps={{
                    className: cn(
                        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        // The phone input library puts the country select before this input
                        // We want to make sure it looks integrated
                        "rounded-s-none border-s-0",
                    ),
                }}
                // Customizing the country select button container if possible, 
                // or we can use the `countrySelectComponent` prop for full control.
                // For now, let's use the default but style the container via CSS classes 
                // passed to the root container if the library supports it. 
                // `react-phone-number-input` structure is: .PhoneInput > .PhoneInputCountry + .PhoneInputInput

                className={cn(
                    "flex w-full items-center",
                    // Style the country selector part
                    "[&_.PhoneInputCountry]:border [&_.PhoneInputCountry]:border-input [&_.PhoneInputCountry]:border-e-0 [&_.PhoneInputCountry]:rounded-s-md [&_.PhoneInputCountry]:bg-background [&_.PhoneInputCountry]:px-3 [&_.PhoneInputCountry]:hover:bg-accent/50 [&_.PhoneInputCountry]:transition-colors",
                    // Focus styles for the country selector (it's a button usually)
                    "[&_.PhoneInputCountrySelect]:focus-visible:ring-2 [&_.PhoneInputCountrySelect]:focus-visible:ring-ring [&_.PhoneInputCountrySelect]:focus-visible:ring-offset-2",
                    // Make the arrow smaller
                    "[&_.PhoneInputCountrySelectArrow]:opacity-50",
                    // RTL specifics if any - forcing LTR for phone numbers is usually best practice
                )}
            />
        </div>
    );
}
