import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Info } from "lucide-react";
import { useCallback } from "react";
import type { JobFormData, UpdateJobFormData } from "./types";
import type { StepErrors } from "./validation";
import OrgMultiSelect from "../components/OrgMultiSelect";

interface NotifyStepProps {
  formData: JobFormData;
  updateFormData: UpdateJobFormData;
  stepErrors?: StepErrors;
  onClearError?: (field: string) => void;
}

export default function NotifyStep({
  formData,
  updateFormData,
  stepErrors = {},
  onClearError,
}: NotifyStepProps) {
  const orgError = stepErrors.organisationIds;

  const handleToggle = useCallback(
    (checked: boolean) => {
      updateFormData({ notifyUsers: checked });
      if (!checked) onClearError?.("organisationIds");
    },
    [updateFormData, onClearError]
  );

  const handleOrgsChange = useCallback(
    (ids: string[]) => {
      updateFormData({ organisationIds: ids });
      if (ids.length > 0) onClearError?.("organisationIds");
    },
    [updateFormData, onClearError]
  );

  return (
    <div className="space-y-6">
      <div className="text-left mb-4 sm:mb-6 lg:mb-8">
        <h2 className="text-2xl font-extrabold text-foreground">
          Notify Organization
        </h2>
        <p className="text-muted-foreground mt-2">
          Optionally email members of selected Organization as soon as this job
          is posted.
        </p>
      </div>

      <div className="w-full space-y-6">
        <div className="bg-brand-amethyst/10 rounded-lg p-3 flex items-start gap-2 text-xs text-brand-amethyst">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            The notification is sent in the background after the job is posted.
            A job can only be notified once — you can also send it later from
            the My Job Posts page if you skip this now.
          </p>
        </div>

        <Card
          className={
            formData.notifyUsers
              ? "rounded-2xl border-2 border-brand-amethyst/30 shadow-brand-card"
              : "rounded-2xl border-2 border-border shadow-brand-card"
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-brand-amethyst" />
              Job Post Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <Checkbox
                id="notify-users-toggle"
                checked={formData.notifyUsers}
                onCheckedChange={(checked) => handleToggle(checked === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground leading-snug">
                Notify users about this job
              </span>
            </label>

            {formData.notifyUsers && (
              <div className="space-y-2 pt-2 border-t border-border">
                <Label htmlFor="notify-organisations">
                  Organizations <span className="text-brand-rose">*</span>
                </Label>
                <OrgMultiSelect
                  value={formData.organisationIds}
                  onChange={handleOrgsChange}
                />
                <p
                  className={
                    orgError
                      ? "text-xs text-destructive"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {orgError ??
                    "Every active member of the selected Organization will receive an email about this job."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
