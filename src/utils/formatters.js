export function formatNumber(value) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) {
    return '--';
  }

  return new Intl.NumberFormat('zh-CN').format(num);
}

export function formatPercent(value, digits = 1) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) {
    return '--';
  }

  return `${num.toFixed(digits)}%`;
}

export function formatDateTime(value) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function formatDate(value) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function flattenCategoryTree(nodes = [], level = 0) {
  return nodes.flatMap((node) => [
    { ...node, level },
    ...flattenCategoryTree(node.children || [], level + 1)
  ]);
}
