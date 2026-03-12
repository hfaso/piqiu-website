import { useEffect, useRef, useState } from "react";
import * as piqiu3d from "piqiu3d";
import { Piqiu3DRenderer, type PartNode } from "./piQiuModule/Piqiu3DRenderer";
import CanvasLoadingOverlay from "./piQiuModule/common/CanvasLoadingOverlay";

type Props = {
  /** 可以传入本地 File，或者一个 URL 字符串；如果为空则使用默认模型 */
  source?: string | File | null;
};

export default function CanvasContainer({ source }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Piqiu3DRenderer | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [partTree, setPartTree] = useState<PartNode[]>([]);

  const loadVersionRef = useRef(0);

  // 初始化渲染器（仅在挂载时）
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 0.65;
    canvas.height = window.innerHeight * 0.65;

    const piqiuRenderer = new Piqiu3DRenderer(canvas, {
      width: canvas.width,
      height: canvas.height,
    });
    rendererRef.current = piqiuRenderer;
    piqiuRenderer.addGeneralEventListener();

    // 卸载时清理
    return () => {
      // revoke any created object URL
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      try {
        piqiuRenderer.removeGeneralEventListener();
        piqiuRenderer.dispose();
      } catch (e) {
        void e; // 忽略清理错误
      }
    };
  }, []);

  // 当 source 改变时（包括首次挂载），加载模型
  useEffect(() => {
    if (!rendererRef.current) return;
    const piqiuRenderer = rendererRef.current;
    let canceled = false;

    let src: string;
    // 清理上一个 object URL（如果有）
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!source) {
      src = `${import.meta.env.BASE_URL}models/engine.glb`;
    } else if (typeof source === "string") {
      src = source;
    } else {
      // File
      objectUrlRef.current = URL.createObjectURL(source);
      src = objectUrlRef.current;
    }

    const loadModel = async () => {
      const version = ++loadVersionRef.current;
      const loader = new piqiu3d.GLTFLoader();
      console.log("LoaderModel: start loading", src);
      setIsLoading(true);
      setPartTree([]);

      try {
        const m = piqiuRenderer.model;
        if (m) {
          if (typeof m.clear === "function") {
            m.clear();
          }
        }
      } catch (e) {
        void e; // ignore
      }

      try {
        const meshes = await loader.load(piqiuRenderer.renderContext, src);
        if (
          canceled ||
          rendererRef.current !== piqiuRenderer ||
          version !== loadVersionRef.current
        ) {
          return;
        }
        for (const mesh of meshes) {
          piqiuRenderer.addPart(mesh);
        }
        piqiuRenderer.updateCamera();
        setPartTree(piqiuRenderer.getPartTree());
      } catch (e) {
        void e; // ignore
      } finally {
        if (
          !canceled &&
          rendererRef.current === piqiuRenderer &&
          version === loadVersionRef.current
        ) {
          setIsLoading(false);
        }
      }
    };

    void loadModel();
    return () => {
      canceled = true;
    };
  }, [source]);

  const visibleCount = partTree.filter((part) => part.visible).length;
  const allVisible = partTree.length > 0 && visibleCount === partTree.length;

  return (
    <div className="canvas-stage">
      <canvas ref={canvasRef} id="demo"></canvas>
      {partTree.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 10,
            border: "1px solid #d9d9d9",
            borderRadius: 4,
            padding: 10,
            maxHeight: 240,
            overflow: "auto",
            background: "rgba(255, 255, 255, 0.95)",
            minWidth: 240,
          }}
        >
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Part Tree</div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              checked={allVisible}
              onChange={(event) => {
                rendererRef.current?.setAllPartsVisible(event.target.checked);
                setPartTree((prev) =>
                  prev.map((part) => ({
                    ...part,
                    visible: event.target.checked,
                  })),
                );
              }}
            />
            <span style={{ color: "#000" }}>
              All Parts ({visibleCount}/{partTree.length})
            </span>
          </label>
          <div>
            {partTree.map((part) => (
              <label
                key={`${part.id}-${part.index}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                  paddingLeft: 12,
                }}
              >
                <input
                  type="checkbox"
                  checked={part.visible}
                  onChange={(event) => {
                    rendererRef.current?.setPartVisible(
                      part.index,
                      event.target.checked,
                    );
                    setPartTree((prev) =>
                      prev.map((item) =>
                        item.index === part.index
                          ? { ...item, visible: event.target.checked }
                          : item,
                      ),
                    );
                  }}
                />
                <span style={{ color: "#000" }}>{part.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <CanvasLoadingOverlay loading={isLoading} />
    </div>
  );
}
