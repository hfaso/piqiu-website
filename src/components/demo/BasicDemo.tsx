import React, { useEffect, useRef } from 'react';
// import styles from './index.less';
import * as piqiu3d from '@piqiu/piqiu3d'
import { vec2, vec3, mat4 } from 'gl-matrix';
import { useMouseHandler } from './handler/MouseHandler';

export default function CanvasContainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<any>(null);
  const mouseHandlerRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    canvas.width = window.innerWidth * 0.5;
    canvas.height = window.innerHeight * 0.5;
    const context = canvas.getContext('webgl2', {
      stencil: false,
    }) as WebGLRenderingContext;
    const renderContext = new piqiu3d.RenderContext(context, []);

    let cubeGeo = new piqiu3d.CubeGeo(0.5, 1, 2);
    const vbo0 = new piqiu3d.VBO('aVertex', 3, cubeGeo.vertices);
    const vbo1 = new piqiu3d.VBO('aNormal', 3, cubeGeo.normals);
    const ibo = new piqiu3d.IBO(cubeGeo.indices);
    const drawer = new piqiu3d.ElementDrawer('triangles', cubeGeo.indices.length, 'unsigned_short', 0);

    const geo = new piqiu3d.Geometry();
    geo.push(vbo0);
    geo.push(vbo1);
    geo.push(ibo);
    geo.push(drawer);

    const eff = piqiu3d.ShaderRegistry.createLightColor().generate();

    let mat4Transform = mat4.create();
    mat4.fromTranslation(mat4Transform, vec3.fromValues(0, 0, 0));
    let transform = new piqiu3d.Transform(mat4Transform);
    const drawable = new piqiu3d.Drawable(transform);
    drawable.push(geo);
    drawable.push(eff);
    drawable.push(new piqiu3d.DepthState(true));

    const part = new piqiu3d.Part(drawable);

    const renderPass = new piqiu3d.RenderPass({
      color: [0.8, 0.8, 0.8, 1],
      depth: 1.0,
    });

    const model = renderPass.model;
    model.add(part);
    model.update();

    const builtinUniforms = renderPass.camera.builtInUniforms;
    let mat4Translate = mat4.create();
    mat4.translate(mat4Translate, mat4Translate, vec3.fromValues(3, 3, 0));
    builtinUniforms.modelMatrix = mat4Translate;
    builtinUniforms.update();

    sceneRef.current = new piqiu3d.Scene(renderContext);
    sceneRef.current.push(renderPass);
    sceneRef.current.size = [canvas.width, canvas.height];


    // 使用封装的MouseHandler
    const dpr = 1;
    const mouseHandler = useMouseHandler({
      builtInUniforms: builtinUniforms,
      onRender: () => {
        if (sceneRef.current) {
          sceneRef.current.render();
        }
      },
      dpr: 1
    });

    mouseHandler.bindEvents(canvas);
    mouseHandlerRef.current = mouseHandler;

    canvas.addEventListener(
      'wheel',
      (event: WheelEvent): void => {
        const action = new piqiu3d.WheelZoomTool(builtinUniforms);
        const current = vec2.fromValues(event.offsetX * dpr, event.offsetY * dpr);
        action.update(current, event.deltaY < 0 ? 1.1 : 1 / 1.1);
        sceneRef.current.render();
      },
      false,
    );
    // 阻止右键菜单
    canvas.oncontextmenu = (event) => {
      event.preventDefault();
    };

    const resetTool = new piqiu3d.ResetTool(renderPass.camera.builtInUniforms);
    const boundingBox = new piqiu3d.BoundingBox(
      vec3.fromValues(-0.1, -2, -0.1),
      vec3.fromValues(0.1, 2, 0.1),
    );

    resetTool.home(boundingBox);

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth / 2;
      canvas.height = window.innerHeight / 2;

      sceneRef.current.size = [canvas.width, canvas.height];
      sceneRef.current.render();
    });

    sceneRef.current.render();
    
    return () => {
      if (mouseHandlerRef.current) {
        mouseHandlerRef.current.destroy(canvas);
      }
    };
  }, []);

  return (
    <div>
      <canvas
        ref={canvasRef}
        id="demo"
        style={{
          background: 'red',
        }}
      ></canvas>
    </div>
  );
}