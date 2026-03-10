import "./LoaderSimulation.css";
import "./LoaderButtons.css";
import LoaderGeometryDemo from "../components/demo/piQiuModule/simulation/LoaderGeometry";
import LoaderMeshDemo from "../components/demo/piQiuModule/simulation/LoaderMesh";
import LoaderSimulationResultDemo from "../components/demo/piQiuModule/simulation/LoaderSimulationResult";
import LoaderSimulationFramesResultDemo from "../components/demo/piQiuModule/simulation/LoaderSimulationFramesResult";
import React, { useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

interface CaseItem {
  id: string;
  title: string;
  desc: string;
  tags: string[];
  route: string;
  loaderType: "geometry" | "mesh" | "simulation" | "simulationFrames";
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
      simulationFrames: {
        id: "simulationFrames",
        title: t("gallery.cases.simulationFrames.title"),
        desc: t("gallery.cases.simulationFrames.desc"),
        tags: ["Simulation", "Frames"],
        route: "/loaderSimulation?case=simulationFrames",
        loaderType: "simulationFrames",
      },
    }),
    [t],
  );

  // 获取当前 case 类型（从 URL 参数或路由）
  const caseId = searchParams.get("case") || "geometry";
  const currentCase = cases[caseId] || cases["geometry"];
  const descKeyByLoaderType: Record<CaseItem["loaderType"], string> = {
    geometry: "loaderGeoModel.desc",
    mesh: "loaderMeshModel.desc",
    simulation: "loaderSimulationResultModel.desc",
    simulationFrames: "loaderSimulationFramesResultModel.desc",
  };
  const subDescKeysByLoaderType: Record<CaseItem["loaderType"], string[]> = {
    geometry: [
      "loaderGeoModel.subdesc1",
      "loaderGeoModel.subdesc2",
      "loaderGeoModel.subdesc3",
    ],
    mesh: [
      "loaderMeshModel.subdesc1",
      "loaderMeshModel.subdesc2",
      "loaderMeshModel.subdesc3",
    ],
    simulation: [
      "loaderSimulationResultModel.subdesc1",
      "loaderSimulationResultModel.subdesc2",
      "loaderSimulationResultModel.subdesc3",
    ],
    simulationFrames: [
      "loaderSimulationFramesResultModel.subdesc1",
      "loaderSimulationFramesResultModel.subdesc2",
      "loaderSimulationFramesResultModel.subdesc3",
    ],
  };
  const currentDescKey =
    descKeyByLoaderType[currentCase.loaderType] || "loaderGeoModel.desc";
  const currentSubDescKeys =
    subDescKeysByLoaderType[currentCase.loaderType] ||
    subDescKeysByLoaderType.geometry;

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
      <div style={{ marginBottom: 12, width: "min(65vw, 100%)", marginInline: "auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-start",
            textAlign: "left",
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
            className="loader-action-button"
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
      {currentCase.loaderType === "simulationFrames" && (
        <LoaderSimulationFramesResultDemo source={file} />
      )}

      {/* 案例说明区域 */}
      <div className="case-description">
        <p>{t(currentDescKey)}</p>
        <ul>
          {currentSubDescKeys.map((subDescKey) => (
            <li key={subDescKey}>{t(subDescKey)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default LoaderSimulation;
