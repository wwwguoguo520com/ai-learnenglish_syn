## 项目上下文摘要（标注取消流程）
生成时间：2025-10-07

### 1. 相似实现分析

**实现1: handleColorSelection** (script.js:2396-2416)
- 模式：状态切换模式
- 核心逻辑：点击相同颜色 → 取消选择（state.lastColor = null）
- 可复用：状态切换的判断逻辑
- 需注意：目前仅取消状态，不删除已有标注

**实现2: handleBorderStyleSelection** (script.js:2422-2439)
- 模式：类名切换模式（classList.contains('active')）
- 核心逻辑：检查active状态 → 切换
- 可复用：active状态检测逻辑
- 需注意：同样只是状态切换

**实现3: deleteAnnotation** (script.js:4079-4150)
- 模式：级联删除 + 撤销支持
- 核心逻辑：删除主标注 + 所有子标注，支持撤销
- 可复用：完整的删除逻辑和撤销机制
- 需注意：需要准备完整的undoData

### 2. 项目约定

**命名约定**：
- 函数：驼峰命名，handle前缀表示事件处理（handleColorSelection）
- 状态变量：state.lastXxx 表示最后选择的配置
- DOM元素：dom.xxxBtn, dom.xxxToggle

**文件组织**：
- script.js：单文件包含所有逻辑（8500+行）
- 标注相关函数集中在中部区域（2000-4500行）

**代码风格**：
- 使用console.log调试信息，格式：`[DEBUG] 🔧 描述`
- 缩进：4空格
- 括号：K&R风格

### 3. 可复用组件清单

**选择相关**：
- `window.getSelection()` - 获取用户选择
- `selection.getRangeAt(0)` - 获取选择范围

**DOM查询**：
- `dom.readingArea.querySelectorAll('.highlight[data-id="xxx"]')` - 查找标注元素
- `element.dataset.id` - 获取标注ID

**状态管理**：
- `state.annotations` - 标注记录数组
- `state.lastColor`, `state.lastBold` 等 - 工具栏状态
- `persistState()` - 持久化状态

**删除相关**：
- `deleteAnnotation(id)` - 完整删除逻辑
- `saveHistory('delete', undoData)` - 保存撤销信息

### 4. 测试策略

**测试框架**：无自动化测试框架（手动测试）
**测试模式**：功能测试 + 边界条件测试
**覆盖要求**：
- 正常流程：选中文字 → 标注 → 选中标注 → 取消
- 边界条件：跨标注选择、部分选择、嵌套标注
- 错误处理：无选择时的操作、无标注时的操作

### 5. 依赖和集成点

**外部依赖**：无（纯原生JavaScript）
**内部依赖**：
- `state` 对象 - 全局状态管理
- `dom` 对象 - DOM元素引用
- `getActiveDocument()` - 获取当前活动文档

**集成方式**：直接函数调用
**配置来源**：localStorage持久化

### 6. 技术选型理由

**为什么用原生JavaScript**：
- 无需构建工具，简单直接
- 浏览器兼容性好
- 项目规模适中

**优势**：
- 轻量级，加载快
- 易于调试和维护

**劣势和风险**：
- 单文件过大（8500+行），可能需要模块化
- 缺少类型检查，容易出错

### 7. 关键风险点

**并发问题**：
- 快速连续点击可能导致状态不一致
- 需要防抖或状态锁定机制

**边界条件**：
- 跨标注选择：用户选中多个标注
- 部分选择：只选中标注的一部分
- 嵌套标注：标注内部再次标注

**性能瓶颈**：
- querySelectorAll('.highlight') 在大量标注时可能慢
- 需要考虑性能优化

**用户体验**：
- 误删除风险：需要撤销功能
- 视觉反馈：选中标注时的视觉提示
