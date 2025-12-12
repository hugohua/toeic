import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getCategoryName } from '../utils/app';

const categories = [
  {
    key: 'recruitment',
    icon: '👔',
    name: '职场招聘与人才发展',
    desc: '招聘、面试、人才管理等职场相关词汇',
  },
  {
    key: 'business_communication',
    icon: '💼',
    name: '商务沟通与会议',
    desc: '商务会议、沟通、谈判等场景词汇',
  },
  {
    key: 'business_transaction',
    icon: '🤝',
    name: '商务交易与合同',
    desc: '交易、合同、协议等商务场景词汇',
  },
  {
    key: 'marketing',
    icon: '📢',
    name: '市场营销与推广',
    desc: '营销、推广、广告等市场相关词汇',
  },
  {
    key: 'logistics',
    icon: '🚚',
    name: '物流与运输',
    desc: '物流、运输、配送等相关词汇',
  },
  {
    key: 'finance',
    icon: '💰',
    name: '财务与会计',
    desc: '财务、会计、投资等金融相关词汇',
  },
  {
    key: 'office_administration',
    icon: '📋',
    name: '办公行政与文书',
    desc: '办公、行政、文书处理等相关词汇',
  },
  {
    key: 'product_tech',
    icon: '💻',
    name: '产品与技术',
    desc: '产品开发、技术、研发等相关词汇',
  },
  {
    key: 'legal',
    icon: '⚖️',
    name: '法律法规与政策',
    desc: '法律、法规、政策等相关词汇',
  },
  {
    key: 'travel',
    icon: '✈️',
    name: '旅行与接待',
    desc: '旅行、接待、酒店等相关词汇',
  },
  {
    key: 'education',
    icon: '📚',
    name: '教育与培训',
    desc: '教育、培训、学习等相关词汇',
  },
  {
    key: 'healthcare',
    icon: '🏥',
    name: '医疗与健康',
    desc: '医疗、健康、保健等相关词汇',
  },
  {
    key: 'construction',
    icon: '🏗️',
    name: '建筑与设施',
    desc: '建筑、设施、工程等相关词汇',
  },
  {
    key: 'food',
    icon: '🍽️',
    name: '餐饮与食品',
    desc: '餐饮、食品、烹饪等相关词汇',
  },
  {
    key: 'arts',
    icon: '🎨',
    name: '艺术与文化',
    desc: '艺术、文化、娱乐等相关词汇',
  },
  {
    key: 'nature',
    icon: '🌳',
    name: '自然与环境',
    desc: '自然、环境、生态等相关词汇',
  },
  {
    key: 'society',
    icon: '🏛️',
    name: '社会与政府',
    desc: '社会、政府、公共事务等相关词汇',
  },
  {
    key: 'psychology',
    icon: '🧠',
    name: '心理与情感',
    desc: '心理、情感、情绪等相关词汇',
  },
  {
    key: 'digital',
    icon: '🔢',
    name: '数字与科技',
    desc: '数字、科技、信息技术等相关词汇',
  },
  {
    key: 'time',
    icon: '📅',
    name: '时间与日期',
    desc: '时间、日期、日程等相关词汇',
  },
];

function HomePage() {
  const navigate = useNavigate();

  const startStudy = (category) => {
    navigate(`/study/${category}`);
  };

  const startBrowse = (category) => {
    navigate(`/browse/${category}`);
  };

  const viewWordList = (category) => {
    navigate(`/list/${category}`);
  };

  return (
    <div className="container">
      <Header title="选择学习场景" subtitle="选择一个场景开始背单词" />
      <main className="main-content">
        <div className="category-list">
          {categories.map((category) => (
            <div
              key={category.key}
              className="category-card"
              data-category={category.key}
            >
              <div className="category-icon">{category.icon}</div>
              <h2>{category.name}</h2>
              <p className="category-desc">{category.desc}</p>
              <div className="category-actions">
                <button
                  className="btn-action btn-study"
                  onClick={() => startStudy(category.key)}
                >
                  开始学习
                </button>
                <button
                  className="btn-action btn-browse"
                  onClick={() => startBrowse(category.key)}
                >
                  快速浏览
                </button>
                <button
                  className="btn-action btn-list"
                  onClick={() => viewWordList(category.key)}
                >
                  单词列表
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default HomePage;
