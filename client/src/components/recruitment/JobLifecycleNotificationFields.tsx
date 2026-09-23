import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { JobCloseStageMultiSelect } from "@/components/recruitment/JobCloseStageMultiSelect";

interface JobLifecycleNotificationFieldsProps {
  checkboxId: string;
  sendNotifications: boolean;
  onSendNotificationsChange: (enabled: boolean) => void;
  notifyStages: string[];
  onNotifyStagesChange: (stages: string[]) => void;
  disabled?: boolean;
  enabledDescription: string;
  disabledDescription: string;
}

export function JobLifecycleNotificationFields({
  checkboxId,
  sendNotifications,
  onSendNotificationsChange,
  notifyStages,
  onNotifyStagesChange,
  disabled = false,
  enabledDescription,
  disabledDescription,
}: JobLifecycleNotificationFieldsProps) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <label
        htmlFor={checkboxId}
        className="flex cursor-pointer items-center gap-2.5"
      >
        <Checkbox
          id={checkboxId}
          checked={sendNotifications}
          onCheckedChange={(checked) => {
            const enabled = checked === true;
            onSendNotificationsChange(enabled);
            if (!enabled) onNotifyStagesChange([]);
          }}
          disabled={disabled}
        />
        <span className="text-sm font-semibold leading-none">
          Send email notifications
        </span>
      </label>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {sendNotifications ? enabledDescription : disabledDescription}
      </p>

      {sendNotifications ? (
        <div className="space-y-2 border-t border-border pt-3">
          <Label
            htmlFor={`${checkboxId}-stages`}
            className="text-sm font-medium"
          >
            Notify candidates in these stages
          </Label>
          <JobCloseStageMultiSelect
            id={`${checkboxId}-stages`}
            value={notifyStages}
            onChange={onNotifyStagesChange}
            disabled={disabled}
          />
        </div>
      ) : null}
    </div>
  );
}
