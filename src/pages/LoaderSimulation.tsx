import "./LoaderSimulation.css";
import LoaderGeometryDemo from "../components/demo/piQiuModule/simulation/LoaderGeometry";
import LoaderMeshDemo from "../components/demo/piQiuModule/simulation/LoaderMesh";
import LoaderSimulationResultDemo from "../components/demo/piQiuModule/simulation/LoaderSimulationResult";
import React, { useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

interface CaseItem {
  id: string;
  title: string;
  desc: string;
  tags: string[];
  route: string;
  loaderType: "geometry" | "mesh" | "simulation";
}

function LoaderSimulation() {
  const [file, setFile] = useState<File | null>(null);
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [searchParams] = useSearchParams();

  // 定义各个案例的加载器类型
  const cases: Record<string, CaseItem> = useMemo(
    () => ({
      geometry: {
        id: "geometry",
        title: t("gallery.cases.geometry.title"),
        desc: t("gallery.cases.geometry.desc"),
        tags: ["Geometry", "Render"],
        route: "/loaderGeometry",
        loaderType: "geometry",
      },
      mesh: {
        id: "mesh",
        title: t("gallery.cases.mesh.title"),
        desc: t("gallery.cases.mesh.desc"),
        tags: ["Mesh", "Render"],
        route: "/loaderMesh",
        loaderType: "mesh",
      },
      simulation: {
        id: "simulation",
        title: t("gallery.cases.simulation.title"),
        desc: t("gallery.cases.simulation.desc"),
        tags: ["Simulation", "Render"],
        route: "/loaderSimulationResult",
        loaderType: "simulation",
      },
    }),
    [t],
  );

  // 获取当前 case 类型（从 URL 参数或路由）
  const caseId = searchParams.get("case") || "geometry";
  const currentCase = cases[caseId] || cases["geometry"];

  console.log(currentCase.loaderType);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0];
    if (f) setFile(f);
    else setFile(null);
  }

  return (
    <div className="basics-container">
      <h2 className="basics-title">{currentCase.title}</h2>

      {/* 文件选择：支持 .gltf/.glb 本地文件，未选择时使用默认模型 */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span>{t("loaderModel.chooseLocal")}</span>

          <input
            ref={fileInputRef}
            type="file"
            accept=".gltf,.glb,model/gltf+json,model/gltf-binary"
            onChange={onFileChange}
            style={{ display: "none" }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "inherit",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 10,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            {t("loaderModel.chooseFile")}
          </button>

          <span style={{ opacity: 0.85 }}>
            {file ? file.name : t("loaderModel.noFileSelected")}
          </span>
        </div>
      </div>

      {/* 根据 case 类型选择不同的 loader 组件 */}
      {currentCase.loaderType === "geometry" && (
        <LoaderGeometryDemo source={file} />
      )}
      {currentCase.loaderType === "mesh" && <LoaderMeshDemo source={file} />}
      {currentCase.loaderType === "simulation" && (
        <LoaderSimulationResultDemo source={file} />
      )}

      {/* 案例说明区域 */}
      <div className="case-description">
        <p>{t("loaderGeoModel.desc")}</p>
        <ul>
          <li>{t("basics.controls.rotate")}</li>
          <li>{t("basics.controls.zoom")}</li>
          <li>{t("basics.controls.pan")}</li>
        </ul>
      </div>
    </div>
  );
}

export default LoaderSimulation;
