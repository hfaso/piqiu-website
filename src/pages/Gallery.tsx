import { Link } from 'react-router-dom';
import './Gallery.css';

interface CaseItem {
  id: string;
  title: string;
  desc: string;
  tags: string[];
  route: string;
  /** 缩略图 URL，不填则显示占位图 */
  thumbnail?: string;
}

const CASES: CaseItem[] = [
  {
    id: 'basics',
    title: '基础几何体',
    desc: '立方体、球体、圆柱等基础几何体渲染示例',
    tags: ['Geometry', 'WebGL'],
    route: '/basics',
  },
  {
    id: 'gltf',
    title: 'GLTF 模型加载',
    desc: '支持 GLTF / GLB 模型解析与高效渲染',
    tags: ['GLTF', 'Loader'],
    route: '/gallery'
  },
  {
    id: 'postprocess',
    title: '后处理效果',
    desc: '等值线、裁剪、包裹等后处理算法示例',
    tags: ['PostProcess', 'FBO'],
    route: '/gallery'
  },
  {
    id: 'webgpu',
    title: 'WebGPU 实验',
    desc: '基于 WebGPU 的新一代渲染管线探索',
    tags: ['WebGPU', 'Experimental'],
    route: '/gallery'
  }
];

export default function Gallery() {
  return (
    <div className="gallery-container fade-in">
      {/* 页面标题 */}
      <header className="gallery-header">
        <h1 className="home-title">案例集合</h1>
        <p className="home-subtitle">
          这里汇总了 piqiu 三维引擎的核心功能与典型应用场景
        </p>
      </header>

      {/* 案例网格 */}
      <section className="case-grid">
        {CASES.map(item => (
          <div key={item.id} className="case-card">
            <div className="case-card-thumbnail">
              {item.thumbnail ? (
                <img src={item.thumbnail} alt={item.title} loading="lazy" />
              ) : (
                <div className="case-card-thumbnail-placeholder" aria-hidden>
                  <span className="thumbnail-icon">🧩</span>
                  <span className="thumbnail-text">{item.title}</span>
                </div>
              )}
            </div>
            <h3>
              <span className="icon">🧩</span>
              {item.title}
            </h3>

            <p>{item.desc}</p>

            <div className="tech-stack">
              {item.tags.map(tag => (
                <span key={tag} className="tech-tag">
                  {tag}
                </span>
              ))}
            </div>

            <Link to={item.route} className="nav-link mt-md">
              查看案例
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}
