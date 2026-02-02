import { Link } from 'react-router-dom';
import './Home.css';

interface CaseItem {
  id: string;
  title: string;
  desc: string;
  tag: string;
  route: string;
}

const CASES: CaseItem[] = [
  {
    id: 'basics',
    title: '基础几何体',
    desc: '立方体、球体、圆柱等基础几何体渲染',
    tag: 'Geometry',
    route: '/basics'
  },
  {
    id: 'postprocess',
    title: '后处理管线',
    desc: '等值线 / 裁剪 / 包裹等后处理效果',
    tag: 'PostProcess',
    route: '/gallery'
  }
];

export default function Home() {
  return (
    <div className="home-container">
      <section className="home-hero fade-in">
        <h1 className="home-title">欢迎来到 piqiu 三维引擎官网</h1>
        <p className="home-subtitle">
          这里展示了使用 React 和 piqiu.js 构建的各种三维交互案例。
        </p>

        <nav className="nav-links">
          <Link to="/basics" className="nav-link">基础几何体</Link>
          <Link to="/gallery" className="nav-link">案例画廊</Link>
        </nav>
      </section>

      {/* ===== 主页主体左右分栏 ===== */}
      <section className="home-main fade-in">
        {/* 左侧：说明 / 定位 */}
        <div className="home-main-left">
          <h2>关于 piqiu</h2>
          <p>
            piqiu 是一个面向 Web 的三维渲染引擎，专注于
            <strong> WebGL / WebGPU </strong>
            的工程化实践。
          </p>

          <p className="mt-md">
            本站案例涵盖：
          </p>
          <ul className="feature-list">
            <li>GLTF / GLB 模型加载</li>
            <li>大规模几何数据渲染</li>
            <li>后处理与可视化算法</li>
            <li>引擎级架构设计</li>
          </ul>
        </div>

        {/* 右侧：案例合集（你要的） */}
        <div className="home-main-right">
          <h2 className="case-collection-title">案例合集</h2>

          <ul className="case-list">
            {CASES.map(item => (
              <li key={item.id} className="case-item">
                <Link to={item.route}>
                  <div className="case-item-header">
                    <span className="case-name">{item.title}</span>
                    <span className="case-tag">{item.tag}</span>
                  </div>
                  <p className="case-desc">{item.desc}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
