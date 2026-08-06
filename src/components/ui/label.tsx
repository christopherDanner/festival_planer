import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* Formular-Regel Vision §4: Labels 10.5px Versalien in Tinte-soft */
const labelVariants = cva(
  "text-[10.5px] uppercase text-tinte-soft leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        default: "font-semibold tracking-[.08em]",
        /* Versalien-Kleinlabel der Dialoge — Public Sans 800, .06em
           (Prototyp `.fld label`, #117). */
        kleinlabel: "font-extrabold tracking-[.06em]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, variant, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants({ variant }), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
