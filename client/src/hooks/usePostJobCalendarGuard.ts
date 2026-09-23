import { useState, useCallback, useEffect, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useCalendarRequirement } from "@/hooks/useCalendarRequirement";
import { POST_A_JOB_PATH } from "@/constants/recruitment-routes";

export function usePostJobCalendarGuard() {
  const navigate = useNavigate();
  const { hasCalendar, loading, refreshCalendarStatus } =
    useCalendarRequirement();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const attemptPostJobNavigation = useCallback(
    (event?: MouseEvent) => {
      event?.preventDefault();

      if (loading) {
        return;
      }

      if (hasCalendar) {
        navigate(POST_A_JOB_PATH);
        return;
      }

      setIsModalOpen(true);
    },
    [hasCalendar, loading, navigate, refreshCalendarStatus]
  );

  useEffect(() => {
    if (isModalOpen) {
      refreshCalendarStatus();
    }
  }, [isModalOpen, refreshCalendarStatus]);

  return {
    hasCalendar,
    loading,
    isModalOpen,
    setIsModalOpen,
    attemptPostJobNavigation,
    refreshCalendarStatus,
    postJobReturnTo: POST_A_JOB_PATH,
  };
}
