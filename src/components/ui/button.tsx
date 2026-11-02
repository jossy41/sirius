import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-base font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:bg-primary/90",
        secondary: "border border-line bg-paper text-ink hover:border-primary",
        ghost: "bg-transparent text-ink hover:bg-ink/5",
        danger: "bg-danger text-danger-fg hover:bg-danger/90",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, asChild = false, type = "button", ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant }), className);
  if (asChild) return <Slot className={classes} {...props} />;
  return <button type={type} className={classes} {...props} />;
}
