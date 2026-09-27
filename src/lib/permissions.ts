import { UserRole, RefillState } from '@prisma/client';

export const ROLE_PERMISSIONS = {
  PHARMACY_STAFF: ['view_refill', 'submit_refill', 'notify_pharmacy', 'transition_refill'],
  PRACTICE_STAFF: ['view_refill', 'assign_task', 'request_information', 'notify_provider', 'notify_patient', 'transition_refill', 'escalate_refill'],
  PROVIDER: ['view_refill', 'review_refill', 'approve_refill', 'transition_refill'],
  ADMIN: ['view_refill', 'assign_task', 'request_information', 'notify_provider', 'notify_pharmacy', 'notify_patient', 'transition_refill', 'escalate_refill', 'manage_users'],
} as const satisfies Record<UserRole, readonly string[]>;

export type Permission = (typeof ROLE_PERMISSIONS)[UserRole][number];

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
}

export function canRoleTransition(role: UserRole, from: RefillState, to: RefillState): boolean {
  if (role === UserRole.ADMIN) return true;
  if (to === RefillState.RESOLVED) return role === UserRole.PHARMACY_STAFF;
  if (role === UserRole.PROVIDER) return to === RefillState.APPROVAL_RECEIVED || to === RefillState.IN_REVIEW || to === RefillState.ESCALATED;
  if (role === UserRole.PHARMACY_STAFF) return to === RefillState.PHARMACY_REVIEW || to === RefillState.PHARMACY_PROCESSING;
  return to !== RefillState.APPROVAL_RECEIVED;
}
