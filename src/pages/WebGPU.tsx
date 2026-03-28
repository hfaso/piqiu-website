import "./Basics.css";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import WebGPUDemo from "../components/demo/WebGPUDemo";

function WebGPU() {
  const { t } = useTranslation();
  const [autoRotate, setAutoRotate] = useState(true);
  const [material, setMaterial] = useState<
    "phong" | "lambert" | "pbr" | "normal" | "wireframe" | "unlit"
  >("phong");

  return (
    <div className="basics-container" style={{ maxWidth: "1600px" }}>
      <h2 className="basics-title">{t("gallery.cases.webgpu.title")}</h2>
      <div
        style={{
          width: "50vw",
          margin: "0 auto 12px",
          minWidth: 320,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            color: "#2b3a55",
          }}
        >
          <input
            type="checkbox"
            checked={autoRotate}
            onChange={(event) => setAutoRotate(event.target.checked)}
          />
          自动旋转
        </label>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            color: "#2b3a55",
          }}
        >
          材质
          <select
            value={material}
            onChange={(event) =>
              setMaterial(event.target.value as typeof material)
            }
          >
            <option value="phong">Phong</option>
            <option value="lambert">Lambert</option>
            <option value="pbr">PBR (Metal/Rough)</option>
            <option value="normal">Normal</option>
            <option value="wireframe">Wireframe</option>
            <option value="unlit">Unlit/Color</option>
          </select>
        </label>
      </div>
      <div
        style={{
          width: "50vw",
          height: "50vh",
          margin: "0 auto",
          minWidth: 320,
          minHeight: 240,
        }}
      >
        <WebGPUDemo autoRotate={autoRotate} material={material} />
      </div>
      <div className="case-description">
        <p>{t("gallery.cases.webgpu.desc")}</p>
      </div>
    </div>
  );
}

export default WebGPU;
