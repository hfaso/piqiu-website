import { Link } from 'react-router-dom';

export function Home() {
    return (
        <div className='home-page'>
            <h1>欢迎来到piqiu三维引擎官网</h1>
            <p>这里展示了使用 React 和 piqiu.js 构建的各种三维交互案例。</p>
            <nav>
                <Link to="/basics">基础几何体</Link>
                <Link to="/gallery">案例画廊</Link>
            </nav>
        </div>
    )
}