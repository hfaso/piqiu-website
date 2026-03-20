import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import * as piqiu3d from "piqiu3d";
import { vec2 } from "gl-matrix";
import {
  Piqiu3DRenderer,
  type PartNode,
  type RenderMode,
} from "../Piqiu3DRenderer";
import CanvasLoadingOverlay from "../common/CanvasLoadingOverlay";

type Props = {
  source?: string | File | null;
};

export default function CanvasContainerBvh({ source }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Piqiu3DRenderer | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const simulationDataRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [renderMode, setRenderMode] = useState<RenderMode>(
    "surface_with_wireframe",
  );
  const [partTree, setPartTree] = useState<PartNode[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [bvhInfo, setBvhInfo] = useState<string>("");
  const [isBuildingBvh, setIsBuildingBvh] = useState(false);
  const renderModeRef = useRef<RenderMode>("surface_with_wireframe");

  // BvhTreeSelector instance ref
  const bvhSelectorRef = useRef<piqiu3d.BvhTreeSelector | null>(null);
  // Current highlighted part
  const highlightedPartRef = useRef<piqiu3d.Part | null>(null);
  // BVH built state
  const bvhBuiltRef = useRef(false);
  // BVH building flag
  const isBuildingBvhRef = useRef(false);

  const applySimulationData = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: any, resetCamera: boolean, mode: RenderMode) => {
      const piqiuRenderer = rendererRef.current;
      if (!piqiuRenderer || !data) return;
      try {
        const m = piqiuRenderer.model;
        if (m && typeof m.clear === "function") {
          m.clear();
        }
      } catch {
        // ignore
      }
      piqiuRenderer.loadSiumlationFile(data, { renderMode: mode });
      piqiuRenderer.setAllPartsVisible(true);

      // Create BvhTreeSelector instance, build lazily
      initBvhSelector(piqiuRenderer);

      if (resetCamera) {
        // Build BVH after first render to avoid blocking clicks
        setTimeout(() => {
          scheduleBvhBuild();
        }, 0);
        piqiuRenderer.updateCamera();
      } else {
        piqiuRenderer.requestRender();
      }
      setPartTree(piqiuRenderer.getPartTree());
    },
    [],
  );

  // Init BvhTreeSelector (lazy build)
  const initBvhSelector = useCallback((piqiuRenderer: Piqiu3DRenderer) => {
    const model = piqiuRenderer.model;
    if (!model) return;

    const bvhSelector = new piqiu3d.BvhTreeSelector(
      piqiuRenderer.builtInUniforms,
    );
    bvhSelector.setModel(model);
    bvhSelectorRef.current = bvhSelector;
    bvhBuiltRef.current = false;
    isBuildingBvhRef.current = false;
    setIsBuildingBvh(false);
    setBvhInfo("");

    console.log("BvhTreeSelector instance created, BVH builds in background");
  }, []);

  // Lazy build BVH (idle time, do not block click)
  const scheduleBvhBuild = useCallback(() => {
    const bvhSelector = bvhSelectorRef.current;
    if (!bvhSelector) return;
    if (bvhBuiltRef.current || isBuildingBvhRef.current) return;

    isBuildingBvhRef.current = true;
    setIsBuildingBvh(true);

    bvhSelector
      .buildBvhAsync({ maxPartPerChunk: 1, timeBudgetMs: 8 })
      .then(() => {
        if (!bvhSelector.isBvhBuilt) return;
        bvhBuiltRef.current = true;
        const info = bvhSelector.getBvhInfo();
        setBvhInfo(JSON.stringify(info, null, 2));
        console.log("BVH built in background:", info);
      })
      .catch((e) => {
        console.error("Failed to build BVH:", e);
      })
      .finally(() => {
        isBuildingBvhRef.current = false;
        setIsBuildingBvh(false);
      });
  }, []);

  // Highlight selected part (UI only)
  const highlightPart = useCallback((part: piqiu3d.Part) => {
    highlightedPartRef.current = part;
    setSelectedPartId(part.id);
    rendererRef.current?.requestRender();
  }, []);

  const clearHighlight = useCallback(() => {
    highlightedPartRef.current = null;
    setSelectedPartId(null);
    rendererRef.current?.requestRender();
  }, []);

  // Handle click pick using BVH
  const handleBvhPick = useCallback(
    async (pos: { x: number; y: number }) => {
      const bvhSelector = bvhSelectorRef.current;
      if (!bvhSelector) return;

      if (!bvhBuiltRef.current) {
        scheduleBvhBuild();
        console.log("BVH is building, please try again shortly");
        return;
      }

      const hitParts = bvhSelector.hitTest([
        pos.x,
        pos.y,
      ] as unknown as vec2);

      if (hitParts && hitParts.length > 0) {
        const selectedPart = hitParts[0];
        const partId = selectedPart.id;

        console.log("BvhTreeSelector picked part:", partId, selectedPart.name);

        if (selectedPartId === partId) {
          clearHighlight();
        } else {
          highlightPart(selectedPart);
        }
      } else {
        clearHighlight();
      }
    },
    [selectedPartId, highlightPart, clearHighlight, scheduleBvhBuild],
  );

  useEffect(() => {
    renderModeRef.current = renderMode;
  }, [renderMode]);

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

    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const glX = x * dpr;
      const glY = y * dpr;

      handleBvhPick({ x: glX, y: glY });
    };

    canvas.addEventListener("click", handleClick);

    return () => {
      canvas.removeEventListener("click", handleClick);

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
  }, [handleBvhPick]);

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
      src = `${import.meta.env.BASE_URL}models/chejia.zip`;
    } else if (typeof source === "string") {
      src = source;
    } else {
      objectUrlRef.current = URL.createObjectURL(source);
      src = objectUrlRef.current;
    }

    const loadModel = async () => {
      setIsLoading(true);
      setPartTree([]);
      setSelectedPartId(null);
      setBvhInfo("");
      simulationDataRef.current = null;

      try {
        const { data, ArrayBuffer } = await piqiu3d.Loader.loadZip(src);
        if (canceled || rendererRef.current !== piqiuRenderer) return;
        const loadDb = new piqiu3d.LoadDataBase(data, "surface");
        const { database } = loadDb;
        const res = {
          ...data,
          database,
          ArrayBuffer,
        };
        simulationDataRef.current = res;
        applySimulationData(res, true, renderModeRef.current);
      } catch (e) {
        console.error("loadModel failed", e);
      } finally {
        if (!canceled && rendererRef.current === piqiuRenderer) {
          setIsLoading(false);
        }
      }
    };

    void loadModel();
    return () => {
      canceled = true;
    };
  }, [source, applySimulationData]);

  useEffect(() => {
    if (!rendererRef.current) return;
    const data = simulationDataRef.current;
    if (!data) return;
    applySimulationData(data, false, renderMode);
  }, [renderMode, applySimulationData]);

  const onRenderModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setRenderMode(event.target.value as RenderMode);
  };

  const onPartVisibleChange = (partIndex: number, visible: boolean) => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.setPartVisible(partIndex, visible);
    setPartTree((prev) =>
      prev.map((part) =>
        part.index === partIndex ? { ...part, visible } : part,
      ),
    );

    if (bvhSelectorRef.current && renderer.model) {
      bvhSelectorRef.current.setModel(renderer.model);
      bvhBuiltRef.current = false;
      setBvhInfo("");
      scheduleBvhBuild();
    }
  };

  const onToggleAllParts = (visible: boolean) => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.setAllPartsVisible(visible);
    setPartTree((prev) => prev.map((part) => ({ ...part, visible })));

    if (bvhSelectorRef.current && renderer.model) {
      bvhSelectorRef.current.setModel(renderer.model);
      bvhBuiltRef.current = false;
      setBvhInfo("");
      scheduleBvhBuild();
    }
  };

  const visibleCount = partTree.filter((part) => part.visible).length;
  const allVisible = partTree.length > 0 && visibleCount === partTree.length;

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <label>
          <span style={{ marginRight: 6 }}>Render Mode</span>
          <select value={renderMode} onChange={onRenderModeChange}>
            <option value="wireframe">Wireframe</option>
            <option value="surface_with_wireframe">Surface + Wireframe</option>
            <option value="surface">Surface</option>
          </select>
        </label>
        <span style={{ marginLeft: 20, color: "#666", fontSize: 12 }}>
          (Use BvhTreeSelector for click picking)
        </span>
      </div>
      <div className="canvas-stage" style={{ position: "relative" }}>
        <canvas ref={canvasRef} id="demo-bvh"></canvas>
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
                onChange={(event) => onToggleAllParts(event.target.checked)}
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
                    backgroundColor:
                      selectedPartId === part.id ? "#ffcccc" : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={part.visible}
                    onChange={(event) =>
                      onPartVisibleChange(part.index, event.target.checked)
                    }
                  />
                  <span style={{ color: "#000" }}>{part.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        {bvhInfo && (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 10,
              border: "1px solid #d9d9d9",
              borderRadius: 4,
              padding: 10,
              maxHeight: 200,
              overflow: "auto",
              background: "rgba(255, 255, 255, 0.95)",
              minWidth: 200,
              fontSize: 11,
            }}
          >
            <div style={{ marginBottom: 8, fontWeight: 600 }}>BVH Info</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {bvhInfo}
            </pre>
          </div>
        )}
        <CanvasLoadingOverlay
          loading={isLoading || isBuildingBvh}
          text={isLoading ? "模型加载中.." : "BVH 构建中.."}
        />
      </div>
    </div>
  );
}
