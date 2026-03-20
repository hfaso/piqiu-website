/**
 * PartSelector - 部件选择器 v6
 * 使用 FBO 实现点击选择
 */

import * as piqiu3d from "piqiu3d";
import { vec2 } from "gl-matrix";

console.log("PartSelector.ts v6 loaded");

export class PartSelector {
  // 渲染上下文和渲染通道
  private renderContext: piqiu3d.RenderContext;
  private renderPass: piqiu3d.RenderPass;

  // 渲染回调
  private onRender: () => void;

  // ============ 优化：使用 PickPass (小 FBO + Scissor) ============
  private pickPass: any = null;

  // 画布尺寸
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  // 是否已初始化
  private initialized: boolean = false;

  // 缓存：预渲染的 ID 模型
  private cachedIdModel: piqiu3d.Model | null = null;

  // 缓存：FBO 是否需要更新（模型变化时设为 true）
  private fboDirty: boolean = true;

  // 当前模型的 part 数量，用于检测模型变化
  private cachedModelPartCount: number = 0;

  // 小 FBO 尺寸（拾取区域大小）
  private readonly PICK_FBO_SIZE = 32;

  // 缓存：是否已将 ID Model 绑定到 pickPass
  private pickModelAttached: boolean = false;

  // 异步拾取：避免 readPixels 阻塞当帧
  private pendingPickToken: number = 0;
  private pendingPickHandle: number | null = null;

  // 复用 ID effect，避免重复创建
  private idEffectCache: Map<number, any> = new Map();

  // BVH 射线预筛选（减少渲染负载）
  private rayIntersector: piqiu3d.RayIntersector | null = null;
  private rayDirty: boolean = true;
  private rayBuildPending: boolean = false;
  private rayBuildHandle: number | null = null;
  private readonly MAX_PREFILTER_PARTS = 256;

  constructor(
    renderPass: piqiu3d.RenderPass,
    onRender: () => void,
    renderContext?: piqiu3d.RenderContext,
  ) {
    this.renderPass = renderPass;
    this.renderContext = renderContext as piqiu3d.RenderContext;
    this.onRender = onRender;
    console.log("PartSelector v6 initialized");
  }

  /**
   * 获取当前 canvas 尺寸
   * 关键: canvas有两个尺寸概念
   * - CSS尺寸 (clientWidth/clientHeight): 998*477 在屏幕上显示的大小
   * - GL缓冲区尺寸 (width/height): 实际WebGL渲染的像素大小,可能因DPR而不同
   * FBO需要使用GL缓冲区尺寸
   */
  private updateCanvasSize(): void {
    const gl = this.renderContext.gl;
    if (!gl) return;

    // WebGL 缓冲区尺寸（实际渲染的像素数）
    this.canvasWidth = gl.canvas.width;
    this.canvasHeight = gl.canvas.height;

    // 获取CSS尺寸用于诊断
    const canvas = gl.canvas as HTMLCanvasElement;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;

    // 如果 PickPass 已创建,更新其尺寸
    if (this.pickPass) {
      const pickW = Math.max(1, Math.min(this.PICK_FBO_SIZE, this.canvasWidth));
      const pickH = Math.max(
        1,
        Math.min(this.PICK_FBO_SIZE, this.canvasHeight),
      );
      const fbo = (this.pickPass as any).fbo;
      if (fbo) {
        fbo.size = [pickW, pickH];
      } else {
        (this.pickPass as any).size = [pickW, pickH];
      }
      // 视口保持为主画布大小，避免影响投影比例
      if ((this.pickPass as any).camera?.viewport) {
        (this.pickPass as any).camera.viewport.size = [
          this.canvasWidth,
          this.canvasHeight,
        ];
      }
    }

    console.log("DEBUG Canvas size info:", {
      cssSize: [cssWidth, cssHeight],
      glSize: [this.canvasWidth, this.canvasHeight],
      scale: [this.canvasWidth / cssWidth, this.canvasHeight / cssHeight],
    });
  }

  /**
   * 初始化 FBO
   */
  private initFBO(): void {
    if (this.initialized) return;

    console.log("Initializing pick FBO...");

    const gl = this.renderContext.gl;
    if (!gl) {
      console.error("WebGL context not available");
      return;
    }

    // 获取当前 canvas 尺寸 (使用 GL 尺寸)
    this.updateCanvasSize();

    // ============ 诊断信息: 验证坐标系 ============
    const canvas = gl.canvas as HTMLCanvasElement;
    console.log("==== COORDINATE SYSTEM DIAGNOSIS ====");
    console.log("Canvas CSS size (visible):", [
      canvas.clientWidth,
      canvas.clientHeight,
    ]);
    console.log("Canvas GL size (buffer):", [canvas.width, canvas.height]);
    console.log("Scale factor (GL/CSS):", [
      canvas.width / canvas.clientWidth,
      canvas.height / canvas.clientHeight,
    ]);
    console.log("=====================================");

    console.log("DEBUG Canvas size:", this.canvasWidth, "x", this.canvasHeight);

    // 使用 OffScreenPass（全尺寸 FBO，确保稳定性）
    this.pickPass = new piqiu3d.OffScreenPass({
      color: [0, 0, 0, 0],
      depth: 1.0,
    });

    // 设置 FBO 尺寸与 canvas 一致
    const pickW = Math.max(1, Math.min(this.PICK_FBO_SIZE, this.canvasWidth));
    const pickH = Math.max(1, Math.min(this.PICK_FBO_SIZE, this.canvasHeight));
    const fbo = (this.pickPass as any).fbo;
    if (fbo) {
      fbo.size = [pickW, pickH];
    } else {
      (this.pickPass as any).size = [pickW, pickH];
    }
    if ((this.pickPass as any).camera?.viewport) {
      (this.pickPass as any).camera.viewport.size = [
        this.canvasWidth,
        this.canvasHeight,
      ];
    }

    console.log("DEBUG OffScreenPass created");

    this.initialized = true;
    this.pickModelAttached = false;
    console.log("Pick FBO initialized");
  }

  /**
   * 为 Part 生成唯一的 ID 颜色
   * 参考 piqiu3d 的 ColorUtil.id2Color 方法
   */
  private getIdColor(id: number): piqiu3d.Color {
    // 使用 piqiu3d 引擎的颜色工具生成 ID 颜色
    // 这样可以确保与引擎的 ID 解析一致
    const aryColor = piqiu3d.ColorUtil.id2Color(id);
    return new piqiu3d.Color(
      aryColor[0],
      aryColor[1],
      aryColor[2],
      aryColor[3],
    );
  }

  /**
   * 从颜色中解析 ID
   * 参考 piqiu3d 的 ColorUtil.color2Id 方法
   */
  private parseIdFromColor(color: Uint8Array): number {
    if (!color || color.length < 4) return -1;
    // 使用 piqiu3d 引擎的颜色工具解析 ID
    return piqiu3d.ColorUtil.color2Id(color[0], color[1], color[2], color[3]);
  }

  /**
   * 处理点击事件
   */
  handleClick(pos: vec2): void {
    console.log("PartSelector handleClick, raw pos from MouseHandler:", [
      pos[0],
      pos[1],
    ]);

    // 每次点击时更新 canvas 尺寸
    this.updateCanvasSize();

    if (!this.initialized) {
      this.initFBO();
    }

    const model = this.renderPass.model;
    const camera = this.renderPass.camera;

    if (!model || !camera) {
      console.error("Model or camera not available");
      return;
    }

    // 模型结构变化时，标记缓存失效
    if (this.cachedIdModel && this.cachedModelPartCount !== model.size) {
      this.fboDirty = true;
      this.pickModelAttached = false;
      this.rayDirty = true;
    }

    if (this.rayDirty && !this.rayBuildPending) {
      this.scheduleRayBuild(model, camera.builtInUniforms);
    }

    const gl = this.renderContext.gl;
    if (!gl) {
      console.error("WebGL context not available");
      return;
    }

    // ============ 关键: 坐标系转换 ============
    // pos来自MouseHandler，已经乘以了dpr
    // 但我们需要验证这个坐标是否与FBO的实际GL坐标匹配
    // 标准做法是通过CSS尺寸和GL尺寸的比例来转换
    const canvas = gl.canvas as HTMLCanvasElement;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    const scaleX = this.canvasWidth / cssWidth;
    const scaleY = this.canvasHeight / cssHeight;

    // 从CSS坐标转换为GL坐标（标准且可靠的方法）
    // 使用 pos 的长度来判断是否已经进行了DPR转换
    // 理想情况下，pos应该是GL坐标
    // 但如果不对应，我们需要重新计算
    const glX = (pos[0] / cssWidth) * this.canvasWidth;
    const glY = (pos[1] / cssHeight) * this.canvasHeight;

    console.log("DEBUG PartSelector coordinate conversion:", {
      inputPos: [pos[0], pos[1]],
      cssSize: [cssWidth, cssHeight],
      glSize: [this.canvasWidth, this.canvasHeight],
      scale: [scaleX, scaleY],
      convertedGlPos: [glX, glY],
      modelSize: model.size,
      fboReady: !!this.pickPass,
    });

    // 渲染到 FBO 并读取结果（使用转换后的GL坐标）
    this.renderAndPick(gl, model, camera, vec2.fromValues(glX, glY));
  }

  /**
   * 创建 ID 模型（每次都创建新的，避免缓存问题）
   */
  // 每次都创建新的 ID 模型，确保状态干净

  /**
   * 缓存并复用 ID 模型，避免每次点击都重建
   */
  private ensureIdModel(
    model: piqiu3d.Model,
    offscreenPass: any,
  ): piqiu3d.Model | null {
    if (this.fboDirty || !this.cachedIdModel) {
      this.cachedIdModel = this.createIdModelWithEffect(model);
      this.cachedModelPartCount = this.cachedIdModel
        ? this.cachedIdModel.size
        : 0;
      this.fboDirty = false;
      this.pickModelAttached = false;
    }

    if (!this.cachedIdModel) return null;

    if (!this.pickModelAttached) {
      offscreenPass.model.clear();
      offscreenPass.model.add(this.cachedIdModel);
      offscreenPass.model.update(true);
      this.pickModelAttached = true;
    }

    return this.cachedIdModel;
  }

  private scheduleRayBuild(
    model: piqiu3d.Model,
    builtInUniforms: piqiu3d.BuiltInUniforms,
  ): void {
    this.rayBuildPending = true;
    const build = () => {
      try {
        if (!this.rayIntersector) {
          this.rayIntersector = new piqiu3d.RayIntersector(builtInUniforms);
        }
        this.rayIntersector.setModel(model);
        this.rayDirty = false;
      } catch (err) {
        console.warn("Ray build failed", err);
      } finally {
        this.rayBuildPending = false;
        this.rayBuildHandle = null;
      }
    };

    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout?: number }) => number)
      | undefined;
    if (ric) {
      this.rayBuildHandle = ric(build, { timeout: 1000 });
    } else {
      this.rayBuildHandle = window.setTimeout(build, 0);
    }
  }

  /**
   * 渲染并拾取 - 使用 OffScreenPass（全尺寸 FBO）
   */
  private renderAndPick(
    gl: WebGL2RenderingContext,
    model: piqiu3d.Model,
    camera: piqiu3d.Camera,
    pos: vec2,
  ): void {
    const offscreenPass = this.pickPass;
    if (!offscreenPass) return;

    // 确保 FBO 尺寸正确
    const pickW = Math.max(1, Math.min(this.PICK_FBO_SIZE, this.canvasWidth));
    const pickH = Math.max(1, Math.min(this.PICK_FBO_SIZE, this.canvasHeight));
    const fbo = (offscreenPass as any).fbo;
    if (fbo) {
      fbo.size = [pickW, pickH];
    } else {
      (offscreenPass as any).size = [pickW, pickH];
    }
    if ((offscreenPass as any).camera?.viewport) {
      (offscreenPass as any).camera.viewport.size = [
        this.canvasWidth,
        this.canvasHeight,
      ];
    }

    // 设置相机
    offscreenPass.camera.builtInUniforms = camera.builtInUniforms;

    // BVH 射线预筛选，减少需要渲染的部件数量
    let idModel: piqiu3d.Model | null = null;
    if (!this.rayDirty && this.rayIntersector && !this.rayBuildPending) {
      try {
        const hitParts = this.rayIntersector.hitTestPart(
          vec2.fromValues(pos[0], pos[1]),
        );
        if (
          hitParts &&
          hitParts.length > 0 &&
          hitParts.length <= this.MAX_PREFILTER_PARTS
        ) {
          idModel = this.createIdModelWithEffect(
            model,
            new Set(hitParts as piqiu3d.Part[]),
          );
          if (idModel) {
            offscreenPass.model.clear();
            offscreenPass.model.add(idModel);
            offscreenPass.model.update(true);
            this.pickModelAttached = false;
          }
        }
      } catch (err) {
        console.warn("Ray prefilter failed, fallback to full ID model", err);
      }
    }

    if (!idModel) {
      idModel = this.ensureIdModel(model, offscreenPass);
    }
    if (!idModel) {
      console.error("Failed to create ID model");
      return;
    }

    // 添加 ID 模型到 offscreen pass
    // 启用并渲染
    // 使用 Scissor 仅渲染点击附近的区域
    const clickX = Math.max(
      0,
      Math.min(this.canvasWidth - 1, Math.floor(pos[0])),
    );
    const clickY = Math.max(
      0,
      Math.min(this.canvasHeight - 1, Math.floor(this.canvasHeight - pos[1])),
    );
    const viewport = (offscreenPass as any).camera?.viewport;
    const prevViewportPos: [number, number] | null = viewport
      ? viewport.pos
      : null;
    const prevViewportSize: [number, number] | null = viewport
      ? viewport.size
      : null;
    if (viewport) {
      viewport.pos = [
        Math.floor(-clickX + pickW / 2),
        Math.floor(-clickY + pickH / 2),
      ];
      viewport.size = [this.canvasWidth, this.canvasHeight];
    }

    const wasScissorEnabled = gl.isEnabled(gl.SCISSOR_TEST);
    const prevScissor = gl.getParameter(gl.SCISSOR_BOX) as Int32Array;
    if (wasScissorEnabled) gl.disable(gl.SCISSOR_TEST);

    offscreenPass.enabled = true;
    try {
      offscreenPass.render();
      console.log("DEBUG Render completed");
    } catch (e) {
      console.error("Render error:", e);
      offscreenPass.enabled = false;
      if (wasScissorEnabled) {
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(
          prevScissor[0],
          prevScissor[1],
          prevScissor[2],
          prevScissor[3],
        );
      } else {
        gl.disable(gl.SCISSOR_TEST);
      }
      if (viewport && prevViewportPos && prevViewportSize) {
        viewport.pos = prevViewportPos;
        viewport.size = prevViewportSize;
      }
      return;
    }

    // 确保渲染完成
    gl.flush();

    // 恢复 scissor 状态
    if (wasScissorEnabled) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(
        prevScissor[0],
        prevScissor[1],
        prevScissor[2],
        prevScissor[3],
      );
    } else {
      gl.disable(gl.SCISSOR_TEST);
    }
    if (viewport && prevViewportPos && prevViewportSize) {
      viewport.pos = prevViewportPos;
      viewport.size = prevViewportSize;
    }

    // 异步读取像素，避免当帧 GPU→CPU 阻塞
    const fboData = (offscreenPass as any).fbo;
    const token = ++this.pendingPickToken;
    if (this.pendingPickHandle !== null) {
      cancelAnimationFrame(this.pendingPickHandle);
    }
    const pickWidth = pickW;
    const pickHeight = pickH;
    this.pendingPickHandle = requestAnimationFrame(() => {
      if (token !== this.pendingPickToken) return;
      this.pendingPickHandle = null;

      if (fboData && fboData.framebuffer) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fboData.framebuffer);
      } else if (fboData && typeof fboData.bind === "function") {
        fboData.bind();
      } else {
        console.warn("DEBUG FBO framebuffer not found");
        return;
      }

      const x = Math.floor(pickWidth / 2);
      const y = Math.floor(pickHeight / 2);

      const pixel = new Uint8Array(4);
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

      const glError = gl.getError();
      if (glError !== gl.NO_ERROR) {
        console.error("WebGL error during readPixels:", glError);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const partId = this.parseIdFromColor(pixel);

      console.log("鈻堚枅鈻堚枅 PICK RESULT 鈻堚枅鈻堚枅", {
        glCoords: [pos[0], pos[1]],
        readPixelsCoords: [x, y],
        pixelColor: {
          r: pixel[0],
          g: pixel[1],
          b: pixel[2],
          a: pixel[3],
        },
        colorArray: Array.from(pixel),
        partId,
        isValid: partId > 0,
      });

      if (partId > 0) {
        console.log("鉁?Successfully selected part:", partId);
        this.highlightPart(model, partId);
      } else {
        console.warn("鉁?Invalid part ID or background clicked");
      }
    });
  }

  /**
   * 快照：渲染当前 ID/FBO 内容并下载为 PNG
   * 用于调试 FBO 内容（在中键点击时调用）
   */
  snapshot() {
    const gl = this.renderContext.gl;
    if (!gl) {
      console.error("WebGL context not available for snapshot");
      return;
    }

    if (!this.pickPass) {
      this.initFBO();
    }

    const offscreenPass = this.pickPass;
    if (!offscreenPass) {
      console.error("Offscreen pass not available for snapshot");
      return;
    }

    // 确保尺寸最新
    this.updateCanvasSize();

    // 渲染 ID 模型 到 offscreen
    try {
      // 复用 renderAndPick 的创建ID逻辑: 创建 idModel 并渲染
      const idModel = this.createIdModelWithEffect(this.renderPass.model);
      if (!idModel) {
        console.error("Failed to create ID model for snapshot");
        return;
      }

      offscreenPass.model.clear();
      offscreenPass.model.add(idModel);
      // ensure offscreen camera uses current camera uniforms
      try {
        offscreenPass.camera.builtInUniforms =
          this.renderPass.camera.builtInUniforms;
      } catch (err) {
        console.warn("Could not set offscreenPass.camera.builtInUniforms", err);
      }

      offscreenPass.model.update(true);
      offscreenPass.enabled = true;
      offscreenPass.render();
      gl.flush();

      const fboData = (offscreenPass as any).fbo;
      console.log("Snapshot FBO data:", fboData);

      const pickW = Math.max(1, Math.min(this.PICK_FBO_SIZE, this.canvasWidth));
      const pickH = Math.max(
        1,
        Math.min(this.PICK_FBO_SIZE, this.canvasHeight),
      );
      let w = pickW;
      let h = pickH;

      let pixels: Uint8Array | null = null;
      // Prefer FBO's read API if available
      if (fboData && typeof fboData.read === "function") {
        try {
          const read = fboData.read();
          if (read && read.data) {
            // read.data is Uint8Array with length w*h*4
            pixels = new Uint8Array(read.data.buffer.slice(0));
            console.log("Used fboData.read() to get pixels", {
              width: read.width,
              height: read.height,
            });
            if (read.width && read.height) {
              w = read.width;
              h = read.height;
            }
          }
        } catch (err) {
          console.warn("fboData.read() failed:", err);
        }
      }

      // Fallback to binding framebuffer and gl.readPixels
      if (!pixels) {
        if (fboData && fboData.framebuffer) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, fboData.framebuffer);
          console.log("Bound fboData.framebuffer for readPixels");
        } else if (fboData && typeof fboData.bind === "function") {
          try {
            fboData.bind();
            console.log("Called fboData.bind() for readPixels");
          } catch (err) {
            console.warn("fboData.bind() failed:", err);
          }
        } else {
          console.warn(
            "No FBO framebuffer available; attempting direct readPixels from default framebuffer",
          );
        }

        pixels = new Uint8Array(w * h * 4);
        try {
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        } catch (err) {
          console.error("gl.readPixels failed:", err);
        }
      }

      // 解除绑定
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      offscreenPass.enabled = false;

      if (!pixels) {
        console.error("No pixel data available for snapshot");
        offscreenPass.enabled = false;
        return;
      }

      // Flip Y and put into ImageData
      const clamped = new Uint8ClampedArray(w * h * 4);
      for (let y = 0; y < h; y++) {
        const srcRow = (h - 1 - y) * w * 4;
        const dstRow = y * w * 4;
        for (let x = 0; x < w * 4; x++) {
          clamped[dstRow + x] = pixels[srcRow + x];
        }
      }

      // Log center pixel to help diagnose black image
      const cx = Math.floor(w / 2);
      const cy = Math.floor(h / 2);
      const centerIdx = (cy * w + cx) * 4;
      console.log(
        "Snapshot center pixel RGBA:",
        clamped[centerIdx],
        clamped[centerIdx + 1],
        clamped[centerIdx + 2],
        clamped[centerIdx + 3],
      );

      // Ensure image is opaque for visualization: set alpha to 255 where it's 0
      for (let i = 0; i < clamped.length; i += 4) {
        if (clamped[i + 3] === 0) clamped[i + 3] = 255;
      }

      // Create canvas and draw
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error("2D context not available for snapshot");
        return;
      }
      const imageData = new ImageData(clamped, w, h);
      ctx.putImageData(imageData, 0, 0);

      // Trigger download
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error("Failed to create snapshot blob");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const now = new Date();
        const ts = now.toISOString().replace(/[:.]/g, "-");
        a.download = `fbo-snapshot-${ts}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        console.log("Snapshot downloaded:", a.download);
      }, "image/png");
    } catch (e) {
      console.error("Snapshot render failed:", e);
      try {
        offscreenPass.enabled = false;
      } catch {}
    }
  }

  /**
   * 存储原始 effect 以便恢复
   */

  /**
   * 创建 ID 模型 - 通过修改原始模型的 effect
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createIdModelWithEffect(
    originalModel: any,
    partFilter?: Set<piqiu3d.Part>,
  ): piqiu3d.Model | null {
    const idModel = new piqiu3d.Model();
    // 清空并重建映射
    this.partIndexToIdMap.clear();

    console.log("DEBUG Original model:", originalModel);
    console.log(
      "DEBUG Original model parts count:",
      originalModel ? originalModel.size : 0,
    );

    // 遍历原始模型的所有 Part
    let partIndex = 1;
    let successfulDrawables = 0;
    const getIdEffect = (index: number): any => {
      let cached = this.idEffectCache.get(index);
      if (cached) return cached;
      const idColor = this.getIdColor(index);
      const colorMaterial = new piqiu3d.ColorMaterial(idColor);
      cached = colorMaterial.init();
      this.idEffectCache.set(index, cached);
      return cached;
    };
    try {
      originalModel.forEach((node: piqiu3d.Part) => {
        console.log(
          "DEBUG Processing node:",
          node?.name,
          "instanceof Part:",
          node instanceof piqiu3d.Part,
          "visible:",
          node?.visible,
        );

        if (!(node instanceof piqiu3d.Part)) return;

        // 跳过不可见的 part
        if (!node.visible) {
          console.log("DEBUG Skipping invisible part:", node.name);
          return;
        }
        if (partFilter && !partFilter.has(node)) {
          return;
        }

        // 存储顺序索引到原始 ID 的映射
        const originalPartId = String(node.id);
        this.partIndexToIdMap.set(partIndex, originalPartId);
        console.log(
          "DEBUG Mapped partIndex",
          partIndex,
          "-> original ID:",
          originalPartId,
        );

        const idColor = this.getIdColor(partIndex);
        console.log("DEBUG Part", partIndex, "color:", {
          r: idColor.r,
          g: idColor.g,
          b: idColor.b,
          a: idColor.a,
        });

        // 复用纯色材质 effect
        const effect = getIdEffect(partIndex);

        // 获取原始 Part 的所有 drawables
        const drawables = node.drawables;
        console.log("DEBUG Part drawables count:", drawables?.length ?? 0);

        if (!drawables || drawables.length === 0) return;

        // 为这个 Part 创建一个新的 Part - 使用深拷贝 transform 避免修改原始模型
        const newPart = new piqiu3d.Part();
        newPart.name = node.name;

        // 深拷贝 transform 矩阵，避免修改原始模型
        if (node.transform && node.transform.matrix) {
          newPart.transform = node.transform;
        }

        // 复制 drawables 并替换 effect
        for (const d of drawables) {
          if (!d || !d.visible) {
            console.log("DEBUG Skipping invisible or null drawable");
            continue;
          }

          // 检查 geometry 和 effect 是否存在
          if (!d.geometry || !d.effect) {
            console.warn(
              "DEBUG Skipping drawable without geometry or effect:",
              {
                hasGeometry: !!d.geometry,
                hasEffect: !!d.effect,
              },
            );
            continue;
          }

          console.log(
            "DEBUG Processing drawable with geometry - type:",
            d.geometry?.constructor?.name ?? "unknown",
          );

          // 存储原始 effect

          // 创建新 Drawable，替换 effect
          // 注意：d.tbo 是 TransformBufferObject，需要深拷贝 transform 避免修改原始模型
          const clonedTransform = d.tbo.transform
            ? d.tbo.transform
            : new piqiu3d.Transform();
          const newDrawable = new piqiu3d.Drawable(clonedTransform);
          newDrawable.push(d.geometry);
          newDrawable.push(effect);
          newPart.addDrawable(newDrawable);
          successfulDrawables++;
        }

        idModel.add(newPart);
        partIndex++;
      });
    } catch (e) {
      console.error("DEBUG Error creating ID model:", e);
    }

    // 关键:调用 update(true) 标记结构已更改,让引擎重建渲染队列
    idModel.update(true);

    console.log(
      "DEBUG Created ID model with",
      partIndex - 1,
      "parts and",
      successfulDrawables,
      "drawables",
    );
    return idModel;
  }

  /**
   * 恢复原始 effect
   */
  /**
   * 存储 Part 的顺序索引到原始 ID 的映射
   * 用于在拾取时正确匹配
   */
  private partIndexToIdMap: Map<number, string> = new Map();

  /**
   * 存储高亮前的原始 effect，用于取消高亮
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private highlightedEffects: Map<any, any> = new Map();

  /**
   * 记录当前高亮的部件 ID
   */
  private currentHighlightedPartId: number | null = null;

  /**
   * 高亮选中的 Part - 保持所有部件可见，只将被选中的部件变红
   * 如果点击同一个部件，则取消高亮（恢复原始颜色）
   */
  private highlightPart(model: piqiu3d.Model, partId: number): void {
    console.log("Highlighting part with sequential ID:", partId);

    // 从映射中获取原始 ID
    const originalPartId = this.partIndexToIdMap.get(partId);
    console.log("Mapping to original part ID:", originalPartId);

    // 如果点击的是同一个部件，取消高亮
    if (this.currentHighlightedPartId === partId) {
      console.log("Same part clicked, clearing highlight");
      this.clearHighlight();
      this.currentHighlightedPartId = null;
      model.update(true);
      this.onRender();
      return;
    }

    // 先恢复之前高亮的部件效果
    this.clearHighlight();

    // 使用 getter 循环遍历 model 的所有 part
    const parts: piqiu3d.Part[] = [];
    model.forEach((node: any) => {
      if (node instanceof piqiu3d.Part) {
        parts.push(node);
      }
    });

    // 创建红色高亮材质
    const highlightColor = new piqiu3d.Color(1, 0, 0, 1); // 红色
    const highlightMaterial = new piqiu3d.ColorMaterial(highlightColor);
    const highlightEffect = highlightMaterial.init();

    // 遍历所有部件，将选中的部件变为红色，其他保持原状
    parts.forEach((part) => {
      const partOriginalId = String(part.id);
      const isSelected = partOriginalId === originalPartId;

      // 所有部件都保持可见
      part.visible = true;

      // 如果是被选中的部件，替换其 effect 为红色
      if (isSelected && part.drawables) {
        console.log(`Highlighting part "${part.name}" (id: ${partOriginalId})`);

        for (const d of part.drawables) {
          if (d && d.visible) {
            // 保存原始 effect 以便后续恢复
            this.highlightedEffects.set(d, d.effect);
            // 替换为红色高亮 effect
            d.effect = highlightEffect;
          }
        }
      }
    });

    // 记录当前高亮的部件 ID
    this.currentHighlightedPartId = partId;

    // 使用 true 参数标记结构已更改
    model.update(true);
    this.onRender();
  }

  /**
   * 清除高亮效果，恢复原始颜色
   */
  private clearHighlight(): void {
    this.highlightedEffects.forEach((effect, drawable) => {
      drawable.effect = effect;
    });
    this.highlightedEffects.clear();
  }

  /**
   * 标记缓存需要更新
   * 当模型变化时（如重新加载），调用此方法
   */
  markDirty(): void {
    this.fboDirty = true;
    this.cachedIdModel = null;
    this.pickModelAttached = false;
    this.rayDirty = true;
    console.log("DEBUG PartSelector marked as dirty");
  }

  /**
   * 释放资源
   */
  dispose(): void {
    if (this.rayBuildHandle !== null) {
      const cic = (window as any).cancelIdleCallback as
        | ((id: number) => void)
        | undefined;
      if (cic && (window as any).requestIdleCallback) {
        cic(this.rayBuildHandle);
      } else {
        clearTimeout(this.rayBuildHandle);
      }
      this.rayBuildHandle = null;
    }
    if (this.pendingPickHandle !== null) {
      cancelAnimationFrame(this.pendingPickHandle);
      this.pendingPickHandle = null;
    }
    this.pickPass = null;
    this.cachedIdModel = null;
    this.pickModelAttached = false;
    this.idEffectCache.clear();
    this.rayIntersector = null;
    this.rayDirty = true;
    this.rayBuildPending = false;
    this.highlightedEffects.clear();
    this.partIndexToIdMap.clear();
    this.initialized = false;
    this.fboDirty = true;
    this.cachedModelPartCount = 0;
    console.log("PartSelector disposed");
  }
}
