import { useAuth } from '../context/AuthContext';

/**
 * 权限检查 hook
 * @returns {{ hasPerm, hasRole, hasAnyPerm, hasAnyRole }}
 */
export function usePermission() {
  const { user } = useAuth();
  const permissions = user?.permissions || [];
  const roles = user?.roles || [];

  /** 是否拥有某权限码 */
  function hasPerm(perm) {
    if (!perm) return true;
    return permissions.includes(perm);
  }

  /** 是否拥有某角色码 */
  function hasRole(role) {
    if (!role) return true;
    return roles.includes(role);
  }

  /** 是否拥有列表中任一权限 */
  function hasAnyPerm(...perms) {
    return perms.some((p) => permissions.includes(p));
  }

  /** 是否拥有列表中任一角色 */
  function hasAnyRole(...roleList) {
    return roleList.some((r) => roles.includes(r));
  }

  return { hasPerm, hasRole, hasAnyPerm, hasAnyRole, permissions, roles };
}
