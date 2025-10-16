# 阅读标注工具 - 工具栏功能完整文档

## 目录

1. [功能概览](#功能概览)
2. [文本样式格式化](#文本样式格式化)
3. [边框样式系统](#边框样式系统)
4. [颜色系统](#颜色系统)
5. [类别管理系统](#类别管理系统)
6. [悬停菜单系统](#悬停菜单系统)
7. [笔记编辑器](#笔记编辑器)
8. [状态管理与持久化](#状态管理与持久化)
9. [交互反馈系统](#交互反馈系统)
10. [使用流程](#使用流程)
11. [技术实现细节](#技术实现细节)

---

## 功能概览

本工具是一个强大的英语阅读标注系统，支持文本高亮、样式自定义、分类管理、笔记添加等功能。所有设置自动保存，支持多层嵌套标注。

**核心特性：**
- 6种基础文本样式（粗体、下划线、虚线下划线、斜杠、文本颜色、边框）
- 21种预设颜色（7种基础色 × 3种色调）
- 自定义类别管理（支持无样式纯分类模式）
- 智能边框尺寸（基于文本长度和嵌套层级）
- 悬停快捷菜单（复制、编辑、删除）
- 优雅的 Toast 通知系统

---

## 文本样式格式化

### 1. 粗体样式 (B)

**功能描述：**
- 为选中文本添加粗体效果
- 支持自定义粗体颜色

**使用方法：**
1. 点击 **B** 按钮切换粗体状态
2. 点击 **B** 旁的 🎨 按钮选择粗体颜色
3. 选中文本后应用格式

**代码位置：**
- `script.js:7115-7123` - 粗体切换逻辑
- `script.js:2692-2694` - 应用粗体样式
- `styles.css:2467-2474` - 粗体 CSS 样式

**状态变量：**
```javascript
state.lastBold: boolean          // 粗体开关状态
state.lastBoldColor: string      // 粗体颜色 (如 '#ef4444')
```

---

### 2. 下划线样式 (U)

**功能描述：**
- 为选中文本添加下划线
- 支持自定义下划线颜色

**使用方法：**
1. 点击 **U** 按钮切换下划线状态
2. 点击 **U** 旁的 🎨 按钮选择下划线颜色
3. 选中文本后应用格式

**代码位置：**
- `script.js:7125-7133` - 下划线切换逻辑
- `script.js:2696-2698` - 应用下划线样式
- `styles.css:2477-2485` - 下划线 CSS 样式

**状态变量：**
```javascript
state.lastUnderline: boolean     // 下划线开关状态
state.lastUnderlineColor: string // 下划线颜色
```

---

### 3. 虚线下划线 (- -)

**功能描述：**
- 添加虚线样式的下划线
- 2px 粗细，3px 下偏移

**使用方法：**
1. 点击 **- -** 按钮切换虚线下划线状态
2. 选中文本后应用格式

**代码位置：**
- `script.js:7135-7144` - 虚线下划线切换逻辑
- `script.js:2700-2702` - 应用虚线样式
- `styles.css:3215-3219` - 虚线 CSS 样式

**CSS 实现：**
```css
.highlight[data-dashed="true"] {
    text-decoration: underline dashed;
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
}
```

**状态变量：**
```javascript
state.lastDashed: boolean        // 虚线下划线开关状态
```

---

### 4. 斜杠分隔符 (/ /)

**功能描述：**
- 在标注文本后添加 " / " 分隔符
- 分隔符颜色为灰色 (#999)

**使用方法：**
1. 点击 **/ /** 按钮切换斜杠状态
2. 选中文本后应用格式

**代码位置：**
- `script.js:7146-7155` - 斜杠切换逻辑
- `script.js:2704-2706` - 应用斜杠样式
- `styles.css:3222-3227` - 斜杠 CSS 样式

**CSS 实现：**
```css
.highlight[data-slash="true"]::after {
    content: ' / ';
    color: #999;
    margin: 0 2px;
}
```

**状态变量：**
```javascript
state.lastSlash: boolean         // 斜杠分隔符开关状态
```

---

### 5. 文本颜色 (🎨)

**功能描述：**
- 修改标注文本的颜色
- 从21种预设颜色中选择

**使用方法：**
1. 点击文本颜色 🎨 按钮
2. 从颜色面板中选择颜色
3. 选中文本后应用格式

**代码位置：**
- `script.js:7157-7165` - 文本颜色按钮逻辑
- `script.js:6979-7084` - 颜色选择器逻辑
- `script.js:2708-2710` - 应用文本颜色

**状态变量：**
```javascript
state.lastCustomTextColor: string // 文本颜色 (如 '#3b82f6')
```

---

## 边框样式系统

### 1. 边框类型

**方框边框 (□)：**
- 标准矩形边框
- 支持自定义边框颜色
- 动态边框宽度

**圆角边框 (○)：**
- 圆角矩形边框
- 8px 圆角半径
- 支持自定义边框颜色
- 动态边框宽度

**代码位置：**
- `script.js:7167-7184` - 边框切换逻辑
- `styles.css:2520-2537` - 边框 CSS 样式

---

### 2. 动态边框尺寸

**功能描述：**
根据标注文本长度自动调整边框宽度和内边距，防止视觉混乱。

**尺寸规则：**

| 文本长度 | 边框宽度 | 垂直内边距 | 水平内边距（方框） | 水平内边距（圆角） |
|---------|---------|-----------|------------------|------------------|
| 1-5字符  | 1px     | 2px       | 3px              | 4px              |
| 6-15字符 | 1.5px   | 3px       | 4px              | 5px              |
| 16-30字符| 2px     | 3px       | 5px              | 6px              |
| 31+字符  | 2.5px   | 4px       | 6px              | 7px              |

**代码实现：**
```javascript
// script.js:2481-2530
const textLength = record.text.length;
let borderWidth, paddingY, paddingX;

if (textLength <= 5) {
    borderWidth = '1px';
    paddingY = 2;
    paddingX = record.borderStyle === 'round' ? 4 : 3;
} else if (textLength <= 15) {
    borderWidth = '1.5px';
    paddingY = 3;
    paddingX = record.borderStyle === 'round' ? 5 : 4;
} else if (textLength <= 30) {
    borderWidth = '2px';
    paddingY = 3;
    paddingX = record.borderStyle === 'round' ? 6 : 5;
} else {
    borderWidth = '2.5px';
    paddingY = 4;
    paddingX = record.borderStyle === 'round' ? 7 : 6;
}
```

---

### 3. 嵌套边框处理

**功能描述：**
当多个标注重叠时，自动增加内层标注的内边距，防止边框重叠。

**处理规则：**
- 每增加一层嵌套：
  - 垂直内边距 +3px
  - 水平内边距 +2px

**代码实现：**
```javascript
// script.js:2520-2524
const nestLevel = getNestingLevel(highlight);
if (nestLevel > 0) {
    paddingY += nestLevel * 3;
    paddingX += nestLevel * 2;
}
```

**嵌套层级检测：**
```javascript
// script.js:2449-2464
function getNestingLevel(element) {
    let level = 0;
    let parent = element.parentElement;
    while (parent && parent !== dom.readingContent) {
        if (parent.classList.contains('highlight')) {
            level++;
        }
        parent = parent.parentElement;
    }
    return level;
}
```

**CSS 变量应用：**
```css
/* styles.css:2520-2537 */
.highlight[data-border="square"] {
    border: var(--border-width, 2px) solid currentColor;
    padding: var(--border-padding-y, 3px) var(--border-padding-x, 5px);
    border-radius: 0;
}

.highlight[data-border="round"] {
    border: var(--border-width, 2px) solid currentColor;
    padding: var(--border-padding-y, 3px) var(--border-padding-x, 6px);
    border-radius: 8px;
}
```

---

## 颜色系统

### 1. 预设颜色板

**颜色构成：**
- 7种基础颜色：红、橙、黄、绿、蓝、紫、灰
- 每种颜色3个色调：浅色(Light)、中等(Medium)、深色(Dark)
- 总计：7 × 3 = 21种颜色

**颜色定义：**
```javascript
// script.js:6878-6915
const PRESET_COLORS = {
    red: {
        light: '#fca5a5',
        medium: '#ef4444',
        dark: '#991b1b'
    },
    orange: {
        light: '#fdba74',
        medium: '#f97316',
        dark: '#9a3412'
    },
    yellow: {
        light: '#fde047',
        medium: '#eab308',
        dark: '#854d0e'
    },
    green: {
        light: '#86efac',
        medium: '#22c55e',
        dark: '#166534'
    },
    blue: {
        light: '#93c5fd',
        medium: '#3b82f6',
        dark: '#1e3a8a'
    },
    purple: {
        light: '#c4b5fd',
        medium: '#8b5cf6',
        dark: '#5b21b6'
    },
    gray: {
        light: '#d1d5db',
        medium: '#6b7280',
        dark: '#1f2937'
    }
};
```

---

### 2. 颜色应用范围

**支持自定义颜色的元素：**
1. **文本颜色** - 标注文本的颜色
2. **粗体颜色** - 粗体文本的颜色
3. **下划线颜色** - 下划线的颜色
4. **边框颜色** - 方框/圆角边框的颜色

**每个元素独立管理颜色：**
```javascript
state.lastCustomTextColor: string  // 文本颜色
state.lastBoldColor: string        // 粗体颜色
state.lastUnderlineColor: string   // 下划线颜色
state.lastBorderColor: string      // 边框颜色
```

---

### 3. 颜色选择器界面

**UI 结构：**
```html
<!-- reader.html:407-414 -->
<div id="colorPickerPanel" class="color-picker-panel hidden">
    <div class="color-picker-content">
        <div class="color-grid" id="colorGrid">
            <!-- 21个颜色选项 -->
        </div>
    </div>
</div>
```

**样式设计：**
```css
/* styles.css:3188-3246 */
.color-picker-panel {
    position: fixed;
    z-index: 10002;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    padding: 12px;
}

.color-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
}

.color-option {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
}

.color-option:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.color-option.selected::after {
    content: '✓';
    color: #fff;
    font-weight: bold;
    font-size: 18px;
}
```

---

### 4. 颜色选择逻辑

**打开颜色选择器：**
```javascript
// script.js:6979-7015
function showColorPicker(event, target) {
    currentColorTarget = target;
    const btn = event.target;

    // 渲染颜色网格
    renderColorGrid();

    // 显示面板
    dom.colorPickerPanel.classList.remove('hidden');

    // 智能定位
    const rect = btn.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 5;

    // 边界检测
    const panelRect = dom.colorPickerPanel.getBoundingClientRect();
    if (left + panelRect.width > window.innerWidth) {
        left = window.innerWidth - panelRect.width - 10;
    }
    if (top + panelRect.height > window.innerHeight) {
        top = rect.top - panelRect.height - 5;
    }

    dom.colorPickerPanel.style.left = `${left}px`;
    dom.colorPickerPanel.style.top = `${top}px`;
}
```

**选择颜色：**
```javascript
// script.js:7039-7065
function selectColor(color) {
    switch (currentColorTarget) {
        case 'text':
            state.lastCustomTextColor = color;
            break;
        case 'bold':
            state.lastBoldColor = color;
            dom.boldColorBtn.style.backgroundColor = color;
            break;
        case 'underline':
            state.lastUnderlineColor = color;
            dom.underlineColorBtn.style.backgroundColor = color;
            break;
        case 'border':
            state.lastBorderColor = color;
            dom.borderColorBtn.style.backgroundColor = color;
            break;
    }

    saveState();
    hideColorPicker();
}
```

**点击外部关闭：**
```javascript
// script.js:7067-7084
document.addEventListener('click', (e) => {
    if (!dom.colorPickerPanel.classList.contains('hidden')) {
        if (!dom.colorPickerPanel.contains(e.target) &&
            !e.target.classList.contains('color-select-btn')) {
            hideColorPicker();
        }
    }
});
```

---

## 类别管理系统

### 1. 默认类别

**6个预设类别：**
```javascript
// script.js:64-70
customCategories: [
    { id: 'vocab', label: '生词', applyStyle: true },
    { id: 'phrase', label: '词组', applyStyle: true },
    { id: 'sentence', label: '句子', applyStyle: true },
    { id: 'grammar', label: '语法', applyStyle: true },
    { id: 'culture', label: '文化', applyStyle: true },
    { id: 'important', label: '重点', applyStyle: true }
]
```

**类别属性：**
- `id`: 唯一标识符
- `label`: 显示名称
- `applyStyle`: 是否应用样式（布尔值）

---

### 2. 类别管理界面

**打开方式：**
点击工具栏的 ⚙️ 按钮

**功能菜单：**
```html
<!-- reader.html:417-428 -->
<div id="categoryManageModal" class="modal hidden">
    <div class="modal-content">
        <h3>📂 管理标注类别</h3>
        <div id="categoryList">
            <!-- 动态生成类别列表 -->
        </div>
        <button id="addCategoryBtn">➕ 添加类别</button>
        <button id="closeCategoryManageBtn">关闭</button>
    </div>
</div>
```

**类别项结构：**
```html
<div class="category-item">
    <input type="text" value="生词" />
    <label>
        <input type="checkbox" checked />
        应用样式
    </label>
    <button class="delete-btn">🗑️</button>
</div>
```

---

### 3. CRUD 操作

**添加类别：**
```javascript
// script.js:6612-6628
dom.addCategoryBtn.addEventListener('click', () => {
    const newId = `custom_${Date.now()}`;
    const newCategory = {
        id: newId,
        label: '新类别',
        applyStyle: true
    };
    state.customCategories.push(newCategory);
    saveState();
    renderCategoryList();
    renderCategoryButtons();
});
```

**编辑类别：**
```javascript
// script.js:6564-6577
labelInput.addEventListener('change', (e) => {
    const newLabel = e.target.value.trim();
    if (newLabel) {
        category.label = newLabel;
        saveState();
        renderCategoryButtons();
    } else {
        e.target.value = category.label;
    }
});
```

**删除类别：**
```javascript
// script.js:6583-6592
deleteBtn.addEventListener('click', () => {
    if (confirm(`确定删除类别"${category.label}"吗？`)) {
        const index = state.customCategories.indexOf(category);
        if (index > -1) {
            state.customCategories.splice(index, 1);
            saveState();
            renderCategoryList();
            renderCategoryButtons();
        }
    }
});
```

**切换样式开关：**
```javascript
// script.js:6572-6581
applyStyleCheckbox.addEventListener('change', (e) => {
    category.applyStyle = e.target.checked;
    saveState();
    renderCategoryButtons();
});
```

---

### 4. 样式应用逻辑

**当 applyStyle = true：**
- 应用所有选中的格式样式（粗体、下划线、边框、颜色等）
- 类别按钮正常显示

**当 applyStyle = false：**
- 仅记录类别信息，不改变文本样式
- 类别按钮显示为斜体，透明度 0.7
- 用于纯分类标注（如标记语法类型但不改变外观）

**视觉区分：**
```javascript
// script.js:6669-6673
if (!cat.applyStyle) {
    btn.style.opacity = '0.7';
    btn.style.fontStyle = 'italic';
    btn.title = `${cat.label}（仅分类，不应用样式）`;
}
```

**应用逻辑：**
```javascript
// script.js:3130-3142
const category = state.customCategories.find(c => c.id === currentCategory);
const shouldApplyStyle = category ? category.applyStyle : true;

if (shouldApplyStyle) {
    // 应用所有格式样式
    if (state.lastBold) record.bold = true;
    if (state.lastUnderline) record.underline = true;
    // ...更多样式
} else {
    // 仅保存类别，不应用样式
    record.category = currentCategory;
}
```

---

### 5. 类别按钮动态渲染

**渲染函数：**
```javascript
// script.js:6643-6680
function renderCategoryButtons() {
    dom.formatCategoryGroup.innerHTML = '';

    state.customCategories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'format-btn';
        btn.dataset.category = cat.id;
        btn.textContent = cat.label;

        // 激活状态
        if (cat.id === currentCategory) {
            btn.classList.add('active');
        }

        // 样式开关视觉效果
        if (!cat.applyStyle) {
            btn.style.opacity = '0.7';
            btn.style.fontStyle = 'italic';
            btn.title = `${cat.label}（仅分类，不应用样式）`;
        }

        dom.formatCategoryGroup.appendChild(btn);
    });

    // 重新绑定事件
    handleFormatCategorySelection();
}
```

---

## 悬停菜单系统

### 1. 触发机制

**鼠标悬停显示：**
```javascript
// script.js:926-948
highlight.addEventListener('mouseenter', (e) => {
    // 清除旧的超时
    clearTimeout(hoverTimeout);

    // 获取位置
    const rect = highlight.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;

    // 显示菜单
    showContextMenu(x, y, highlight);
});
```

**鼠标离开延迟关闭：**
```javascript
// script.js:950-961
highlight.addEventListener('mouseleave', () => {
    hoverTimeout = setTimeout(() => {
        if (!dom.highlightContextMenu.matches(':hover')) {
            hideContextMenu();
        }
    }, 150); // 150ms 延迟
});
```

**菜单悬停保持打开：**
```javascript
// script.js:963-973
dom.highlightContextMenu.addEventListener('mouseenter', () => {
    clearTimeout(hoverTimeout);
});

dom.highlightContextMenu.addEventListener('mouseleave', () => {
    hoverTimeout = setTimeout(() => {
        hideContextMenu();
    }, 150);
});
```

---

### 2. 菜单定位

**智能定位逻辑：**
```javascript
// script.js:992-1030
function showContextMenu(x, y, highlightElement) {
    currentHighlight = highlightElement;

    // 获取标注位置
    const highlightRect = highlightElement.getBoundingClientRect();

    // 显示菜单以获取尺寸
    dom.highlightContextMenu.classList.remove('hidden');
    const menuRect = dom.highlightContextMenu.getBoundingClientRect();

    // 默认定位在标注上方
    let left = x - menuRect.width / 2;
    let top = y - menuRect.height - 5;

    // 左侧边界检测
    if (left < 10) {
        left = 10;
    }

    // 右侧边界检测
    if (left + menuRect.width > window.innerWidth - 10) {
        left = window.innerWidth - menuRect.width - 10;
    }

    // 上方空间不足时，显示在下方
    if (top < 10) {
        top = highlightRect.bottom + 5;
    }

    // 应用位置
    dom.highlightContextMenu.style.left = `${left}px`;
    dom.highlightContextMenu.style.top = `${top}px`;
}
```

**定位规则：**
1. 优先显示在标注上方，居中对齐
2. 上方空间不足时，显示在标注下方
3. 防止超出左右边界（最小边距 10px）
4. 使用 `position: fixed` 相对视口定位

---

### 3. 菜单功能

**复制文本：**
```javascript
// script.js:1105-1118
if (action === 'copy') {
    const annotation = state.annotations.find(a => a.id === annotationId);
    if (annotation) {
        navigator.clipboard.writeText(annotation.text).then(() => {
            showToast('已复制到剪贴板', 'success');
        }).catch(err => {
            console.error('复制失败:', err);
            showToast('复制失败', 'error');
        });
    }
    hideContextMenu();
}
```

**编辑笔记：**
```javascript
// script.js:1121-1129
if (action === 'edit') {
    const annotation = state.annotations.find(a => a.id === annotationId);
    if (annotation) {
        showNoteEditor(currentHighlight, annotation);
    }
    hideContextMenu();
}
```

**删除标注：**
```javascript
// script.js:1132-1152
if (action === 'delete') {
    if (confirm('确定删除此标注吗？')) {
        const annotation = state.annotations.find(a => a.id === annotationId);
        if (annotation) {
            // 移除高亮元素
            const highlight = document.querySelector(`[data-annotation-id="${annotationId}"]`);
            if (highlight) {
                const parent = highlight.parentNode;
                while (highlight.firstChild) {
                    parent.insertBefore(highlight.firstChild, highlight);
                }
                parent.removeChild(highlight);
            }

            // 从状态中删除
            state.annotations = state.annotations.filter(a => a.id !== annotationId);
            saveState();
            showToast('标注已删除', 'success');
        }
    }
    hideContextMenu();
}
```

**菜单 HTML 结构：**
```html
<!-- reader.html:367-390 -->
<div id="highlightContextMenu" class="context-menu hidden">
    <button class="context-menu-item" data-action="copy" title="复制文本">
        <span class="context-menu-icon">📋</span>
        <span class="context-menu-text">复制文本</span>
    </button>
    <button class="context-menu-item" data-action="edit" title="编辑笔记">
        <span class="context-menu-icon">✏️</span>
        <span class="context-menu-text">编辑</span>
    </button>
    <button class="context-menu-item" data-action="delete" title="删除标注">
        <span class="context-menu-icon">🗑️</span>
        <span class="context-menu-text">删除</span>
    </button>
</div>
```

---

## 笔记编辑器

### 1. 编辑器定位

**智能定位逻辑：**
```javascript
// script.js:1187-1213
function showNoteEditor(highlight, annotation) {
    currentEditingAnnotation = annotation;

    // 设置编辑器内容
    dom.noteTextarea.value = annotation.note || '';

    // 显示编辑器
    dom.noteEditor.classList.remove('hidden');

    // 获取标注位置（相对于视口）
    const rect = highlight.getBoundingClientRect();

    // 使用 fixed 定位
    dom.noteEditor.style.position = 'fixed';

    // 初始定位在标注下方
    dom.noteEditor.style.left = `${rect.left}px`;
    dom.noteEditor.style.top = `${rect.bottom + 5}px`;

    // 获取编辑器尺寸
    const editorRect = dom.noteEditor.getBoundingClientRect();

    // 检查是否超出视口底部
    if (editorRect.bottom > window.innerHeight) {
        // 显示在标注上方
        dom.noteEditor.style.top = `${rect.top - editorRect.height - 5}px`;
    }

    // 检查是否超出视口右侧
    if (editorRect.right > window.innerWidth) {
        dom.noteEditor.style.left = `${window.innerWidth - editorRect.width - 10}px`;
    }

    dom.noteTextarea.focus();
}
```

**定位规则：**
1. 默认显示在标注下方，左对齐
2. 底部空间不足时，显示在标注上方
3. 右侧超出时，右对齐视口边界
4. 使用 `position: fixed` 防止滚动问题

---

### 2. 笔记保存

**保存笔记：**
```javascript
// script.js:1220-1235
dom.saveNoteBtn.addEventListener('click', () => {
    if (currentEditingAnnotation) {
        const noteText = dom.noteTextarea.value.trim();
        currentEditingAnnotation.note = noteText;

        // 更新高亮元素的 title
        const highlight = document.querySelector(
            `[data-annotation-id="${currentEditingAnnotation.id}"]`
        );
        if (highlight) {
            highlight.title = noteText || currentEditingAnnotation.text;
        }

        saveState();
        showToast('笔记已保存', 'success');
    }
    hideNoteEditor();
});
```

**取消编辑：**
```javascript
// script.js:1238-1240
dom.cancelNoteBtn.addEventListener('click', () => {
    hideNoteEditor();
});
```

---

## 状态管理与持久化

### 1. 状态结构

**完整状态对象：**
```javascript
// script.js:14-71
const state = {
    // 格式状态
    lastBold: false,
    lastUnderline: false,
    lastDashed: false,
    lastSlash: false,
    lastBorderStyle: 'none',

    // 颜色状态
    lastCustomTextColor: null,
    lastBoldColor: null,
    lastUnderlineColor: null,
    lastBorderColor: null,

    // 类别状态
    customCategories: [...],

    // 标注数据
    annotations: [],

    // 其他状态...
};
```

---

### 2. localStorage 持久化

**保存状态：**
```javascript
// script.js:200-205
function saveState() {
    try {
        localStorage.setItem('readerState', JSON.stringify(state));
    } catch (error) {
        console.error('保存状态失败:', error);
    }
}
```

**加载状态：**
```javascript
// script.js:208-226
function loadState() {
    try {
        const saved = localStorage.getItem('readerState');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(state, parsed);

            // 恢复格式按钮状态
            restoreFormatButtonStates();

            // 恢复颜色按钮
            restoreColorButtons();

            // 渲染类别按钮
            renderCategoryButtons();
        }
    } catch (error) {
        console.error('加载状态失败:', error);
    }
}
```

**初始化时自动加载：**
```javascript
// script.js:8525
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadState();
});
```

---

### 3. 标注数据结构

**单个标注对象：**
```javascript
const annotation = {
    id: 'ann_1696234567890',          // 唯一ID
    text: 'example text',              // 标注文本
    category: 'vocab',                 // 类别
    note: '这是一个生词',              // 笔记

    // 样式属性
    bold: true,                        // 粗体
    underline: false,                  // 下划线
    dashed: false,                     // 虚线下划线
    slash: false,                      // 斜杠分隔符
    borderStyle: 'square',             // 边框样式

    // 颜色属性
    customTextColor: '#3b82f6',        // 文本颜色
    boldColor: '#ef4444',              // 粗体颜色
    underlineColor: '#22c55e',         // 下划线颜色
    borderColor: '#8b5cf6',            // 边框颜色

    // 元数据
    timestamp: 1696234567890,          // 创建时间
    startOffset: 0,                    // 起始位置
    endOffset: 12                      // 结束位置
};
```

---

## 交互反馈系统

### 1. Toast 通知

**显示通知：**
```javascript
// script.js:6358-6387
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // 添加到页面
    document.body.appendChild(toast);

    // 触发动画
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // 自动移除
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}
```

**通知类型：**
- `success` - 绿色，成功操作
- `error` - 红色，错误提示
- `warning` - 橙色，警告信息
- `info` - 蓝色，普通信息

**样式设计：**
```css
/* styles.css:2895-2945 */
.toast {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    z-index: 10000;
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.3s ease;
}

.toast.show {
    opacity: 1;
    transform: translateY(0);
}

.toast-success { background: #22c55e; }
.toast-error { background: #ef4444; }
.toast-warning { background: #f97316; }
.toast-info { background: #3b82f6; }
```

---

### 2. 视觉反馈

**按钮激活状态：**
```css
/* styles.css:1245-1250 */
.format-btn.active {
    background-color: #3b82f6;
    color: white;
    border-color: #2563eb;
}
```

**颜色按钮显示：**
```javascript
// script.js:7115-7123
dom.formatBoldToggle.addEventListener('click', () => {
    state.lastBold = !state.lastBold;
    dom.formatBoldToggle.classList.toggle('active', state.lastBold);

    // 显示/隐藏颜色按钮
    dom.boldColorBtn.classList.toggle('hidden', !state.lastBold);

    saveState();
});
```

**悬停效果：**
```css
/* styles.css:1238-1243 */
.format-btn:hover {
    background-color: #f3f4f6;
    border-color: #d1d5db;
}

.color-option:hover {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
```

---

## 使用流程

### 标准标注流程

**步骤 1：选择文本**
- 在阅读区域选中要标注的文本
- 或双击单个单词快速选中

**步骤 2：设置格式（可选）**
- 点击工具栏按钮设置样式：
  - **B** - 粗体
  - **U** - 下划线
  - **- -** - 虚线下划线
  - **/ /** - 斜杠分隔符
  - **□** / **○** - 边框
- 点击 🎨 按钮选择颜色

**步骤 3：选择类别**
- 点击类别按钮（生词、词组、句子等）
- 或使用自定义类别

**步骤 4：应用标注**
- 自动应用选中的格式和类别
- 标注立即显示在文本上

**步骤 5：添加笔记（可选）**
- 悬停在标注上，点击编辑按钮
- 在弹出的编辑器中输入笔记
- 点击保存

---

### 快捷操作

**复制标注文本：**
1. 悬停在标注上
2. 点击菜单中的 📋 复制按钮
3. 文本已复制到剪贴板

**编辑标注：**
1. 悬停在标注上
2. 点击菜单中的 ✏️ 编辑按钮
3. 修改笔记后保存

**删除标注：**
1. 悬停在标注上
2. 点击菜单中的 🗑️ 删除按钮
3. 确认删除

---

### 高级功能

**自定义类别：**
1. 点击工具栏的 ⚙️ 按钮
2. 在弹出的管理面板中：
   - 点击 ➕ 添加新类别
   - 修改现有类别名称
   - 切换"应用样式"开关
   - 删除不需要的类别
3. 点击关闭保存更改

**纯分类标注（无样式）：**
1. 打开类别管理
2. 取消"应用样式"复选框
3. 该类别将只记录分类，不改变文本外观
4. 类别按钮显示为斜体，透明度降低

**多层嵌套标注：**
1. 标注一段文本
2. 在已标注的文本中选择部分内容
3. 应用不同的标注
4. 系统自动调整边框大小防止重叠

---

## 技术实现细节

### 1. 核心技术栈

**前端框架：** 原生 JavaScript (ES6+)
**样式：** CSS3（Grid、Flexbox、CSS Variables）
**存储：** localStorage
**API：** Clipboard API

---

### 2. 关键算法

**Range 高亮算法：**
```javascript
// script.js:2575-2650
function applyHighlight(range, record) {
    const highlight = document.createElement('span');
    highlight.className = 'highlight';
    highlight.dataset.annotationId = record.id;

    // 应用样式
    if (record.bold) highlight.style.fontWeight = 'bold';
    if (record.underline) highlight.style.textDecoration = 'underline';
    // ...

    // 包裹选中内容
    try {
        range.surroundContents(highlight);
    } catch (error) {
        // 处理跨节点选择
        const fragment = range.extractContents();
        highlight.appendChild(fragment);
        range.insertNode(highlight);
    }
}
```

**嵌套层级计算：**
```javascript
// script.js:2449-2464
function getNestingLevel(element) {
    let level = 0;
    let parent = element.parentElement;
    while (parent && parent !== dom.readingContent) {
        if (parent.classList.contains('highlight')) {
            level++;
        }
        parent = parent.parentElement;
    }
    return level;
}
```

---

### 3. 性能优化

**事件委托：**
```javascript
// 使用事件委托处理类别按钮点击
dom.formatCategoryGroup.addEventListener('click', (e) => {
    if (e.target.classList.contains('format-btn')) {
        const categoryId = e.target.dataset.category;
        handleCategorySelection(categoryId);
    }
});
```

**防抖延迟：**
```javascript
// 150ms 延迟防止菜单频繁开关
let hoverTimeout;
hoverTimeout = setTimeout(() => {
    if (!dom.highlightContextMenu.matches(':hover')) {
        hideContextMenu();
    }
}, 150);
```

**条件渲染：**
```javascript
// 仅在需要时显示颜色按钮
dom.boldColorBtn.classList.toggle('hidden', !state.lastBold);
```

---

### 4. 浏览器兼容性

**支持的浏览器：**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**使用的现代 API：**
- `Navigator.clipboard.writeText()` - 剪贴板 API
- `element.getBoundingClientRect()` - 元素定位
- `CSS Grid` - 颜色面板布局
- `CSS Custom Properties` - 动态样式
- `localStorage` - 数据持久化

---

### 5. 文件结构

```
public/
├── reader.html          # 主 HTML 文件 (48,638 字节)
├── script.js            # 主 JavaScript 文件 (249,197 字节)
├── styles.css           # 主样式文件 (72,567 字节)
└── TOOLBAR_FEATURES_GUIDE.md  # 本文档
```

**代码行数统计：**
- `reader.html`: ~1200 行
- `script.js`: ~8500 行
- `styles.css`: ~3300 行

---

## 附录

### A. 快捷键（未来可扩展）

目前未实现快捷键，建议未来添加：
- `Ctrl + B` - 切换粗体
- `Ctrl + U` - 切换下划线
- `Ctrl + C`（在标注上）- 复制标注文本
- `Delete`（在标注上）- 删除标注
- `Ctrl + E` - 编辑笔记

---

### B. 常见问题

**Q: 如何删除所有标注？**
A: 目前需要逐个删除。建议添加"清除所有标注"功能。

**Q: 标注数据如何导出？**
A: 数据存储在 localStorage 中，可以通过导出功能保存为 JSON 文件（需实现）。

**Q: 支持多人协作吗？**
A: 目前仅支持本地单人使用。多人协作需要后端服务器支持。

**Q: 能否在移动设备上使用？**
A: 当前主要为桌面设计，移动端体验需优化。

---

### C. 开发路线图

**短期计划：**
- [ ] 快捷键支持
- [ ] 标注搜索功能
- [ ] 导出/导入功能
- [ ] 移动端适配

**长期计划：**
- [ ] 云端同步
- [ ] 多人协作
- [ ] AI 辅助标注
- [ ] 语音笔记

---

## 更新日志

**v1.0.0 (2025-10-03)**
- ✨ 初始版本发布
- ✨ 完整工具栏功能
- ✨ 21色颜色系统
- ✨ 类别管理系统
- ✨ 悬停菜单
- ✨ 动态边框
- ✨ Toast 通知

---

## 贡献者

本文档由 Claude Code 自动生成
生成时间：2025-10-03

---

**文档结束**
