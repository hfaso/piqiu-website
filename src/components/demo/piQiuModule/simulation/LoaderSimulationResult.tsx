import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import * as piqiu3d from "piqiu3d";
import { Piqiu3DRenderer, type RenderMode } from "../Piqiu3DRenderer";
import CanvasLoadingOverlay from "../common/CanvasLoadingOverlay";

type Props = {
  source?: string | File | null;
};

type ScalarOption = {
  scalarIndex: number;
  scalarName: string;
  components: Array<{
    subIndex: number;
    componentName: string;
  }>;
};

function buildScalarOptions(result: any): ScalarOption[] {
  const scalarList = result?.database?.model?.scalar;
  if (!Array.isArray(scalarList)) return [];

  return scalarList.map((scalar: any, scalarIndex: number) => {
    const components: Array<{ subIndex: number; componentName: string }> = [];
    const seen = new Set<string>();
    const data = Array.isArray(scalar?.data) ? scalar.data : [];

    data.forEach((subScalar: any, subIndex: number) => {
      const name =
        (typeof subScalar?.component_name === "string" &&
          subScalar.component_name.trim()) ||
        scalar?.name ||
        `Component ${subIndex + 1}`;
      if (seen.has(name)) return;
      seen.add(name);
      components.push({ subIndex, componentName: name });
    });

    if (components.length === 0) {
      components.push({
        subIndex: 0,
        componentName: scalar?.name || "Default",
      });
    }

    return {
      scalarIndex,
      scalarName: scalar?.name || `Scalar ${scalarIndex + 1}`,
      components,
    };
  });
}

export default function CanvasContainer({ source }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Piqiu3DRenderer | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const simulationDataRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [scalarOptions, setScalarOptions] = useState<ScalarOption[]>([]);
  const [selectedScalarIndex, setSelectedScalarIndex] = useState(0);
  const [selectedSubScalarIndex, setSelectedSubScalarIndex] = useState(0);
  const [renderMode, setRenderMode] = useState<RenderMode>(
    "surface_with_wireframe",
  );

  const selectedScalar = useMemo(() => {
    return (
      scalarOptions.find((item) => item.scalarIndex === selectedScalarIndex) ||
      scalarOptions[0]
    );
  }, [scalarOptions, selectedScalarIndex]);

  const subScalarOptions = selectedScalar?.components || [];

  const applyScalarSelection = (
    scalarIndex: number,
    subScalarIndex: number,
    resetCamera = false,
    modeOverride?: RenderMode,
  ) => {
    const piqiuRenderer = rendererRef.current;
    const simulationData = simulationDataRef.current;
    if (!piqiuRenderer || !simulationData) return;

    try {
      const m = piqiuRenderer.model;
      if (m && typeof m.clear === "function") {
        m.clear();
      }
    } catch (e) {
      // ignore
    }

    piqiuRenderer.loadSiumlationFile(simulationData, {
      scalarSelect: [scalarIndex, subScalarIndex],
      renderMode: modeOverride || renderMode,
    });

    if (resetCamera) {
      piqiuRenderer.updateCamera();
      return;
    }
    piqiuRenderer.model.update();
    piqiuRenderer.scene.render();
  };

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
      src = `${import.meta.env.BASE_URL}models/post.zip`;
    } else if (typeof source === "string") {
      src = source;
    } else {
      objectUrlRef.current = URL.createObjectURL(source);
      src = objectUrlRef.current;
    }

    const loadModel = async () => {
      setIsLoading(true);
      setScalarOptions([]);
      try {
        const { data, ArrayBuffer } = await piqiu3d.Loader.loadZip(src);
        if (canceled || rendererRef.current !== piqiuRenderer) return;
        const { database } = new piqiu3d.LoadDataBase(data, "shader");
        const res = {
          ...data,
          database,
          ArrayBuffer,
        };

        simulationDataRef.current = res;
        const options = buildScalarOptions(res);
        setScalarOptions(options);

        const initScalarIndex = options[0]?.scalarIndex ?? 0;
        const initSubScalarIndex = options[0]?.components[0]?.subIndex ?? 0;
        setSelectedScalarIndex(initScalarIndex);
        setSelectedSubScalarIndex(initSubScalarIndex);
        applyScalarSelection(initScalarIndex, initSubScalarIndex, true);
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
  }, [source]);

  const onScalarChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextScalarIndex = Number(event.target.value);
    const nextScalar =
      scalarOptions.find((item) => item.scalarIndex === nextScalarIndex) ||
      scalarOptions[0];
    const nextSubScalarIndex = nextScalar?.components[0]?.subIndex ?? 0;
    setSelectedScalarIndex(nextScalarIndex);
    setSelectedSubScalarIndex(nextSubScalarIndex);
    applyScalarSelection(nextScalarIndex, nextSubScalarIndex);
  };

  const onSubScalarChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSubScalarIndex = Number(event.target.value);
    setSelectedSubScalarIndex(nextSubScalarIndex);
    applyScalarSelection(selectedScalarIndex, nextSubScalarIndex);
  };

  const onRenderModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextRenderMode = event.target.value as RenderMode;
    setRenderMode(nextRenderMode);

    const nextScalar =
      scalarOptions.find((item) => item.scalarIndex === selectedScalarIndex) ||
      scalarOptions[0];
    const nextSubScalarIndex =
      nextScalar?.components.find(
        (item) => item.subIndex === selectedSubScalarIndex,
      )?.subIndex ??
      nextScalar?.components[0]?.subIndex ??
      0;
    applyScalarSelection(
      selectedScalarIndex,
      nextSubScalarIndex,
      false,
      nextRenderMode,
    );
  };

  return (
    <div>
      {scalarOptions.length > 0 && (
        <div style={{ marginBottom: 10, width: "min(65vw, 100%)", marginInline: "auto" }}>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "flex-start",
              textAlign: "left",
            }}
          >
            <label>
              <span style={{ marginRight: 6 }}>Scalar</span>
              <select value={selectedScalarIndex} onChange={onScalarChange}>
                {scalarOptions.map((item) => (
                  <option key={item.scalarIndex} value={item.scalarIndex}>
                    {item.scalarName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span style={{ marginRight: 6 }}>Component</span>
              <select value={selectedSubScalarIndex} onChange={onSubScalarChange}>
                {subScalarOptions.map((item) => (
                  <option
                    key={`${item.subIndex}-${item.componentName}`}
                    value={item.subIndex}
                  >
                    {item.componentName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span style={{ marginRight: 6 }}>Render Mode</span>
              <select value={renderMode} onChange={onRenderModeChange}>
                <option value="wireframe">Wireframe</option>
                <option value="surface_with_wireframe">
                  Surface + Wireframe
                </option>
                <option value="surface">Surface</option>
              </select>
            </label>
          </div>
        </div>
      )}

      <div className="canvas-stage">
        <canvas ref={canvasRef} id="demo"></canvas>
        <CanvasLoadingOverlay loading={isLoading} />
      </div>
    </div>
  );
}
