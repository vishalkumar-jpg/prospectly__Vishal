import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RecruitmentEmailLogsModal } from "./RecruitmentEmailLogsModal";
import type { RecruitmentEmailLogsAudience } from "@/lib/api/recruitment-email-logs";

type RecruitmentEmailLogsButtonProps = {
  audience: RecruitmentEmailLogsAudience;
  candidateId?: string;
  poolMatchId?: string;
  className?: string;
};

export function RecruitmentEmailLogsButton({
  audience,
  candidateId,
  poolMatchId,
  className,
}: RecruitmentEmailLogsButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "h-9 w-full min-w-0 gap-1.5 rounded-xl border-border text-[13px] font-semibold",
          className
        )}
        onClick={() => setOpen(true)}
      >
        <Mail className="h-4 w-4" />
        Emails
      </Button>
      <RecruitmentEmailLogsModal
        open={open}
        onOpenChange={setOpen}
        audience={audience}
        candidateId={candidateId}
        poolMatchId={poolMatchId}
      />
    </>
  );
}
