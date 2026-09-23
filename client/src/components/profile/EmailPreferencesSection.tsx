import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CreditCard,
  Handshake,
  Loader2,
  Mail,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotificationPreferenceCategory } from "@/lib/api/notification-preferences";

type EmailPreferencesFormProps = {
  variant?: "profile" | "public";
  maskedEmail?: string;
  unsubscribeAll: boolean;
  categories: NotificationPreferenceCategory[];
  isLoading?: boolean;
  isSaving?: boolean;
  onSave: (payload: {
    categories: { categoryId: string; enabled: boolean }[];
    unsubscribeAll: boolean;
  }) => Promise<void>;
};

const GROUP_ICONS: Record<string, LucideIcon> = {
  Recruitment: Building2,
  Prospect: Handshake,
  "Billing & payouts": CreditCard,
  "Getting started": Sparkles,
};

function groupCategories(categories: NotificationPreferenceCategory[]) {
  const map = new Map<string, NotificationPreferenceCategory[]>();
  for (const cat of categories) {
    const list = map.get(cat.groupLabel) ?? [];
    list.push(cat);
    map.set(cat.groupLabel, list);
  }
  return Array.from(map.entries());
}

export function EmailPreferencesForm({
  variant = "profile",
  maskedEmail,
  unsubscribeAll: initialUnsubscribeAll,
  categories,
  isLoading,
  isSaving,
  onSave,
}: EmailPreferencesFormProps) {
  const [unsubscribeAll, setUnsubscribeAll] = useState(initialUnsubscribeAll);
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setUnsubscribeAll(initialUnsubscribeAll);
    const next: Record<string, boolean> = {};
    for (const cat of categories) {
      next[cat.id] = cat.enabled;
    }
    setEnabledMap(next);
  }, [categories, initialUnsubscribeAll]);

  const visibleCategories = useMemo(
    () => categories.filter((cat) => !cat.isMandatory),
    [categories]
  );

  const grouped = useMemo(
    () => groupCategories(visibleCategories),
    [visibleCategories]
  );

  const isChecked = (cat: NotificationPreferenceCategory) => {
    if (cat.isMandatory) return true;
    if (unsubscribeAll) return false;
    return enabledMap[cat.id] ?? true;
  };

  const handleToggle = (cat: NotificationPreferenceCategory) => {
    if (cat.isMandatory) return;
    setUnsubscribeAll(false);
    setEnabledMap((prev) => ({
      ...prev,
      [cat.id]: !(prev[cat.id] ?? true),
    }));
  };

  const handleSave = async () => {
    const allOptionalEnabled = categories
      .filter((c) => !c.isMandatory)
      .every((c) => enabledMap[c.id] ?? true);

    await onSave({
      unsubscribeAll: allOptionalEnabled ? false : unsubscribeAll,
      categories: categories.map((cat) => ({
        categoryId: cat.id,
        enabled: cat.isMandatory ? true : (enabledMap[cat.id] ?? true),
      })),
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-amethyst" />
      </div>
    );
  }

  if (variant === "public") {
    return (
      <div className="space-y-3.5">
        {grouped.map(([groupLabel, items]) => (
          <div
            key={groupLabel}
            className="overflow-hidden rounded-[0.875rem] border border-border"
          >
            <div className="border-b border-border bg-muted/60 px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {groupLabel}
            </div>
            <div className="grid gap-2.5 p-3.5 md:grid-cols-2">
              {items.map((cat) => {
                const checked = isChecked(cat);
                return (
                  <label
                    key={cat.id}
                    className={cn(
                      "relative cursor-pointer rounded-[0.625rem] border p-3.5 transition-colors",
                      checked &&
                        "border-brand-amethyst/50 bg-brand-amethyst/[0.04]",
                      !checked &&
                        "border-border hover:border-brand-amethyst/40"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggle(cat)}
                      className="absolute right-3 top-3 h-4 w-4 accent-brand-amethyst"
                      aria-label={cat.name}
                    />
                    <p className="pr-6 text-sm font-semibold">{cat.name}</p>
                    {cat.description ? (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {cat.description}
                      </p>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="mt-5 w-full bg-brand-gradient text-white"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save preferences"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([groupLabel, items]) => {
        const GroupIcon = GROUP_ICONS[groupLabel] ?? Mail;
        return (
          <div
            key={groupLabel}
            className="overflow-hidden rounded-[0.875rem] border border-border"
          >
            <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-3.5">
              <GroupIcon className="h-[18px] w-[18px] text-brand-amethyst" />
              <h3 className="text-[0.9375rem] font-bold">{groupLabel}</h3>
            </div>
            <div className="grid gap-3 p-4 grid-cols-1 xl:grid-cols-2">
              {items.map((cat) => {
                const checked = isChecked(cat);
                return (
                  <label
                    key={cat.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                      checked &&
                        "border-brand-amethyst/35 bg-brand-amethyst/[0.03]",
                      !checked &&
                        "border-border hover:border-brand-amethyst/35 hover:bg-brand-amethyst/[0.03]"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggle(cat)}
                      className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-brand-amethyst"
                      aria-label={cat.name}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.9375rem] font-semibold">{cat.name}</p>
                      {cat.description ? (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {cat.description}
                        </p>
                      ) : null}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="border-t border-border pt-5">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-brand-gradient text-white"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}

export function ProfileEmailPreferencesCard({
  maskedEmail,
  children,
}: {
  maskedEmail?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-[960px] rounded-2xl border border-border bg-card shadow-sm">
      <div className="px-6 pb-0 pt-5">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <Mail className="h-5 w-5 text-brand-amethyst" />
          Email Preferences
        </h2>
      </div>
      <div className="px-6 pb-6">{children}</div>
    </div>
  );
}
