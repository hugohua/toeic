import { useEffect } from 'react';
import { disableBodyScroll, enableBodyScroll } from '../utils/scroll';

/**
 * 根据条件禁用/启用页面滚动的 hook
 * 适用于浮层打开时禁用背景页面滚动
 * @param {boolean} shouldDisable - 是否禁用滚动
 */
export function useDisableScroll(shouldDisable) {
    useEffect(() => {
        if (shouldDisable) {
            disableBodyScroll();
        } else {
            enableBodyScroll();
        }

        return () => {
            // 清理函数：确保在组件卸载时恢复滚动
            enableBodyScroll();
        };
    }, [shouldDisable]);
}
