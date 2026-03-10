import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import * as piqiu3d from "piqiu3d";
import {
  Piqiu3DRenderer,
  type PartNode,
  type RenderMode,
} from "../Piqiu3DRenderer";
import CanvasLoadingOverlay from "../common/CanvasLoadingOverlay";

type Props = {
  source?: string | File | null;
};

export default function CanvasContainer({ source }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Piqiu3DRenderer | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const simulationDataRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [renderMode, setRenderMode] = useState<RenderMode>("surface_with_wireframe");
  const [partTree, setPartTree] = useState<PartNode[]>([]);
  const renderModeRef = useRef<RenderMode>("surface_with_wireframe");

  const applySimulationData = useCallback(
    (data: any, resetCamera: boolean, mode: RenderMode) => {
      const piqiuRenderer = rendererRef.current;
      if (!piqiuRenderer || !data) return;
      try {
        const m = piqiuRenderer.model;
        if (m && typeof m.clear === "function") {
          m.clear();
        }
      } catch (e) {
        // ignore
      }
      piqiuRenderer.loadSiumlationFile(data, { renderMode: mode });
      piqiuRenderer.setAllPartsVisible(true);
      if (resetCamera) {
        piqiuRenderer.updateCamera();
      } else {
        piqiuRenderer.requestRender();
      }
      setPartTree(piqiuRenderer.getPartTree());
    },
    [],
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

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      try {
        piqiuRenderer.removeGeneralEventListener();
        piqiuRenderer.dispose();
      } catch (e) {
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
      simulationDataRef.current = null;
      try {
        const { data, ArrayBuffer } = await piqiu3d.Loader.loadZip(src);
        if (canceled || rendererRef.current !== piqiuRenderer) return;
        const { database } = new piqiu3d.LoadDataBase(data, "surface");
        const res = {
          ...data,
          database,
          ArrayBuffer,
        };
        simulationDataRef.current = res;
        applySimulationData(res, true, renderModeRef.current);
      } catch (e) {
        // ignore
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
  };

  const onToggleAllParts = (visible: boolean) => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.setAllPartsVisible(visible);
    setPartTree((prev) => prev.map((part) => ({ ...part, visible })));
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
      </div>
      <div className="canvas-stage" style={{ position: "relative" }}>
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
        <CanvasLoadingOverlay loading={isLoading} />
      </div>
    </div>
  );
}
