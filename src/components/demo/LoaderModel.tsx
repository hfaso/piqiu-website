import React, { useEffect, useRef, useState } from 'react';
import * as piqiu3d from '@piqiu/piqiu3d'
import { Piqiu3DRenderer } from './piQiuModule/Piqiu3DRenderer';
import LoaderModel from '../../pages/LoaderModel';

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

        debugger;
        LoaderModel(piqiuRenderer);
    }, []);

    async function LoaderModel(piqiuRenderer: Piqiu3DRenderer) {
        const loader = new piqiu3d.GLTFLoader();
        debugger;
        const meshes = await loader.load(piqiuRenderer.renderContext, '/models/teachers_desk.glb');

        for (const mesh of meshes) {
            mesh.draw(piqiuRenderer.renderContext);
        }

        piqiuRenderer.addPart(loaderPart);

        piqiuRenderer.addGeneralEventListener();

        piqiuRenderer.updateCamera();
    }

    return (
        <div>
            <canvas
                ref={canvasRef}
                id="demo"
            ></canvas>
        </div>
    );
}