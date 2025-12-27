/**
 * 禁用页面滚动
 * 适用于移动端浮层打开时禁用背景页面滚动
 */
export function disableBodyScroll() {
  // 保存当前滚动位置
  const scrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
  document.body.style.overflow = 'hidden';
}

/**
 * 启用页面滚动
 * 恢复之前保存的滚动位置
 */
export function enableBodyScroll() {
  // 恢复滚动位置
  const scrollY = document.body.style.top;
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.style.overflow = '';
  if (scrollY) {
    // scrollY 格式为 "-100px"，需要提取数字并取反
    const scrollValue = parseInt(scrollY.replace('px', ''), 10) || 0;
    window.scrollTo(0, Math.abs(scrollValue));
  }
}

