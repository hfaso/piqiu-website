import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import * as piqiu3d from "piqiu3d";
import { Piqiu3DRenderer, type RenderMode } from "../Piqiu3DRenderer";
import CanvasLoadingOverlay from "../common/CanvasLoadingOverlay";

type Props = {
  source?: string | File | null;
};

type FrameOption = {
  subIndex: number;
  step: number | null;
  time: number | null;
};

type ScalarOption = {
  scalarIndex: number;
  scalarName: string;
  components: Array<{
    componentName: string;
    frames: FrameOption[];
  }>;
};

function buildScalarOptions(result: any): ScalarOption[] {
  const scalarList = result?.database?.model?.scalar;
  if (!Array.isArray(scalarList)) return [];

  return scalarList.map((scalar: any, scalarIndex: number) => {
    const componentMap = new Map<
      string,
      {
        componentName: string;
        frames: FrameOption[];
      }
    >();
    const data = Array.isArray(scalar?.data) ? scalar.data : [];

    data.forEach((subScalar: any, subIndex: number) => {
      const name =
        (typeof subScalar?.component_name === "string" &&
          subScalar.component_name.trim()) ||
        scalar?.name ||
        `Component ${subIndex + 1}`;

      const frame: FrameOption = {
        subIndex,
        step:
          typeof subScalar?.current_step === "number"
            ? subScalar.current_step
            : null,
        time:
          typeof subScalar?.current_time === "number"
            ? subScalar.current_time
            : null,
      };

      const existing = componentMap.get(name);
      if (existing) {
        existing.frames.push(frame);
      } else {
        componentMap.set(name, {
          componentName: name,
          frames: [frame],
        });
      }
    });

    const components = Array.from(componentMap.values());
    if (components.length === 0) {
      components.push({
        componentName: scalar?.name || "Default",
        frames: [{ subIndex: 0, step: null, time: null }],
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
  const DEFAULT_FRAME_INDEX = 1;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Piqiu3DRenderer | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const simulationDataRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [scalarOptions, setScalarOptions] = useState<ScalarOption[]>([]);
  const [selectedScalarIndex, setSelectedScalarIndex] = useState(0);
  const [selectedComponentName, setSelectedComponentName] = useState("");
  const [selectedSubScalarIndex, setSelectedSubScalarIndex] = useState(0);
  const [renderMode, setRenderMode] = useState<RenderMode>(
    "surface_with_wireframe",
  );
  const renderModeRef = useRef<RenderMode>("surface_with_wireframe");

  const selectedScalar = useMemo(() => {
    return (
      scalarOptions.find((item) => item.scalarIndex === selectedScalarIndex) ||
      scalarOptions[0]
    );
  }, [scalarOptions, selectedScalarIndex]);

  const componentOptions = useMemo(
    () => selectedScalar?.components || [],
    [selectedScalar],
  );

  useEffect(() => {
    renderModeRef.current = renderMode;
  }, [renderMode]);

  const applyScalarSelection = useCallback(
    (
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
      } catch {
        // ignore
      }

      piqiuRenderer.loadSiumlationFile(simulationData, {
        scalarSelect: [scalarIndex, subScalarIndex],
        frameIndex: DEFAULT_FRAME_INDEX,
        renderMode: modeOverride || renderModeRef.current,
      });

      if (resetCamera) {
        piqiuRenderer.updateCamera();
        return;
      }
      piqiuRenderer.model.update();
      piqiuRenderer.requestRender();
    },
    [],
  );

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
      src = `${import.meta.env.BASE_URL}models/post.zip`;
      // src = `${import.meta.env.BASE_URL}models/merged_time_all.vtk.zip`;
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
        const initComponentName =
          options[0]?.components[0]?.componentName || "";
        const initSubScalarIndex =
          options[0]?.components[0]?.frames[0]?.subIndex ?? 0;
        setSelectedScalarIndex(initScalarIndex);
        setSelectedComponentName(initComponentName);
        setSelectedSubScalarIndex(initSubScalarIndex);
        applyScalarSelection(
          initScalarIndex,
          initSubScalarIndex,
          true,
        );
      } catch {
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
  }, [source, applyScalarSelection]);

  const onScalarChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextScalarIndex = Number(event.target.value);
    const nextScalar =
      scalarOptions.find((item) => item.scalarIndex === nextScalarIndex) ||
      scalarOptions[0];
    const nextComponentName = nextScalar?.components[0]?.componentName || "";
    const nextSubScalarIndex =
      nextScalar?.components[0]?.frames[0]?.subIndex ?? 0;
    setSelectedScalarIndex(nextScalarIndex);
    setSelectedComponentName(nextComponentName);
    setSelectedSubScalarIndex(nextSubScalarIndex);
    applyScalarSelection(nextScalarIndex, nextSubScalarIndex);
  };

  const onComponentChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextComponentName = event.target.value;
    const nextComponent =
      componentOptions.find(
        (item) => item.componentName === nextComponentName,
      ) || componentOptions[0];
    const nextSubScalarIndex = nextComponent?.frames[0]?.subIndex ?? 0;
    setSelectedComponentName(nextComponentName);
    setSelectedSubScalarIndex(nextSubScalarIndex);
    applyScalarSelection(selectedScalarIndex, nextSubScalarIndex);
  };

  const onRenderModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextRenderMode = event.target.value as RenderMode;
    setRenderMode(nextRenderMode);

    const nextScalar =
      scalarOptions.find((item) => item.scalarIndex === selectedScalarIndex) ||
      scalarOptions[0];
    const nextComponent =
      nextScalar?.components.find(
        (item) => item.componentName === selectedComponentName,
      ) || nextScalar?.components[0];
    const nextSubScalarIndex =
      nextComponent?.frames.find(
        (item) => item.subIndex === selectedSubScalarIndex,
      )?.subIndex ??
      nextComponent?.frames[0]?.subIndex ??
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
              <select
                value={selectedComponentName}
                onChange={onComponentChange}
              >
                {componentOptions.map((item) => (
                  <option key={item.componentName} value={item.componentName}>
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
