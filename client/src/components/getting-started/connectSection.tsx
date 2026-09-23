import type { ReactNode } from "react";

interface GettingStartedStepSectionHeaderProps {
  title: string;
  description: ReactNode;
  /** Extra actions in header row (e.g. refresh) */
  actions?: ReactNode;
}

export function GettingStartedStepSectionHeader({
  title,
  description,
  actions,
}: GettingStartedStepSectionHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight sm:text-[1.35rem]">
          {title}
        </h2>
        <p className="mt-1 text-[15px] text-muted-foreground">{description}</p>
      </div>
      {actions ? (
        <div className="flex shrink-0 justify-end">{actions}</div>
      ) : null}
    </div>
  );
}

interface GettingStartedConnectSectionProps {
  children: ReactNode;
  /** Extra actions in header row (e.g. refresh) */
  actions?: ReactNode;
}

export function GettingStartedConnectSection({
  children,
  actions,
}: GettingStartedConnectSectionProps) {
  return (
    <section id="connect-contacts" className="mb-8 scroll-mt-8">
      <GettingStartedStepSectionHeader
        title="Connect your contacts"
        description={
          <>
            Choose a source.{" "}
            <span className="font-semibold text-brand-rose">
              More connections = higher earning potential.
            </span>
          </>
        }
        actions={actions}
      />
      {children}
    </section>
  );
}
