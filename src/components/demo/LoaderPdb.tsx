import { useEffect, useRef, useState, type ChangeEvent } from "react";
import * as piqiu3d from "piqiu3d";
import { Piqiu3DRenderer, type PartNode } from "./piQiuModule/Piqiu3DRenderer";
import CanvasLoadingOverlay from "./piQiuModule/common/CanvasLoadingOverlay";

type Props = {
  /** Optional local File or URL. Defaults to public/models/1AKE.pdb */
  source?: string | File | null;
};

export default function LoaderPdbDemo({ source }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Piqiu3DRenderer | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [partTree, setPartTree] = useState<PartNode[]>([]);
  const [renderMode, setRenderMode] =
    useState<piqiu3d.PDBRenderMode>("cartoon");
  const loadVersionRef = useRef(0);

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

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      try {
        piqiuRenderer.removeGeneralEventListener();
        piqiuRenderer.dispose();
      } catch {
        // ignore cleanup errors
      }
    };
  }, []);

  useEffect(() => {
    if (!rendererRef.current) return;
    const piqiuRenderer = rendererRef.current;
    let canceled = false;

    let src: string;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (!source) {
      src = `${import.meta.env.BASE_URL}models/1ake.pdb`;
    } else if (typeof source === "string") {
      src = source;
    } else {
      objectUrlRef.current = URL.createObjectURL(source);
      src = objectUrlRef.current;
    }

    const loadModel = async () => {
      const version = ++loadVersionRef.current;
      const loader = new piqiu3d.PDBLoader();
      setIsLoading(true);
      setPartTree([]);

      try {
        const m = piqiuRenderer.model;
        if (m && typeof m.clear === "function") {
          m.clear();
        }
      } catch {
        // ignore
      }

      try {
        const parts = await loader.load(piqiuRenderer.renderContext, src, {
          renderMode,
          sphereSegments: 10,
          cartoonWidth: 1.4,
          cartoonSmooth: 6,
          cartoonColor: 0x1e8f6a,
          cartoonTubeRadius: 0.55,
          cartoonTubeSegments: 10,
          cartoonArrowLength: 2.0,
          cartoonArrowWidth: 2.2,
          cartoonHetatmRadius: 0.28,
          cartoonHetatmSegments: 8,
        });
        if (
          canceled ||
          rendererRef.current !== piqiuRenderer ||
          version !== loadVersionRef.current
        ) {
          return;
        }
        for (const part of parts) {
          piqiuRenderer.addPart(part);
        }
        // 标记选择器需要更新（FBO缓存失效）
        piqiuRenderer.markSelectorDirty();
        piqiuRenderer.updateCamera();
        setPartTree(piqiuRenderer.getPartTree());
      } catch (e) {
        console.error("PDB load failed", e);
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
  }, [source, renderMode]);

  const onRenderModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setRenderMode(event.target.value as piqiu3d.PDBRenderMode);
  };

  const visibleCount = partTree.filter((part) => part.visible).length;
  const allVisible = partTree.length > 0 && visibleCount === partTree.length;

  return (
    <div>
      <div
        style={{
          marginBottom: 10,
          width: "min(65vw, 100%)",
          marginInline: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            textAlign: "left",
          }}
        >
          <label>
            <span style={{ marginRight: 6 }}>Render Mode</span>
            <select value={renderMode} onChange={onRenderModeChange}>
              <option value="points">Points</option>
              <option value="surface">Surface</option>
              <option value="surface_with_wireframe">
                Surface + Wireframe
              </option>
              <option value="cartoon">Cartoon</option>
            </select>
          </label>
        </div>
      </div>
      <div className="canvas-stage">
        <canvas ref={canvasRef} id="demo-pdb"></canvas>
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
    </div>
  );
}
