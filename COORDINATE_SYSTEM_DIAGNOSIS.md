# FBO 坐标系诊断指南

## 问题现象

点击几何模型时拾取到全黑色 `[0, 0, 0, 0]`，无法识别部件。

## 根本原因

**Canvas 有两个尺寸概念，坐标系转换不正确**：

1. **CSS 显示尺寸** (DevTools 显示的)

   - `canvas.clientWidth`: 998px
   - `canvas.clientHeight`: 477px

2. **WebGL 缓冲区尺寸** (实际渲染的)
   - `canvas.width`: 可能是 1996px (如果 DPR=2)
   - `canvas.height`: 可能是 954px (如果 DPR=2)

## 诊断步骤

### 1. 启动开发服务器并打开 Chrome DevTools

```bash
yarn dev
```

### 2. 打开浏览器的 Console（F12）

### 3. 加载模型并点击任意部件

在 Console 中查看输出的诊断信息，应该看到类似：

```
==== COORDINATE SYSTEM DIAGNOSIS ====
Canvas CSS size (visible): [998, 477]
Canvas GL size (buffer): [1996, 954]
Scale factor (GL/CSS): [2, 2]
=====================================
```

### 4. 记录以下信息

点击部件时，记录：

```
DEBUG PartSelector coordinate conversion: {
  inputPos: [x1, y1],                    // MouseHandler发来的坐标
  cssSize: [998, 477],                   // CSS大小
  glSize: [1996, 954],                   // GL缓冲区大小
  scale: [2, 2],                         // 缩放因子
  convertedGlPos: [x2, y2],              // 转换后的GL坐标
  modelSize: 5,
  fboReady: true
}
```

和

```
████ PICK RESULT ████ {
  glCoords: [x2, y2],
  readPixelsCoords: [x3, y3],
  pixelColor: { r: ?, g: ?, b: ?, a: ? },
  partId: ?,
  isValid: ?
}
```

## 如果拾取仍不成功

### 情况 A：pixelColor 全为 0

可能原因：

1. FBO 的 framebuffer 没有正确绑定
2. ID 模型没有正确渲染
3. 颜色材质没有应用

**排查步骤**：

- 查看是否有 `FBO framebuffer bound for pixel reading` 日志
- 查看是否有 `Render completed` 日志
- 查看 `DEBUG Original model parts count` 是否 > 0

### 情况 B：坐标超出范围

日志中显示 `outOfBounds: true` 或 `x < 0 || y < 0`

**原因**：坐标系转换不正确

**修复**：
编辑 [PartSelector.ts](#L163) 中的坐标转换逻辑：

```typescript
const glX = (pos[0] / cssWidth) * this.canvasWidth;
const glY = (pos[1] / cssHeight) * this.canvasHeight;
```

如果这个转换后坐标超出范围，表示 pos 自身就有问题。

### 情况 C：坐标在范围内，但颜色仍为 0

可能是 OffScreenPass 本身的问题。尝试替代实现：

在 [PartSelector.ts](#)中添加：

```typescript
// 替代方案：直接读取OffScreenPass的纹理
private readOffscreenTexture(pos: vec2): Uint8Array {
  const fboData = (this.pickFBO as any).fbo;
  // fboData可能有 colorTexture、data等属性
  // 根据piqiu3d的实现获取纹理数据
}
```

## 完整的诊断信息

### MouseHandler 中的坐标

[handler/MouseHandler.ts](handler/MouseHandler.ts)中：

```typescript
const pos = vec2.fromValues(
  event.offsetX * this.dpr, // CSS像素 × DPR
  event.offsetY * this.dpr,
);
```

- `event.offsetX`: CSS 坐标 (0-998)
- `this.dpr`: 设备像素比 (1, 1.5, 2, ...)
- 结果: GL 坐标 (0-998\*dpr)

### PartSelector 中的处理

[simulation/PartSelector.ts](simulation/PartSelector.ts)中：

1. 接收来自 MouseHandler 的 `pos`（可能是 GL 坐标）
2. 验证并转换为标准 GL 坐标：
   ```
   glX = (pos[0] / cssWidth) * this.canvasWidth
   glY = (pos[1] / cssHeight) * this.canvasHeight
   ```
3. 通过 FBO 渲染 ID 颜色
4. 使用 `readPixels` 读取转换后的 GL 坐标处的像素

## 预期的正确日志序列

```
==== COORDINATE SYSTEM DIAGNOSIS ====
Canvas CSS size (visible): [998, 477]
Canvas GL size (buffer): [1996, 954]
Scale factor (GL/CSS): [2, 2]
=====================================

DEBUG PartSelector coordinate conversion: {
  inputPos: [500, 200],          // 点击位置（CSS坐标×DPR）
  cssSize: [998, 477],
  glSize: [1996, 954],
  scale: [2, 2],
  convertedGlPos: [1000, 400],   // 转换后的GL坐标
  modelSize: 5,
  fboReady: true
}

DEBUG Before render - FBO state: {...}
DEBUG Render completed
DEBUG FBO framebuffer bound for pixel reading

DEBUG Pixel reading parameters: {
  glPos: [1000, 400],
  readPixelsCoords: [1000, 554],  // Y翻转：954-400=554
  canvasSize: [1996, 954],
  inBounds: true
}

████ PICK RESULT ████ {
  glCoords: [1000, 400],
  readPixelsCoords: [1000, 554],
  pixelColor: { r: 255, g: 0, b: 0, a: 255 },  // 非零颜色！
  partId: 1,  // 有效的ID
  isValid: true
}

✓ Successfully selected part: 1
```

## 常见问题

### Q1: 为什么要转换坐标？

鼠标事件使用 CSS 坐标系，但 GPU 渲染使用 GL 缓冲区像素坐标系。在高 DPR 屏幕上，这两者不同。

### Q2: Y 轴为什么要翻转？

CSS 坐标系原点在左上角（Y 向下），WebGL 坐标系原点在左下角（Y 向上）。
转换公式：`glY = canvasHeight - cssY`

### Q3: 如果 Scale factor 不是[2, 2]怎么办？

这很正常。Scale factor 取决于：

- 屏幕 DPI
- 浏览器缩放
- 具体的设备

坐标转换公式 `(cssCoord / cssSize) * glSize` 对所有情况都适用。

## 下一步

1. 收集诊断信息
2. 根据 pixelColor 是否为 0 选择排查方向
3. 如果仍未解决，检查 piqiu3d 的 OffScreenPass 实现
4. 考虑使用 HoverPassInstance 替代（如 MouseHandler 中的实现）
