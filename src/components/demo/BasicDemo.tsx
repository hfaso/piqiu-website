import React, { useEffect, useRef, useState } from 'react';
// import styles from './index.less';
import * as piqiu3d from '@piqiu/piqiu3d'
import { Piqiu3DRenderer } from './module/Piqiu3DRenderer';

export default function CanvasContainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 0.5;
    canvas.height = window.innerHeight * 0.5;

    const piqiuRenderer = new Piqiu3DRenderer(canvas, { width: canvas.width, height: canvas.height });
    sceneRef.current = piqiuRenderer.scene;

    const cubePart = new piqiu3d.CubePart(1, 1, 1);

    piqiuRenderer.addPart(cubePart);

    piqiuRenderer.addMouseEventListener();
    piqiuRenderer.addMouseWheelEventListener();

    piqiuRenderer.updateCamera();

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth / 2;
      canvas.height = window.innerHeight / 2;

      sceneRef.current.size = [canvas.width, canvas.height];
      sceneRef.current.render();
    });
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