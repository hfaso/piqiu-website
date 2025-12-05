import { Link } from 'react-router-dom';
import './Home.css'; // 导入样式文件

export default function Home() {
    return (
        <div className="home-container">
            {/* 首页英雄区域，使用 home-hero 类 */}
            <section className="home-hero fade-in"> 
                <h1 className="home-title">欢迎来到piqiu三维引擎官网</h1>
                <p className="home-subtitle">这里展示了使用 React 和 piqiu.js 构建的各种三维交互案例。</p>

                {/* 导航链接使用 nav-links 类 */}
                <nav className="nav-links">
                    <Link to="/basics" className="nav-link">基础几何体</Link>
                    <Link to="/gallery" className="nav-link">案例画廊</Link>
                    {/* 你可以继续添加更多案例链接 */}
                </nav>
            </section>

            {/* 这里未来可以添加案例网格（case-grid）等更多内容 */}
            {/*
            <div className="case-grid">
                <div className="case-card">
                    <h3><span className="icon">⭐</span>基础几何体</h3>
                    <p>探索立方体、球体等基本三维形状。</p>
                    <Link to="/basics" className="nav-link">查看案例</Link>
                </div>
            </div>
            */}
        </div>
    )
}