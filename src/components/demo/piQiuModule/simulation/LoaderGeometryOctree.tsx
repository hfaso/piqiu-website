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

export default function CanvasContainerOctree({ source }: Props) {
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
  const [octreeInfo, setOctreeInfo] = useState<string>("");
  const renderModeRef = useRef<RenderMode>("surface_with_wireframe");

  // OctreeSelector 实例引用
  const octreeSelectorRef = useRef<piqiu3d.OctreeSelector | null>(null);
  // 当前高亮的 Part
  const highlightedPartRef = useRef<piqiu3d.Part | null>(null);
  // 八叉树是否已构建
  const octreeBuiltRef = useRef(false);
  // 八叉树构建中的标志
  const isBuildingOctreeRef = useRef(false);

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

      // 只创建 OctreeSelector 实例，不立即构建八叉树（延迟构建）
      initOctreeSelector(piqiuRenderer);

      if (resetCamera) {
        piqiuRenderer.updateCamera();
      } else {
        piqiuRenderer.requestRender();
      }
      setPartTree(piqiuRenderer.getPartTree());
    },
    [],
  );

  // 初始化 OctreeSelector（延迟构建八叉树）
  const initOctreeSelector = useCallback((piqiuRenderer: Piqiu3DRenderer) => {
    const model = piqiuRenderer.model;
    if (!model) return;

    // 创建 OctreeSelector 实例
    const octreeSelector = new piqiu3d.OctreeSelector(
      piqiuRenderer.builtInUniforms,
    );
    octreeSelector.setModel(model);
    octreeSelectorRef.current = octreeSelector;
    octreeBuiltRef.current = false; // 重置构建状态

    console.log(
      "OctreeSelector instance created, octree will be built on first click",
    );
  }, []);

  // 延迟构建八叉树（在后台或第一次点击时）
  const ensureOctreeBuilt = useCallback(async () => {
    const octreeSelector = octreeSelectorRef.current;
    if (!octreeSelector) return false;

    // 如果八叉树已构建，直接返回
    if (octreeBuiltRef.current) return true;

    // 如果正在构建中，等待完成
    if (isBuildingOctreeRef.current) {
      // 等待一小段时间后重试
      await new Promise((resolve) => setTimeout(resolve, 100));
      return octreeBuiltRef.current;
    }

    isBuildingOctreeRef.current = true;

    try {
      // 使用 requestIdleCallback 在空闲时间构建八叉树
      await new Promise<void>((resolve) => {
        if ("requestIdleCallback" in window) {
          (window as any).requestIdleCallback(
            () => {
              octreeSelector.rebuildOctree();
              resolve();
            },
            { timeout: 2000 },
          );
        } else {
          // 如果不支持 requestIdleCallback，直接构建
          octreeSelector.rebuildOctree();
          resolve();
        }
      });

      octreeBuiltRef.current = true;

      // 获取八叉树信息
      const info = octreeSelector.getOctreeInfo();
      setOctreeInfo(JSON.stringify(info, null, 2));

      console.log("Octree built on first interaction:", info);
      return true;
    } catch (e) {
      console.error("Failed to build octree:", e);
      return false;
    } finally {
      isBuildingOctreeRef.current = false;
    }
  }, []);

  // 高亮选中的 Part - 简化版本：只更新 UI 状态，不使用 hint pass
  const highlightPart = useCallback((part: piqiu3d.Part) => {
    // 记录当前高亮的 Part
    highlightedPartRef.current = part;

    // 更新 UI 状态
    setSelectedPartId(part.id);

    // 重新渲染
    rendererRef.current?.requestRender();
  }, []);

  // 清除高亮效果 - 简化版本
  const clearHighlight = useCallback(() => {
    highlightedPartRef.current = null;
    setSelectedPartId(null);

    rendererRef.current?.requestRender();
  }, []);

  // 处理鼠标点击拾取（异步版本，支持延迟构建八叉树）
  const handleOctreePick = useCallback(
    async (pos: { x: number; y: number }) => {
      const octreeSelector = octreeSelectorRef.current;
      if (!octreeSelector) return;

      // 确保八叉树已构建（如果是第一次点击，会在后台构建）
      const built = await ensureOctreeBuilt();
      if (!built) {
        console.log("Octree not ready yet, please try again");
        return;
      }

      // 使用 OctreeSelector 进行射线拾取
      // OctreeSelector.hitTest 接受 vec2 类型的参数
      const hitParts = octreeSelector.hitTest([
        pos.x,
        pos.y,
      ] as unknown as vec2);

      if (hitParts && hitParts.length > 0) {
        // 获取最近的 Part
        const selectedPart = hitParts[0];
        const partId = selectedPart.id;

        console.log("OctreeSelector picked part:", partId, selectedPart.name);

        // 如果点击的是同一个 Part，取消选中
        if (selectedPartId === partId) {
          clearHighlight();
        } else {
          // 选中新的 Part
          highlightPart(selectedPart);
        }
      } else {
        // 点击空白区域，取消选中
        clearHighlight();
      }
    },
    [selectedPartId, highlightPart, clearHighlight, ensureOctreeBuilt],
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

    // 添加鼠标事件监听
    piqiuRenderer.addGeneralEventListener();

    // 添加点击事件监听
    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // 考虑 DPR
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const glX = x * dpr;
      const glY = y * dpr;

      handleOctreePick({ x: glX, y: glY });
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
  }, [handleOctreePick]);

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
      setOctreeInfo("");
      simulationDataRef.current = null;

      try {
        const { data, ArrayBuffer } = await piqiu3d.Loader.loadZip(src);
        if (canceled || rendererRef.current !== piqiuRenderer) return;
        // 使用 LoadDataBase 解析数据
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

    // Part 可见性变化时，需要重建八叉树
    if (octreeSelectorRef.current) {
      octreeSelectorRef.current.rebuildOctree();
    }
  };

  const onToggleAllParts = (visible: boolean) => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.setAllPartsVisible(visible);
    setPartTree((prev) => prev.map((part) => ({ ...part, visible })));

    // Part 可见性变化时，需要重建八叉树
    if (octreeSelectorRef.current) {
      octreeSelectorRef.current.rebuildOctree();
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
          (使用 OctreeSelector 进行点击拾取)
        </span>
      </div>
      <div className="canvas-stage" style={{ position: "relative" }}>
        <canvas ref={canvasRef} id="demo-octree"></canvas>
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
        {octreeInfo && (
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
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Octree Info</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {octreeInfo}
            </pre>
          </div>
        )}
        <CanvasLoadingOverlay loading={isLoading} />
      </div>
    </div>
  );
}
