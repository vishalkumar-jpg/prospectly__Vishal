import { useState, useCallback } from "react";
import { CalendarConnectModal } from "@/components/calendar/CalendarConnectModal";

/**
 * Dashboard / Find Prospects / Account Setup calendar modal.
 * Same stacked Connect UI as Post Job, without the “Required before posting” banner.
 */
export function useCalendarConnectModal(defaultReturnTo: string) {
  const [open, setOpen] = useState(false);
  const [returnTo, setReturnTo] = useState(defaultReturnTo);

  const openModal = useCallback(
    (nextReturnTo?: string) => {
      setReturnTo(nextReturnTo ?? defaultReturnTo);
      setOpen(true);
    },
    [defaultReturnTo]
  );

  const modal = (
    <CalendarConnectModal
      open={open}
      onOpenChange={setOpen}
      title="Connect Your Calendar"
      description="Enable seamless scheduling for your warm introduction meetings."
      returnTo={returnTo}
      variant="recruiting"
      allowDisconnect
    />
  );

  return { open, setOpen, openModal, modal };
}
