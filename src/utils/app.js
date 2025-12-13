// 获取分类名称
export function getCategoryName(category) {
  const names = {
    recruitment: '职场招聘与人才发展',
    business_communication: '商务沟通与会议',
    business_transaction: '商务交易与合同',
    marketing: '市场营销与推广',
    logistics: '物流与运输',
    finance: '财务与会计',
    office_administration: '办公行政与文书',
    product_tech: '产品与技术',
    legal: '法律法规与政策',
    travel: '旅行与接待',
    education: '教育与培训',
    healthcare: '医疗与健康',
    construction: '建筑与设施',
    food: '餐饮与食品',
    arts: '艺术与文化',
    nature: '自然与环境',
    society: '社会与政府',
    psychology: '心理与情感',
    digital: '数字与科技',
    time: '时间与日期',
    communication: '商务沟通',
    items: '物品',
  };
  return names[category] || '背单词';
}
