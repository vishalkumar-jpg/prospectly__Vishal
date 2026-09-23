import {
  EmailPreferencesForm,
  ProfileEmailPreferencesCard,
} from "@/components/profile/EmailPreferencesSection";
import {
  useNotificationPreferencesMe,
  useSaveNotificationPreferencesMe,
} from "@/hooks/useNotificationPreferences";
import { useToast } from "@/hooks/use-toast";

export function ProfileEmailPreferencesSection() {
  const { data, isLoading } = useNotificationPreferencesMe();
  const saveMutation = useSaveNotificationPreferencesMe();
  const { toast } = useToast();

  return (
    <ProfileEmailPreferencesCard maskedEmail={data?.maskedEmail}>
      <EmailPreferencesForm
        variant="profile"
        maskedEmail={data?.maskedEmail}
        unsubscribeAll={data?.unsubscribeAll ?? false}
        categories={data?.categories ?? []}
        isLoading={isLoading}
        isSaving={saveMutation.isPending}
        onSave={async (body) => {
          await saveMutation.mutateAsync(body);
          toast({
            title: "Preferences saved",
            description: "Your email notification settings were updated.",
          });
        }}
      />
    </ProfileEmailPreferencesCard>
  );
}
