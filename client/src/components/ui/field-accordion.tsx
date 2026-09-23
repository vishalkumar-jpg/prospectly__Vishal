import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * FieldAccordion — a single-open accordion for grouping long-form fields
 * (rich text editors, large textareas) so a page doesn't grow unbounded.
 *
 * Built on @radix-ui/react-accordion (same primitive as `accordion.tsx`) so
 * open/close behaviour and keyboard a11y stay consistent across the app.
 * Opening one item collapses the previously open one; clicking the open item
 * collapses it (none open).
 *
 * Errors are surfaced on the (collapsed) header via `hasError` / `errorHint`
 * so required-field validation stays visible even when a panel is closed.
 */

interface FieldAccordionProps {
  /** Controlled value — the `value` of the currently open item ("" = none). */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
}

const FieldAccordion = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Root>,
  FieldAccordionProps
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Root
    ref={ref}
    type="single"
    collapsible
    className={cn("flex flex-col gap-3", className)}
    {...props}
  />
));
FieldAccordion.displayName = "FieldAccordion";

interface FieldAccordionItemProps {
  /** Unique value used to control which item is open. */
  value: string;
  /** Leading icon (lucide), shown in a rounded tile. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: string;
  required?: boolean;
  /** Trailing badge content, e.g. a live character count. */
  badge?: React.ReactNode;
  /** When true, shows a green check (field satisfies its minimum). */
  complete?: boolean;
  /** When true, the header shows an error state (red ring + alert). */
  hasError?: boolean;
  /** Short message shown in the header while errored (replaces subtitle). */
  errorHint?: string;
  className?: string;
  children: React.ReactNode;
}

const FieldAccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  FieldAccordionItemProps
>(
  (
    {
      value,
      icon,
      title,
      subtitle,
      required,
      badge,
      complete,
      hasError,
      errorHint,
      className,
      children,
    },
    ref
  ) => (
    <AccordionPrimitive.Item
      ref={ref}
      value={value}
      className={cn(
        "group overflow-hidden rounded-2xl border bg-card transition-all",
        hasError
          ? "border-destructive"
          : "border-border data-[state=open]:border-brand-amethyst data-[state=open]:shadow-brand-card",
        className
      )}
    >
      <AccordionPrimitive.Header className="flex">
        <AccordionPrimitive.Trigger
          aria-invalid={hasError || undefined}
          className="flex flex-1 items-center gap-3 px-4 py-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          {icon != null && (
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors [&_svg]:h-[18px] [&_svg]:w-[18px]",
                hasError
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground group-data-[state=open]:bg-brand-gradient group-data-[state=open]:text-brand-foreground"
              )}
            >
              {icon}
            </span>
          )}

          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-foreground">
              {title}
              {required && <span className="text-brand-rose">*</span>}
            </span>
            {hasError && errorHint ? (
              // Only shown while collapsed — when open, the inline error below
              // the field is visible, so hiding this avoids a duplicate message.
              <span className="mt-0.5 flex items-center gap-1 truncate text-xs font-medium text-destructive group-data-[state=open]:hidden">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errorHint}
              </span>
            ) : subtitle ? (
              <span className="mt-0.5 truncate text-xs text-muted-foreground">
                {subtitle}
              </span>
            ) : null}
          </span>

          {complete && !hasError && (
            <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-brand-success" />
          )}
          {badge != null && (
            <span className="hidden shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-[10.5px] font-semibold tabular-nums text-muted-foreground sm:inline-block">
              {badge}
            </span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>

      <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="px-4 pb-4 pt-0">{children}</div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  )
);
FieldAccordionItem.displayName = "FieldAccordionItem";

export { FieldAccordion, FieldAccordionItem };
