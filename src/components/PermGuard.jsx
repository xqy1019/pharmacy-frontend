import { usePermission } from '../hooks/usePermission';

/**
 * 权限守卫组件 - 仅当用户拥有指定权限时渲染子内容
 *
 * @param {string}   perm      - 单个权限码（任一满足即可）
 * @param {string[]} perms     - 权限码数组（任一满足即可）
 * @param {string}   role      - 单个角色码
 * @param {string[]} roles     - 角色码数组（任一满足即可）
 * @param {boolean}  all       - 为 true 时要求 perms 全部满足（默认 false）
 * @param {*}        fallback  - 无权限时渲染的内容（默认 null）
 */
export default function PermGuard({ perm, perms, role, roles, all = false, fallback = null, children }) {
  const { hasPerm, hasRole } = usePermission();

  // 权限检查
  const permList = perm ? [perm] : perms || [];
  const roleList = role ? [role] : roles || [];

  const permOk =
    permList.length === 0
      ? true
      : all
        ? permList.every((p) => hasPerm(p))
        : permList.some((p) => hasPerm(p));

  const roleOk =
    roleList.length === 0
      ? true
      : roleList.some((r) => hasRole(r));

  if (!permOk || !roleOk) return fallback;
  return children;
}
