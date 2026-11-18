"use client";
import {
  DEFAULT_ROLES,
  canAccessPermission,
  normalizeUserPermissions,
  USER_PERMISSIONS_CHANGED_EVENT,
  type Permission,
  type UserPermissionOverrides,
} from "./permissions";
import { KEYS, useLocalState } from "./storage";
import type { RoleId } from "./types";
import { useEffect } from "react";

/** คืนฟังก์ชันเช็คว่าผู้ใช้ที่ล็อกอินมีสิทธิ์นั้นหรือไม่ */
export function useCan() {
  const [role, , roleReady] = useLocalState<RoleId | null>(KEYS.role, null);
  const [roles, , rolesReady] = useLocalState(KEYS.roles, DEFAULT_ROLES);
  const [username, setUsername, usernameReady] = useLocalState<string | null>(
    KEYS.username,
    null,
  );
  const [userPermissions, setUserPermissions, userPermissionsReady] =
    useLocalState<UserPermissionOverrides>(KEYS.permissions, {});
  const currentUsername =
    username ??
    (usernameReady ? localStorage.getItem("currentUser") : null);

  useEffect(() => {
    if (!usernameReady) return;
    if (username) return;
    const legacyUsername = localStorage.getItem("currentUser");
    if (legacyUsername) setUsername(legacyUsername);
  }, [setUsername, username, usernameReady]);

  useEffect(() => {
    const normalized = normalizeUserPermissions(userPermissions);
    if (JSON.stringify(normalized) !== JSON.stringify(userPermissions)) {
      setUserPermissions(normalized);
    }
  }, [setUserPermissions, userPermissions]);

  useEffect(() => {
    const syncUserPermissions = (event: Event) => {
      const updatedPermissions = (
        event as CustomEvent<UserPermissionOverrides>
      ).detail;
      if (updatedPermissions) {
        setUserPermissions(normalizeUserPermissions(updatedPermissions));
      }
    };

    window.addEventListener(USER_PERMISSIONS_CHANGED_EVENT, syncUserPermissions);
    return () => {
      window.removeEventListener(
        USER_PERMISSIONS_CHANGED_EVENT,
        syncUserPermissions,
      );
    };
  }, [setUserPermissions]);

  return (permission: Permission) =>
    Boolean(
      role &&
        roleReady &&
        rolesReady &&
        usernameReady &&
        userPermissionsReady &&
        canAccessPermission(
          role,
          permission,
          roles,
          userPermissions,
          currentUsername,
        ),
    );
}