// 分类缓存
let categoryCache = null;
let categoryCachePromise = null;

// 从 API 加载分类数据到缓存
async function loadCategoryCache() {
  if (categoryCache) {
    return categoryCache;
  }

  if (categoryCachePromise) {
    return categoryCachePromise;
  }

  categoryCachePromise = (async () => {
    try {
      const { getCategories } = await import('../services/api');
      const cats = await getCategories();
      categoryCache = {};
      cats.forEach((cat) => {
        categoryCache[cat.name] = {
          key: cat.name,
          icon: cat.icon || '📚',
          name: cat.display_name || cat.name,
          desc: cat.desc || '',
        };
      });
      return categoryCache;
    } catch (error) {
      console.error('加载分类缓存失败:', error);
      categoryCache = {};
      return categoryCache;
    } finally {
      categoryCachePromise = null;
    }
  })();

  return categoryCachePromise;
}

// 获取分类名称（同步函数，使用缓存）
// 注意：如果缓存未加载，会返回默认值，并触发异步加载
export function getCategoryName(category) {
  if (!category) {
    return '背单词';
  }

  // 如果缓存已加载，直接使用
  if (categoryCache && categoryCache[category]) {
    return categoryCache[category].name;
  }

  // 如果缓存未加载，触发异步加载（但不阻塞）
  if (!categoryCachePromise) {
    loadCategoryCache().catch(() => {
      // 静默处理错误，已在 loadCategoryCache 中记录
    });
  }

  // 返回默认值（通常是 category key 本身）
  return category || '背单词';
}

// 初始化分类缓存（异步）- 建议在应用启动时调用
export async function initCategoryCache() {
  await loadCategoryCache();
}

// 获取所有分类列表（使用缓存）
export async function getAllCategories() {
  const cache = await loadCategoryCache();
  return Object.values(cache);
}

export function getFirstSlashContent(str) {
  if (!str) return '';
  // 使用正则表达式匹配第一个完整的 /.../ 结构
  const regex = /\/([^\/]*)\//;
  const match = str.match(regex);
  // 如果匹配成功，返回整个匹配的字符串（包括两边的斜杠）
  return match ? match[0] : '';
}
