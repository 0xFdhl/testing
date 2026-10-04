export type ResolvedPushState = "default" | "granted" | "denied";

export function resolvePushState(
  permission: NotificationPermission,
  hasSubscription: boolean,
): ResolvedPushState {
  if (permission === "denied") return "denied";
  if (permission === "granted" && hasSubscription) return "granted";
  return "default";
}
