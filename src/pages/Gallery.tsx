import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Gallery.css";

interface CaseItem {
  id: string;
  title: string;
  desc: string;
  tags: string[];
  route: string;
  /** 缩略图 URL，不填则显示占位图 */
  thumbnail?: string;
}

export default function Gallery() {
  const { t } = useTranslation();
  const CASES: CaseItem[] = [
    {
      id: "basics",
      title: t("gallery.cases.basics.title"),
      desc: t("gallery.cases.basics.desc"),
      tags: ["Geometry", "WebGL"],
      route: "/basics",
    },
    {
      id: "gltf",
      title: t("gallery.cases.gltf.title"),
      desc: t("gallery.cases.gltf.desc"),
      tags: ["GLTF", "Loader"],
      route: "/loaderModel",
    },
    {
      id: "geometry",
      title: t("gallery.cases.geometry.title"),
      desc: t("gallery.cases.geometry.desc"),
      tags: ["Geometry", "Render"],
      route: "/loaderSimulation?case=geometry",
    },
    {
      id: "geometryOctree",
      title: t("gallery.cases.geometryOctree.title"),
      desc: t("gallery.cases.geometryOctree.desc"),
      tags: ["Geometry", "Octree", "Picker"],
      route: "/loaderSimulation?case=geometryOctree",
    },
    {
      id: "geometryBvh",
      title: t("gallery.cases.geometryBvh.title"),
      desc: t("gallery.cases.geometryBvh.desc"),
      tags: ["Geometry", "BVH", "Picker"],
      route: "/loaderSimulation?case=geometryBvh",
    },
    {
      id: "mesh",
      title: t("gallery.cases.mesh.title"),
      desc: t("gallery.cases.mesh.desc"),
      tags: ["Mesh", "Render"],
      route: "/loaderSimulation?case=mesh",
    },
    {
      id: "simulation",
      title: t("gallery.cases.simulation.title"),
      desc: t("gallery.cases.simulation.desc"),
      tags: ["Simulation", "Render"],
      route: "/loaderSimulation?case=simulation",
    },
    {
      id: "simulationFrames",
      title: t("gallery.cases.simulationFrames.title"),
      desc: t("gallery.cases.simulationFrames.desc"),
      tags: ["Simulation", "Frames"],
      route: "/loaderSimulation?case=simulationFrames",
    },
    {
      id: "webgpu",
      title: t("gallery.cases.webgpu.title"),
      desc: t("gallery.cases.webgpu.desc"),
      tags: ["WebGPU", "Experimental"],
      route: "/webgpu",
    },
  ];

  return (
    <div className="gallery-container fade-in">
      {/* 页面标题 */}
      <header className="gallery-header">
        <h1 className="home-title">{t("gallery.title")}</h1>
        <p className="home-subtitle">{t("gallery.subtitle")}</p>
      </header>

      {/* 案例网格 */}
      <section className="case-grid">
        {CASES.map((item) => (
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
              {item.tags.map((tag) => (
                <span key={tag} className="tech-tag">
                  {tag}
                </span>
              ))}
            </div>

            <Link to={item.route} className="nav-link mt-md">
              {t("gallery.viewCase")}
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}
