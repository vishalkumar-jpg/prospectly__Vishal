import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  user_id: string;
  type: "info" | "warning" | "error" | "success";
  priority: "low" | "medium" | "high";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Mock implementation since notifications table doesn't exist
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // Silently ignored
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Mock implementation
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently ignored
    }
  };

  const markAllAsRead = async () => {
    try {
      // Mock implementation
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    } catch {
      // Silently ignored
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
