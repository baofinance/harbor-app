"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DepositModalNotificationSeverity } from "@/components/depositModalNotificationStyles";

export type AppNotificationMeta = {
  id: string;
  count: number;
  badgeSeverities?: DepositModalNotificationSeverity[];
};

export type AppNotificationPayload = AppNotificationMeta & {
  body: ReactNode;
};

function notificationMetaEqual(
  a: AppNotificationMeta | null | undefined,
  b: AppNotificationMeta
): boolean {
  if (!a) return false;
  if (a.id !== b.id || a.count !== b.count) return false;
  const aSev = a.badgeSeverities ?? [];
  const bSev = b.badgeSeverities ?? [];
  if (aSev.length !== bSev.length) return false;
  return aSev.every((severity, index) => severity === bSev[index]);
}

type AppNotificationsContextValue = {
  source: AppNotificationMeta | null;
  body: ReactNode;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  register: (payload: AppNotificationPayload) => void;
  unregister: (id: string) => void;
};

const AppNotificationsContext =
  createContext<AppNotificationsContextValue | null>(null);

export function AppNotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [source, setSource] = useState<AppNotificationMeta | null>(null);
  const [body, setBody] = useState<ReactNode>(null);
  const [expanded, setExpanded] = useState(false);
  const sourceIdRef = useRef<string | null>(null);
  sourceIdRef.current = source?.id ?? null;

  const register = useCallback((payload: AppNotificationPayload) => {
    const meta: AppNotificationMeta = {
      id: payload.id,
      count: payload.count,
      badgeSeverities: payload.badgeSeverities,
    };
    setSource((prev) => (notificationMetaEqual(prev, meta) ? prev : meta));
    setBody(payload.body);
  }, []);

  const unregister = useCallback((id: string) => {
    if (sourceIdRef.current !== id) return;
    setSource(null);
    setBody(null);
    setExpanded(false);
  }, []);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      source,
      body,
      expanded,
      setExpanded,
      toggleExpanded,
      register,
      unregister,
    }),
    [source, body, expanded, toggleExpanded, register, unregister]
  );

  return (
    <AppNotificationsContext.Provider value={value}>
      {children}
    </AppNotificationsContext.Provider>
  );
}

export function useAppNotifications() {
  const ctx = useContext(AppNotificationsContext);
  if (!ctx) {
    throw new Error(
      "useAppNotifications must be used within AppNotificationsProvider"
    );
  }
  return ctx;
}

/** Optional — safe when provider is missing (tests / partial trees). */
export function useAppNotificationsOptional() {
  return useContext(AppNotificationsContext);
}

/**
 * Publish page/modal notifications to the nav bell strip.
 * Clears on unmount or when `enabled` becomes false.
 *
 * Important: do not depend on the whole context object — it changes when
 * `expanded` toggles, which would unregister and collapse the panel.
 */
export function useRegisterAppNotifications(
  id: string,
  payload: {
    count: number;
    badgeSeverities?: DepositModalNotificationSeverity[];
    body: ReactNode;
  },
  enabled: boolean
) {
  const ctx = useAppNotificationsOptional();
  const register = ctx?.register;
  const unregister = ctx?.unregister;
  const { count, badgeSeverities, body } = payload;

  const bodyRef = useRef(body);
  bodyRef.current = body;
  const severitiesRef = useRef(badgeSeverities);
  severitiesRef.current = badgeSeverities;

  useEffect(() => {
    if (!register || !enabled) return;
    register({
      id,
      count,
      badgeSeverities: severitiesRef.current,
      body: bodyRef.current,
    });
  }, [register, id, enabled, count, badgeSeverities, body]);

  useEffect(() => {
    if (!unregister) return;
    if (!enabled) {
      unregister(id);
      return;
    }
    return () => unregister(id);
  }, [unregister, id, enabled]);
}
