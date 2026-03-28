import { useEffect, useRef, useState } from "react";
import * as piqiu3d from "piqiu3d";
import { mat4, vec2, vec3 } from "gl-matrix";
import CanvasLoadingOverlay from "./piQiuModule/common/CanvasLoadingOverlay";
import "./piQiuModule/common/CanvasLoadingOverlay.css";

type WebGPUStatus = "loading" | "ready" | "unsupported" | "error";

type WebGPUDemoProps = {
  autoRotate?: boolean;
  material?: WebGPUMaterialKey;
};

type WebGPUMaterialKey =
  | "phong"
  | "lambert"
  | "pbr"
  | "normal"
  | "wireframe"
  | "unlit";

export default function WebGPUDemo({
  autoRotate = true,
  material: materialKey = "phong",
}: WebGPUDemoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<WebGPUStatus>("loading");
  const [message, setMessage] = useState<string>("");
  const autoRotateRef = useRef(autoRotate);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    let canceled = false;
    let animationId: number | null = null;

    let renderPass: piqiu3d.WebGPURenderPass | null = null;
    let uniformBinding: piqiu3d.WebGPUUniformBinding | null = null;
    let builtIns: piqiu3d.BuiltInUniforms | null = null;
    let drawableAdapter: piqiu3d.WebGPUDrawableAdapter | null = null;
    let gpuDevice: GPUDevice | null = null;
    let depthTexture: GPUTexture | null = null;

    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();
    const modelMatrix = mat4.create();
    const rotationAngleRef = { current: 0 };
    const lastTimeRef = { current: 0 };
    const depthFormat: GPUTextureFormat = "depth24plus";
    const baseFrameOptions = {
      clearColor: { r: 0.06, g: 0.07, b: 0.1, a: 1 },
    };

    let activeAction: "orbit" | "pan" | null = null;
    let orbitTool: piqiu3d.OrbitTool | null = null;
    let panTool: piqiu3d.PanTool | null = null;

    const resize = () => {
      if (!canvasRef.current || !builtIns) return;
      const canvas = canvasRef.current;
      const parent = canvas.parentElement;
      const cssWidth = parent?.clientWidth ?? window.innerWidth * 0.65;
      const cssHeight = parent?.clientHeight ?? window.innerHeight * 0.65;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.round(cssWidth * dpr));
      canvas.height = Math.max(1, Math.round(cssHeight * dpr));
      canvas.style.width = `${Math.round(cssWidth)}px`;
      canvas.style.height = `${Math.round(cssHeight)}px`;

      const aspect = canvas.width / canvas.height;
      mat4.perspectiveZO(projectionMatrix, Math.PI / 4, aspect, 0.1, 100);
      builtIns.projectionMatrix = projectionMatrix;
      builtIns.viewportSize = [canvas.width, canvas.height];

      if (gpuDevice && renderPass) {
        depthTexture?.destroy();
        depthTexture = gpuDevice.createTexture({
          size: [canvas.width, canvas.height, 1],
          format: depthFormat,
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        renderPass.setFrameOptions({
          ...baseFrameOptions,
          depthAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store",
          },
        });
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (!builtIns || !canvasRef.current) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pos = vec2.fromValues(event.offsetX * dpr, event.offsetY * dpr);

      if (event.button === 0) {
        orbitTool = new piqiu3d.OrbitTool(builtIns, pos);
        activeAction = "orbit";
      } else if (event.button === 2) {
        panTool = new piqiu3d.PanTool(builtIns, pos);
        activeAction = "pan";
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!builtIns || !activeAction) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pos = vec2.fromValues(event.offsetX * dpr, event.offsetY * dpr);
      if (activeAction === "orbit" && orbitTool) {
        orbitTool.update(pos);
      } else if (activeAction === "pan" && panTool) {
        panTool.update(pos);
      }
    };

    const handleMouseUp = () => {
      activeAction = null;
      orbitTool = null;
      panTool = null;
    };

    const handleWheel = (event: WheelEvent) => {
      if (!builtIns) return;
      event.preventDefault();
      const view = builtIns.viewMatrix;
      const dir = vec3.fromValues(view[2], view[6], view[10]);
      vec3.normalize(dir, dir);
      const step = event.deltaY * 0.002;
      const delta = vec3.scale(vec3.create(), dir, step);
      const zoomMatrix = mat4.create();
      mat4.translate(zoomMatrix, zoomMatrix, delta);
      mat4.multiply(view, view, zoomMatrix);
      builtIns.viewMatrix = view;
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const render = (time: number) => {
      if (!renderPass || !uniformBinding || !builtIns) return;
      const seconds = time * 0.001;
      const last = lastTimeRef.current || seconds;
      const delta = Math.max(0, seconds - last);
      lastTimeRef.current = seconds;

      if (autoRotateRef.current) {
        rotationAngleRef.current += delta;
      }
      const t = rotationAngleRef.current;
      mat4.identity(modelMatrix);
      mat4.rotateY(modelMatrix, modelMatrix, t * 0.6);
      mat4.rotateX(modelMatrix, modelMatrix, t * 0.3);

      builtIns.modelMatrix = modelMatrix;
      builtIns.update();
      uniformBinding.updateFromUniforms(builtIns);

      renderPass.render();
      animationId = window.requestAnimationFrame(render);
    };

    const init = async () => {
      if (!canvasRef.current) return;

      if (!("gpu" in navigator)) {
        setStatus("unsupported");
        setMessage("WebGPU is not supported in this browser.");
        return;
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        setStatus("unsupported");
        setMessage("No compatible GPU adapter found.");
        return;
      }

      const device = await adapter.requestDevice();
      if (canceled) return;
      gpuDevice = device;

      const canvas = canvasRef.current;
      const context = canvas.getContext("webgpu");
      if (!context) {
        setStatus("unsupported");
        setMessage("Failed to acquire WebGPU canvas context.");
        return;
      }

      const format = piqiu3d.WebGPUContext.getPreferredFormat();
      const renderContext = new piqiu3d.RenderContext(context, {
        backend: piqiu3d.RenderBackendType.WebGPU,
        device,
        format,
        fallback: false,
      });

      renderPass = new piqiu3d.WebGPURenderPass(renderContext);

      builtIns = new piqiu3d.BuiltInUniforms();
      mat4.lookAt(
        viewMatrix,
        vec3.fromValues(2.4, 2.2, 2.8),
        vec3.fromValues(0, 0, 0),
        vec3.fromValues(0, 1, 0),
      );
      builtIns.viewMatrix = viewMatrix;
      builtIns.orbitPoint = vec3.fromValues(0, 0, 0);

      uniformBinding = new piqiu3d.WebGPUUniformBinding(
        {
          layout: piqiu3d.WebGPUBuiltInUniformLayout,
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
        },
        device,
      );

      const cubeGeo = new piqiu3d.CubeGeo(1, 1, 1);
      const geometry = new piqiu3d.Geometry();
      geometry.push(new piqiu3d.VBO("aVertex", 3, cubeGeo.vertices));
      geometry.push(new piqiu3d.VBO("aNormal", 3, cubeGeo.normals));
      geometry.push(new piqiu3d.IBO(cubeGeo.indices));
      geometry.push(
        new piqiu3d.ElementDrawer(
          "triangles",
          cubeGeo.indices.length,
          "unsigned_short",
          0,
        ),
      );

      const drawable = new piqiu3d.Drawable();
      const shader = (() => {
        switch (materialKey) {
          case "unlit":
            return piqiu3d.WebGPUShaderRegistry.createUnlitColor(
              new piqiu3d.Color(0.15, 0.6, 0.9, 1.0),
            ).generate();
          case "lambert":
            return piqiu3d.WebGPUShaderRegistry.createLambert(
              new piqiu3d.Color(0.15, 0.6, 0.9, 1.0),
            ).generate();
          case "pbr":
            return piqiu3d.WebGPUShaderRegistry.createPBRMetallicRoughness(
              new piqiu3d.Color(0.15, 0.6, 0.9, 1.0),
              0.3,
              0.5,
            ).generate();
          case "normal":
            return piqiu3d.WebGPUShaderRegistry.createNormal().generate();
          case "wireframe":
            return piqiu3d.WebGPUShaderRegistry.createWireframe(
              new piqiu3d.Color(0.1, 0.1, 0.1, 1.0),
            ).generate();
          case "phong":
          default:
            return piqiu3d.WebGPUShaderRegistry.createPhong(
              new piqiu3d.Color(0.15, 0.6, 0.9, 1.0),
            ).generate();
        }
      })();

      const program = piqiu3d.WebGPUProgram.fromSource(
        {
          vertex: shader.vertex,
          fragment: shader.fragment,
          label: shader.label ?? "WebGPUCubeProgram",
        },
        device,
      );

      const gpuMaterial = new piqiu3d.WebGPUMaterial({
        program,
        pipelineOptions: {
          ...shader.pipelineOptions,
          targets: [{ format }],
        },
        bindGroups: [uniformBinding.bindGroup],
      });
      gpuMaterial.setBindGroupLayouts([uniformBinding.bindGroupLayout], device);

      const effectiveGeometry =
        materialKey === "wireframe"
          ? piqiu3d.LineUtil.getGeometryWireframeFromGeometry(geometry)
          : geometry;

      drawable.push(effectiveGeometry);

      drawableAdapter = new piqiu3d.WebGPUDrawableAdapter(device);
      const attributeLocations: Record<string, number> =
        materialKey === "wireframe"
          ? { aVertex: 0 }
          : { aVertex: 0, aNormal: 1 };
      const calls = drawableAdapter.buildDrawCalls(drawable, gpuMaterial, {
        attributeLocations: {
          ...shader.attributeLocations,
          ...attributeLocations,
        },
        uniformBinding,
      });
      calls.forEach((call) => renderPass?.queue.add(call));

      resize();
      window.addEventListener("resize", resize);
      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseup", handleMouseUp);
      canvas.addEventListener("mouseleave", handleMouseUp);
      canvas.addEventListener("wheel", handleWheel, { passive: false });
      canvas.addEventListener("contextmenu", handleContextMenu);

      setStatus("ready");
      animationId = window.requestAnimationFrame(render);
    };

    setStatus("loading");
    void init().catch((error: unknown) => {
      const messageText =
        error instanceof Error
          ? error.message
          : "WebGPU initialization failed.";
      setStatus("error");
      setMessage(messageText);
    });

    return () => {
      canceled = true;
      if (animationId !== null) {
        window.cancelAnimationFrame(animationId);
      }
      window.removeEventListener("resize", resize);
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseup", handleMouseUp);
        canvas.removeEventListener("mouseleave", handleMouseUp);
        canvas.removeEventListener("wheel", handleWheel);
        canvas.removeEventListener("contextmenu", handleContextMenu);
      }
      depthTexture?.destroy();
      drawableAdapter?.destroy();
      uniformBinding?.buffer.destroy();
    };
  }, [materialKey]);

  return (
    <div className="canvas-stage" style={{ width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} />
      <CanvasLoadingOverlay
        loading={status === "loading"}
        text="Initializing WebGPU..."
      />
      {status !== "ready" && status !== "loading" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center",
            color: "#f2f5ff",
            background: "rgba(12, 14, 20, 0.7)",
            fontSize: 14,
            letterSpacing: 0.2,
          }}
        >
          {message || "WebGPU is unavailable on this device."}
        </div>
      )}
    </div>
  );
}
