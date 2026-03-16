# FBO 颜色拾取问题分析与修复

## 问题现象

点击几何模型的部件时，拾取到的 FBO 颜色值全部为 `[0, 0, 0, 0]`，无法正确识别点击的部件。

## 问题根源分析

### 1. **Canvas 尺寸断配问题** ✅ 已修复

**问题**：使用了 CSS 像素尺寸 (clientWidth/clientHeight) 而不是 WebGL 实际渲染尺寸

- 鼠标坐标是基于 CSS 像素的
- 但 FBO 需要与 WebGL canvas 的内部像素尺寸一致 (gl.canvas.width/height)
- 这会导致 FBO 渲染的尺寸与实际读取的尺寸不匹配

**修复**：

```typescript
// 改为使用 GL 像素尺寸
this.canvasWidth = gl.canvas.width;
this.canvasHeight = gl.canvas.height;
```

### 2. **FBO Framebuffer 未绑定读取问题** ✅ 已修复

**问题**：`gl.readPixels()` 需要在正确的 framebuffer 被绑定的状态下执行

- 如果没有手动绑定 FBO 的 framebuffer，`readPixels()` 会读取主 canvas 的内容
- 主 canvas 此时显示的是正常渲染，而不是 ID 颜色渲染
- 结果就是读取到全黑 [0,0,0,0] 或其他不相关的颜色

**修复**：

```typescript
// 渲染之后立即绑定FBO的framebuffer
const fboData = (offscreenPass as any).fbo;
if (fboData && fboData.framebuffer) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fboData.framebuffer);
}

// 读取像素
gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

// 恢复默认framebuffer
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
```

### 3. **渲染完成不同步问题** ✅ 已修复

**问题**：`offscreenPass.render()` 后可能 GPU 命令尚未完全执行

- WebGL 是异步的，render()只是提交命令
- readPixels()可能在渲染完成前执行，导致读取到旧数据

**修复**：

```typescript
offscreenPass.render();
gl.flush(); // 确保GPU命令被提交
```

### 4. **ID 模型创建逻辑改进** ✅ 已改进

**问题**：可能存在的 drawable 跳过或 invisible part 未处理

- 某些 drawable 可能没有被正确复制
- 不可见的 part 也被处理了，但应该跳过

**改进**：

- 添加了对不可见 part 的检查和跳过
- 增加了更详细的日志记录
- 改进了 drawable 的 visible 检查

## 修复的关键代码更改

### PartSelector.ts 中的主要修改

1. **updateCanvasSize()** 方法
   - 从 CSS 像素改为 GL 像素尺寸
2. **renderAndPick()** 方法

   - 添加了 FBO framebuffer 的显式绑定
   - 添加了`gl.flush()`确保同步
   - 添加了更完善的边界检查
   - 添加了 FBO.fbo.bind()备选方案
   - 增加了诊断日志

3. **initFBO()** 方法
   - 添加了初始化诊断日志
4. **createIdModelWithEffect()** 方法

   - 添加了不可见 part 跳过逻辑
   - 添加了更详细的 drawable 处理日志
   - 改进了效果应用的诊断

5. **handleClick()** 方法
   - 添加了完整的诊断输出

## 调试步骤

1. **查看控制台输出**

   - 打开浏览器 DevTools (F12)
   - 查看 Console 标签
   - 寻找以下关键日志：
     - `DEBUG Original model parts count: X` - 应该 > 0
     - `DEBUG Part drawables count: X` - 应该 > 0
     - `FBO framebuffer bound for pixel reading` - 应该出现
     - `WebGL error during readPixels` - 若出现说明有错误

2. **验证 Pick 结果**

   - 寻找 `DEBUG Pick result` 日志
   - 检查 color 数组是否不全为 0
   - 检查 partId 是否 > 0

3. **如果仍然无法拾取**
   - 确保点击的位置在 canvas 内
   - 确保模型至少有一个可见的 part 和 drawable
   - 查看是否有 WebGL 错误

## selector-ext 参考实现要点

piqiu3d 中的 selector-ext 的关键做法：

1. **使用 ColorMaterial 进行 ID 渲染** ✅ 已实现
   - 为每个 part 分配唯一的 ID 颜色
   - 利用 ColorUtil.id2Color()生成颜色
2. **在离屏缓冲区渲染** ✅ 已实现

   - 使用 OffScreenPass 而不是直接渲染
   - 避免主场景被污染

3. **显式管理 framebuffer 绑定** ✅ 已修复

   - 确保 readPixels 读的是正确的 framebuffer

4. **正确处理坐标转换** ✅ 已实现
   - CSS 坐标 → GL 坐标（Y 轴翻转）
   - 鼠标坐标 → 像素坐标（DPR 缩放）

## 预期结果

修复后，当点击几何模型的部件时：

1. 应该看到 `DEBUG Pick result` 中的 color 不再是全 0
2. partId 应该显示正确的 ID（> 0）
3. 被点击的部件应该被高亮显示

## 如果仍未解决

如果修复后仍然无法正确拾取，请检查：

1. **OffScreenPass 的实际实现**

   - 某些版本的 piqiu3d 可能有不同的 API
   - 尝试调用 `(offscreenPass as any).fbo.read()` 来获取 FBO 数据

2. **ColorMaterial 的兼容性**

   - 确认 ColorMaterial 是否正确初始化 effect
   - 尝试使用其他着色器替代

3. **模型数据结构**

   - 确认 model 中的 Part 和 drawables 是否正确加载
   - 检查 geometry 和 effect 是否有效

4. **坐标系问题**
   - 验证 Y 轴翻转是否正确
   - 检查 DPR 缩放是否正确应用

## 性能考虑

当前实现在每次点击时：

- 创建新的 IDModel
- 创建新的 ColorMaterial 和 effect
- 渲染到 offscreen pass

这在性能上可以进一步优化：

1. 缓存 ID Model
2. 复用 ColorMaterial 实例
3. 使用指定的拾取渲染模式

## 参考链接

- piqiu3d ColorUtil API: 用于 ID 颜色的转换
- WebGL readPixels 文档: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/readPixels
- OffScreenPass API: piqiu3d 文档
