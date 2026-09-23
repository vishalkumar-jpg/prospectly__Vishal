import { ChevronRight, Settings } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SettingsRowProps = {
  title: string;
  description: string;
  cta: string;
  onClick?: () => void;
};

function SettingsRow({ title, description, cta, onClick }: SettingsRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 bg-card px-6 py-4 text-left transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
        {cta}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </span>
    </button>
  );
}

type DeleteAccountSettingsListProps = {
  // onExportClick: () => void;
  // onDataSharingClick: () => void;
  onDeleteClick: () => void;
};

export function DeleteAccountSettingsList({
  onDeleteClick,
}: DeleteAccountSettingsListProps) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-brand-amethyst/10 text-brand-amethyst">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-extrabold tracking-tight">
              Your data
            </CardTitle>
            <CardDescription>
              Export, privacy controls, and account removal
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col gap-px bg-border">
          {/* Commented out per request: hide these two sections for now.
          <SettingsRow
            title="Export your data"
            description="Download a copy of your contacts, introductions, and payment history"
            cta="Request Export"
            onClick={onExportClick}
          />
          <SettingsRow
            title="Data sharing preferences"
            description="Control how Prospectly uses your activity data"
            cta="Manage"
            onClick={onDataSharingClick}
          />
          */}
          <SettingsRow
            title="Delete account"
            description="Permanently remove your account and all data. You can cancel within 24 hours of confirming."
            cta="Delete"
            onClick={onDeleteClick}
          />
        </div>
      </CardContent>
    </Card>
  );
}
