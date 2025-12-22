import React, { useEffect, useRef, useState } from 'react';
// import styles from './index.less';
import * as piqiu3d from '@piqiu/piqiu3d'
import { vec2, vec3, mat4 } from 'gl-matrix';
import { useMouseHandler } from './handler/MouseHandler';
import { Piqiu3DRenderer } from './module/Piqiu3DRenderer';

export default function CanvasContainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<any>(null);
  const mouseHandlerRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 0.5;
    canvas.height = window.innerHeight * 0.5;

    const piqiuRenderer = new Piqiu3DRenderer(canvas, { width: canvas.width, height: canvas.height });
    sceneRef.current = piqiuRenderer.scene;
    const builtInUniforms = piqiuRenderer.builtInUniforms;

    const cubePart = new piqiu3d.CubePart(1, 1, 1);

    piqiuRenderer.addPart(cubePart);

    const dpr = 1;
    const mouseHandler = useMouseHandler({
      builtInUniforms: builtInUniforms,
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
        const action = new piqiu3d.WheelZoomTool(builtInUniforms);
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

    const resetTool = new piqiu3d.ResetTool(builtInUniforms);
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
      ></canvas>
    </div>
  );
}