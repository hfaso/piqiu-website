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

  // FBO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pickFBO: any = null;

  // 画布尺寸
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  // 是否已初始化
  private initialized: boolean = false;

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

    // 如果 FBO 已创建,更新其尺寸
    if (this.pickFBO) {
      (this.pickFBO as any).size = [this.canvasWidth, this.canvasHeight];
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

    // 使用 OffScreenPass
    this.pickFBO = new piqiu3d.OffScreenPass({
      color: [0, 0, 0, 0],
      depth: 1.0,
    });

    // 设置 FBO 尺寸与 canvas 一致
    (this.pickFBO as any).size = [this.canvasWidth, this.canvasHeight];

    console.log("DEBUG OffScreenPass created:", {
      hasSize: !!(this.pickFBO as any).size,
      sizeValue: (this.pickFBO as any).size,
      hasFbo: !!(this.pickFBO as any).fbo,
    });

    this.initialized = true;
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
      fboReady: !!this.pickFBO,
    });

    // 渲染到 FBO 并读取结果（使用转换后的GL坐标）
    this.renderAndPick(gl, model, camera, vec2.fromValues(glX, glY));
  }

  /**
   * 渲染并拾取
   */
  private renderAndPick(
    gl: WebGL2RenderingContext,
    model: piqiu3d.Model,
    camera: piqiu3d.Camera,
    pos: vec2,
  ): void {
    const offscreenPass = this.pickFBO as piqiu3d.OffScreenPass;
    if (!offscreenPass) return;

    // 设置相机
    offscreenPass.camera.builtInUniforms = camera.builtInUniforms;

    // 克隆原始模型并修改 effect
    const idModel = this.createIdModelWithEffect(model);
    if (!idModel) {
      console.error("Failed to create ID model");
      return;
    }

    // 添加到 offscreen pass - 使用正确的 API 访问 model
    offscreenPass.model.clear();
    offscreenPass.model.add(idModel);
    offscreenPass.model.update();

    console.log("DEBUG Before render - FBO state:", {
      enabled: offscreenPass.enabled,
      modelSize: offscreenPass.model.size,
      hasFbo: !!(offscreenPass as any).fbo,
    });

    // 启用并渲染
    offscreenPass.enabled = true;
    try {
      offscreenPass.render();
      console.log("DEBUG Render completed");
    } catch (e) {
      console.error("Render error:", e);
      offscreenPass.enabled = false;
      return;
    }

    // 确保渲染完成
    gl.flush();

    // 关键: 读取像素前，确保 FBO 的 framebuffer 被绑定
    const fboData = (offscreenPass as any).fbo;
    if (fboData && fboData.framebuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboData.framebuffer);
      console.log("DEBUG FBO framebuffer bound for pixel reading");
    } else if (fboData && typeof fboData.bind === "function") {
      fboData.bind();
      console.log("DEBUG FBO bind() called");
    } else {
      console.warn("DEBUG FBO framebuffer not found");
    }

    // 读取像素坐标转换
    // pos 已经是GL坐标系(原点左上角)，需要转换为WebGL坐标系(原点左下角)
    const x = Math.floor(pos[0]);
    const y = Math.floor(this.canvasHeight - pos[1]);

    console.log("DEBUG Pixel reading parameters:", {
      glPos: [pos[0], pos[1]],
      readPixelsCoords: [x, y],
      canvasSize: [this.canvasWidth, this.canvasHeight],
      inBounds: !(
        x < 0 ||
        x >= this.canvasWidth ||
        y < 0 ||
        y >= this.canvasHeight
      ),
    });

    // 边界检查
    if (x < 0 || x >= this.canvasWidth || y < 0 || y >= this.canvasHeight) {
      console.warn("ERROR: Click position outside canvas bounds!", {
        x,
        y,
        canvasWidth: this.canvasWidth,
        canvasHeight: this.canvasHeight,
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      offscreenPass.enabled = false;
      this.restoreOriginalEffects();
      return;
    }

    const pixel = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    // If possible, also read full FBO buffer via its read() API and sample the same pixel for cross-check
    try {
      if (fboData && typeof fboData.read === "function") {
        const fboRead = fboData.read();
        if (fboRead && fboRead.data) {
          const fW = fboRead.width;
          const fH = fboRead.height;
          const fData = fboRead.data as Uint8Array;

          // Two possible row orders: bottom-left origin or top-left origin — sample both
          const idxBottom = (y * fW + x) * 4; // assuming bottom-left origin
          const idxTop = ((fH - 1 - y) * fW + x) * 4; // assuming top-left origin

          const sampleBottom = fData.slice(idxBottom, idxBottom + 4);
          const sampleTop = fData.slice(idxTop, idxTop + 4);

          const sb = Array.from(sampleBottom);
          const st = Array.from(sampleTop);

          const idFromGLRead = this.parseIdFromColor(pixel);
          const idFromFboBottom = this.parseIdFromColor(sampleBottom);
          const idFromFboTop = this.parseIdFromColor(sampleTop);

          console.log(
            "FBO read() sample (bottom-origin):",
            sb,
            "parsedId:",
            idFromFboBottom,
          );
          console.log(
            "FBO read() sample (top-origin):",
            st,
            "parsedId:",
            idFromFboTop,
          );
          console.log(
            "gl.readPixels sample:",
            Array.from(pixel),
            "parsedId:",
            idFromGLRead,
          );
        }
      }
    } catch (err) {
      console.warn("FBO read compare failed:", err);
    }

    // 检查 WebGL 错误
    const glError = gl.getError();
    if (glError !== gl.NO_ERROR) {
      console.error("WebGL error during readPixels:", glError);
    }

    // 恢复原始 framebuffer 绑定
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // 恢复原始效果
    this.restoreOriginalEffects();

    // 禁用
    offscreenPass.enabled = false;

    // 解析 ID
    const partId = this.parseIdFromColor(pixel);

    // 详细输出
    console.log("████ PICK RESULT ████", {
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
      console.log("✓ Successfully selected part:", partId);
      this.highlightPart(model, partId);
    } else {
      console.warn("✗ Invalid part ID or background clicked");
    }
  }

  /**
   * 快照：渲染当前 ID/FBO 内容并下载为 PNG
   * 用于调试 FBO 内容（在中键点击时调用）
   */
  snapshot(): void {
    const gl = this.renderContext.gl;
    if (!gl) {
      console.error("WebGL context not available for snapshot");
      return;
    }

    if (!this.pickFBO) {
      this.initFBO();
    }

    const offscreenPass = this.pickFBO as piqiu3d.OffScreenPass;
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

      const w = this.canvasWidth;
      const h = this.canvasHeight;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private originalEffects: Map<any, any> = new Map();

  /**
   * 创建 ID 模型 - 通过修改原始模型的 effect
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createIdModelWithEffect(originalModel: any): piqiu3d.Model | null {
    const idModel = new piqiu3d.Model();
    this.originalEffects.clear();

    console.log("DEBUG Original model:", originalModel);
    console.log(
      "DEBUG Original model parts count:",
      originalModel ? originalModel.size : 0,
    );

    // 遍历原始模型的所有 Part
    let partIndex = 1;
    let successfulDrawables = 0;
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

        const idColor = this.getIdColor(partIndex);
        console.log("DEBUG Part", partIndex, "color:", {
          r: idColor.r,
          g: idColor.g,
          b: idColor.b,
          a: idColor.a,
        });

        // 创建纯色材质
        const colorMaterial = new piqiu3d.ColorMaterial(idColor);
        const effect = colorMaterial.init();

        // 获取原始 Part 的所有 drawables
        const drawables = node.drawables;
        console.log("DEBUG Part drawables count:", drawables?.length ?? 0);

        if (!drawables || drawables.length === 0) return;

        // 为这个 Part 创建一个新的 Part
        const newPart = new piqiu3d.Part();
        newPart.name = node.name;
        newPart.transform = node.transform;

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
          if (d.effect) {
            this.originalEffects.set(d, d.effect);
          }

          // 创建新 Drawable，替换 effect
          // 注意：d.tbo 是 TransformBufferObject，需要使用 d.tbo.transform (Transform 对象)
          const newDrawable = new piqiu3d.Drawable(d.tbo.transform);
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
  private restoreOriginalEffects(): void {
    this.originalEffects.forEach((effect, drawable) => {
      drawable.effect = effect;
    });
    this.originalEffects.clear();
  }

  /**
   * 高亮选中的 Part
   */
  private highlightPart(model: piqiu3d.Model, partId: number): void {
    console.log("Highlighting part with ID:", partId);

    // 简单高亮策略：只显示被选中的 Part，隐藏其它 Part
    // 使用 getter 循环遍历 model 的所有 part
    const parts: piqiu3d.Part[] = [];
    model.forEach((node: any) => {
      if (node instanceof piqiu3d.Part) {
        parts.push(node);
      }
    });

    parts.forEach((part) => {
      part.visible = Number(part.id) === partId;
    });

    model.update();
    this.onRender();
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.pickFBO = null;
    this.originalEffects.clear();
    this.initialized = false;
    console.log("PartSelector disposed");
  }
}
