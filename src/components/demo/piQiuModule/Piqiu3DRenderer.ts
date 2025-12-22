import * as piqiu3d from '@piqiu/piqiu3d';
import { useMouseHandler } from './handler/MouseHandler';
import { vec2, vec3 } from 'gl-matrix';

export class Piqiu3DRenderer {
    private canvas: HTMLCanvasElement;
    private renderContext: piqiu3d.RenderContext;
    private renderPass: piqiu3d.RenderPass;
    public scene: piqiu3d.Scene;
    public mouseHandler: any;
    public dpr = window.devicePixelRatio || 1;
    // 可以按需暴露其他属性，如模型、内置uniforms等
    public get model() {
        return this.renderPass.model;
    }
    public get builtInUniforms() {
        return this.renderPass.camera.builtInUniforms;
    }

    constructor(canvas: HTMLCanvasElement, initialSize: { width: number; height: number }) {
        if (!canvas) {
            throw new Error('Canvas element is required.');
        }
        this.canvas = canvas;

        // 1. 初始化渲染上下文和渲染通道
        const glContext = this.canvas.getContext('webgl2', { stencil: false });
        if (!glContext) {
            throw new Error('WebGL2 context is not supported.');
        }
        this.renderContext = new piqiu3d.RenderContext(glContext, []);

        this.renderPass = new piqiu3d.RenderPass({
            color: [0.8, 0.8, 0.8, 1],
            depth: 1.0,
        });

        // 2. 初始化场景
        this.scene = new piqiu3d.Scene(this.renderContext);
        this.scene.push(this.renderPass);
        this.setSize(initialSize.width, initialSize.height);

        // 3. 初始化鼠标处理器
        this.mouseHandler = useMouseHandler({
            builtInUniforms: this.builtInUniforms,
            onRender: () => {
                if (this.scene) {
                    this.scene.render();
                }
            },
            dpr: this.dpr
        });

        // 阻止右键菜单
        this.canvas.oncontextmenu = (event) => {
            event.preventDefault();
        };
    }

    // 简化part增加方法
    addPart(part: piqiu3d.Part) {
        this.model.add(part);
        this.model.update();
    }

    // 添加通用事件监听器
    addGeneralEventListener() {
        this.addMouseEventListener();
        this.addMouseWheelEventListener();
        this.addWindowResizeListener();
    }

    addMouseEventListener() {
        this.mouseHandler.bindEvents(this.canvas);
    }

    addMouseWheelEventListener() {
        this.canvas.addEventListener(
            'wheel',
            (event: WheelEvent): void => {
                const action = new piqiu3d.WheelZoomTool(this.builtInUniforms);
                const current = vec2.fromValues(event.offsetX * this.dpr, event.offsetY * this.dpr);
                action.update(current, event.deltaY < 0 ? 1.1 : 1 / 1.1);
                this.scene.render();
            },
            false,
        );
    }

    addWindowResizeListener() {
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth / 2;
            this.canvas.height = window.innerHeight / 2;

            this.scene.size = [this.canvas.width, this.canvas.height];
            this.scene.render();
        });
    }

    // 更新相机位置以适应当前场景
    updateCamera() {
        const resetTool = new piqiu3d.ResetTool(this.builtInUniforms);
        const boundingBox = new piqiu3d.BoundingBox(
            vec3.fromValues(-0.1, -2, -0.1),
            vec3.fromValues(0.1, 2, 0.1),
        );

        resetTool.home(boundingBox);

        this.scene.render();
    }

    removeMouseEventListener() {
        this.mouseHandler.unbindEvents(this.canvas);
    }

    /**
     * 设置画布大小
     */
    public setSize(width: number, height: number): void {
        if (width <= 0 || height <= 0) {
            console.warn('Invalid canvas size.');
            return;
        }
        this.scene.size = [width, height];
        // 通常还需要更新相机纵横比等，此处取决于piqiu3d的内部实现
        console.log(`Scene size set to: ${width}x${height}`);
    }

    /**
     * 清理资源，防止内存泄漏
     */
    public dispose(): void {
        // 执行piqiu3d内部所需的清理操作
        // 例如：this.scene.remove(this.renderPass); 
        console.log('Piqiu3DRenderer disposed.');
    }
}