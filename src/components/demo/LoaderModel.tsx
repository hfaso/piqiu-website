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
        const GLTFParser = new piqiu3d.GLTFParser(piqiuRenderer.renderContext)
        try {
            // 替换为你的GLTF文件路径（建议使用glTF 2.0格式的模型，如Box.gltf）
            // await GLTFParser.load('/models/sample.gltf');
            await GLTFParser.load('/models/teachers_desk/scene.gltf');
        } catch (e) {
            console.error('GLTF加载失败:', e);
            return;
        }

        const meshIndices = GLTFParser.getDefaultSceneMeshIndices();
        for (const meshIdx of meshIndices) {
            const primitives = GLTFParser.buildMesh(meshIdx);
            for (const primitive of primitives) {
                const positionAttr = primitive.attributes.POSITION;
            }
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