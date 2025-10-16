# 标注流程逻辑文档

生成时间：2025-10-07

## 目录

1. [概览](#概览)
2. [核心状态管理](#核心状态管理)
3. [标注创建流程](#标注创建流程)
4. [标注编辑流程](#标注编辑流程)
5. [标注删除流程](#标注删除流程)
6. [快速标注模式](#快速标注模式)
7. [工具栏管理](#工具栏管理)
8. [关键函数索引](#关键函数索引)
9. [状态转换图](#状态转换图)

---

## 概览

标注系统支持两种模式：
- **普通标注模式**：选中文字 → 工具栏配置 → 保存标注
- **快速标注模式**：选中文字 → 立即应用预设样式

核心机制：
- **编辑模式**：选中已有标注时进入编辑模式（`state.editingId` 被设置）
- **创建模式**：选中新文字时进入创建模式（`state.editingId` 为 null）

---

## 核心状态管理

### 全局状态对象（`state`）

**位置**：script.js:1-77

**标注相关状态**：
```javascript
state = {
    annotations: [],           // 所有标注记录数组
    activeRange: null,         // 当前选择的文本范围（Range对象）
    editingId: null,          // 当前编辑的标注ID（null表示创建模式）

    // 工具栏配置状态
    lastCategory: null,        // 最后选择的类别
    lastColor: null,           // 最后选择的颜色
    lastBold: false,           // 最后选择的加粗状态
    lastUnderline: false,      // 最后选择的下划线状态
    lastStrikethrough: false,  // 最后选择的删除线状态
    lastBorderStyle: 'none',   // 最后选择的边框样式
    lastEmoji: '',             // 最后选择的Emoji
    // ... 其他样式配置

    // 断点连接标注
    lastAnnotationText: '',    // 上次标注的文本
    lastAnnotationTime: 0,     // 上次标注的时间戳
    lastAnnotationId: null,    // 上次标注的ID
}
```

### 标注记录结构

**单个标注对象**：
```javascript
{
    id: 'anno-xxx',           // 唯一标识符
    text: '选中的文本',        // 标注的文本内容
    category: 'vocab',        // 标注类别
    color: 'honey',           // 背景颜色
    bold: true,               // 是否加粗
    underline: true,          // 是否下划线
    strikethrough: false,     // 是否删除线
    borderStyle: 'square',    // 边框样式
    emoji: '⭐',              // Emoji标记
    note: '笔记内容',         // 用户备注
    tags: ['标签1', '标签2'], // 标签数组

    // 连接标注相关
    linkedAnnotations: [],    // 连接的子标注ID数组（主标注）
    linkedTo: null,           // 连接到的主标注ID（子标注）

    // 元数据
    timestamp: 1234567890,    // 创建时间戳
    documentId: 'doc-xxx',    // 所属文档ID
}
```

---

## 标注创建流程

### 流程图

```
用户选中文字
    ↓
scheduleSelectionCheck() ← pointerup/keyup事件触发
    ↓
handleTextSelection() [检测选中状态]
    ↓
检查是否在快速标注模式？
    ├─ 是 → applyQuickAnnotationToSelection() [立即应用]
    │         ↓
    │      创建标注记录 → 渲染高亮 → persistState()
    │
    └─ 否 → 检查是否选中已有标注？
            ├─ 是 → prepareEditingExisting() [编辑模式]
            │         ↓
            │      设置 state.editingId
            │         ↓
            │      同步工具栏显示标注样式
            │         ↓
            │      showToolbar()
            │
            └─ 否 → 创建新标注流程
                      ↓
                   resetToolbarForm() [重置工具栏]
                      ↓
                   showToolbar() [显示工具栏]
                      ↓
                   用户配置样式
                      ↓
                   点击"保存标注"按钮
                      ↓
                   handleSaveAnnotation()
                      ↓
                   创建标注记录 → 渲染高亮 → persistState()
```

### 关键函数详解

#### 1. scheduleSelectionCheck()
**位置**：script.js:1831-1841
**功能**：延迟执行选中检测，避免频繁触发
```javascript
function scheduleSelectionCheck(event) {
    if (selectionCheckHandle) {
        clearTimeout(selectionCheckHandle);
    }
    selectionCheckHandle = setTimeout(() => {
        handleTextSelection();
    }, 100);
}
```

#### 2. handleTextSelection()
**位置**：script.js:1843-1908
**功能**：处理文本选中事件，决定进入创建模式还是编辑模式

**核心逻辑**：
```javascript
function handleTextSelection() {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);

    // 快速标注模式：立即应用
    if (quickAnnotationMode) {
        applyQuickAnnotationToSelection(range);
        return;
    }

    // 检查是否选中已有标注
    const highlight = getHighlightAncestor(range.commonAncestorContainer);
    if (highlight) {
        // 完全选中 → 编辑模式
        if (selectedText === highlightFullText) {
            prepareEditingExisting(highlight);
            return;
        }
        // 部分选中 → 允许创建嵌套标注
    }

    // 创建新标注
    state.activeRange = range.cloneRange();
    state.editingId = null;
    resetToolbarForm();
    showToolbar(range);
}
```

**判断逻辑**：
1. **快速标注模式**：直接应用样式
2. **完全选中已有标注**：进入编辑模式
3. **部分选中标注**：允许创建嵌套标注
4. **选中新文字**：创建新标注

#### 3. getHighlightAncestor()
**位置**：script.js:1910-1916
**功能**：检测节点是否在highlight元素内
```javascript
function getHighlightAncestor(node) {
    if (!node) return null;
    if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('highlight')) {
        return node;
    }
    return node.parentElement ? getHighlightAncestor(node.parentElement) : null;
}
```

#### 4. handleSaveAnnotation()
**位置**：script.js:3201-3348
**功能**：保存标注（创建或更新）

**核心逻辑**：
```javascript
function handleSaveAnnotation() {
    const text = getSelectionText();
    const category = state.lastCategory;
    const color = state.lastColor;
    // ... 收集所有配置

    if (state.editingId) {
        // 更新现有标注
        updateAnnotation(state.editingId, { /* 新配置 */ });
    } else {
        // 创建新标注
        const record = {
            id: generateId(),
            text, category, color,
            // ... 所有配置
            timestamp: Date.now(),
            documentId: state.activeDocumentId
        };

        // 检查是否需要连接到上次标注
        if (shouldLinkToPreviousAnnotation()) {
            linkAnnotations(state.lastAnnotationId, record.id);
        }

        state.annotations.push(record);
        renderHighlight(record);
        saveHistory('create', record);
    }

    persistState();
    hideToolbar();
}
```

---

## 标注编辑流程

### 流程图

```
用户完全选中已有标注
    ↓
handleTextSelection() 检测到完全选中
    ↓
prepareEditingExisting(highlight元素)
    ↓
设置 state.editingId = annotationId
    ↓
处理多片段标注
    ├─ 单片段 → createRangeFromElement()
    └─ 多片段 → 创建跨越所有片段的Range
    ↓
同步工具栏状态
    ├─ activateCategory() [恢复类别]
    ├─ setHighlightColor() [恢复颜色]
    ├─ setBoldState() [恢复加粗]
    ├─ setUnderlineState() [恢复下划线]
    ├─ 恢复边框样式（设置active类）
    ├─ 恢复Emoji（设置active类）
    └─ 恢复其他样式配置
    ↓
showToolbar(highlight, isEditing=true)
    ↓
用户修改配置并保存
    ↓
handleSaveAnnotation() [更新模式]
    ↓
updateAnnotation() → 重新渲染 → persistState()
```

### 关键函数详解

#### 1. prepareEditingExisting()
**位置**：script.js:1918-2028
**功能**：准备编辑现有标注，同步工具栏状态

**核心逻辑**：
```javascript
function prepareEditingExisting(highlight) {
    const annotationId = highlight.dataset.id;
    const record = state.annotations.find(item => item.id === annotationId);

    state.editingId = annotationId;

    // 处理多片段标注
    const allFragments = dom.readingArea.querySelectorAll(`.highlight[data-id="${annotationId}"]`);
    if (allFragments.length > 1) {
        // 创建跨越所有片段的Range
        const range = document.createRange();
        range.setStartBefore(allFragments[0]);
        range.setEndAfter(allFragments[allFragments.length - 1]);
        state.activeRange = range;
    } else {
        state.activeRange = createRangeFromElement(highlight);
    }

    // 同步工具栏状态
    resetToolbarForm();
    activateCategory(record.category, record.customCategory);
    setHighlightColor(record.color);
    setBoldState(Boolean(record.bold));
    setUnderlineState(record.underline);

    // 恢复边框样式
    dom.borderStyleButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.border === record.borderStyle);
    });

    // 恢复Emoji
    dom.emojiButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.emoji === record.emoji);
    });

    // ... 恢复其他样式

    showToolbar(highlight.getBoundingClientRect(), true);
}
```

**关键点**：
1. 设置 `state.editingId`（标记进入编辑模式）
2. 处理多片段标注（如跨行标注）
3. 将标注记录的所有样式同步到工具栏
4. 显示工具栏（`isEditing=true`）

#### 2. updateAnnotation()
**位置**：script.js:3350-3480
**功能**：更新现有标注

**核心逻辑**：
```javascript
function updateAnnotation(id, updates) {
    const index = state.annotations.findIndex(item => item.id === id);
    const oldRecord = { ...state.annotations[index] };

    // 合并更新
    const newRecord = { ...oldRecord, ...updates };
    state.annotations[index] = newRecord;

    // 删除旧的高亮
    const oldHighlights = dom.readingArea.querySelectorAll(`.highlight[data-id="${id}"]`);
    oldHighlights.forEach(highlight => {
        const parent = highlight.parentNode;
        while (highlight.firstChild) {
            parent.insertBefore(highlight.firstChild, highlight);
        }
        parent.removeChild(highlight);
        parent.normalize();
    });

    // 重新渲染
    renderHighlight(newRecord);
    saveHistory('update', { oldRecord, newRecord });
    persistState();
}
```

---

## 标注删除流程

### 流程图（新增功能）

```
用户选中已有标注
    ↓
prepareEditingExisting() [进入编辑模式]
    ↓
工具栏显示该标注的样式（active状态）
    ↓
用户点击active按钮（颜色/边框/格式等）
    ↓
检测：state.editingId 存在 && 按钮是active状态
    ↓
deleteAnnotation(state.editingId)
    ↓
删除标注记录和DOM元素
    ├─ 删除主标注 + 所有连接的子标注
    ├─ 保存撤销数据
    └─ persistState()
    ↓
hideToolbar() + 清除选择
```

### 关键函数详解

#### 1. 按钮处理函数增强逻辑

**示例：handleColorSelection()**
**位置**：script.js:2396-2430

```javascript
function handleColorSelection(button, options = {}) {
    const clickedColor = button.dataset.color;

    // 如果点击的是已选中的颜色
    if (state.lastColor === clickedColor) {
        // 场景1：编辑模式 + 点击相同颜色 = 删除标注
        if (state.editingId) {
            console.log('[DEBUG] 🗑️ 编辑模式下取消颜色，删除标注', { id: state.editingId });
            deleteAnnotation(state.editingId);
            hideToolbar();
            // 清除选择
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
            }
            return;
        }

        // 场景2：普通模式 + 点击相同颜色 = 取消选择
        state.lastColor = null;
        updateActiveColorButtons(dom.colorButtons, null);
        // ... 更新状态
    } else {
        // 选中新颜色
        setHighlightColor(clickedColor, options);
    }
    updateLivePreview();
}
```

**同样逻辑应用于**：
- `handleBorderStyleSelection()` (script.js:2436)
- `handleEmojiSelection()` (script.js:2482)
- `formatBoldToggle` 事件 (script.js:515)
- `formatUnderlineToggle` 事件 (script.js:532)
- `formatStrikethroughToggle` 事件 (script.js:560)
- `underlineToggle` 事件 (script.js:350)
- `strikethroughToggle` 事件 (script.js:369)
- `boldToggle` 事件 (script.js:637)

#### 2. deleteAnnotation()
**位置**：script.js:4079-4200
**功能**：删除标注（支持级联删除和撤销）

**核心逻辑**：
```javascript
function deleteAnnotation(id) {
    const index = state.annotations.findIndex(item => item.id === id);
    const record = state.annotations[index];

    // 准备撤销数据
    const undoData = {
        mainRecord: JSON.parse(JSON.stringify(record)),
        mainIndex: index,
        linkedRecords: [],
        linkedIndices: {}
    };

    // 情况1：删除主标注，同时删除所有连接的子标注
    if (record.linkedAnnotations && record.linkedAnnotations.length > 0) {
        record.linkedAnnotations.forEach(linkedId => {
            const linkedIndex = state.annotations.findIndex(item => item.id === linkedId);
            const linkedRecord = state.annotations[linkedIndex];
            undoData.linkedRecords.push(JSON.parse(JSON.stringify(linkedRecord)));
            undoData.linkedIndices[linkedId] = linkedIndex;

            // 删除DOM元素
            removeHighlightElements(linkedId);
        });

        // 从数组中删除子标注（从后往前删除，避免索引变化）
        // ...
    }

    // 情况2：删除子标注，从主标注的linkedAnnotations中移除
    if (record.linkedTo) {
        const parentRecord = state.annotations.find(item => item.id === record.linkedTo);
        if (parentRecord) {
            parentRecord.linkedAnnotations = parentRecord.linkedAnnotations.filter(id => id !== id);
        }
    }

    // 删除主标注的DOM元素
    removeHighlightElements(id);

    // 从数组中删除主标注
    state.annotations.splice(index, 1);

    // 保存撤销数据
    saveHistory('delete', undoData);
    persistState();
    updateAnnotationList();
}
```

**关键特性**：
1. 支持级联删除（主标注 + 所有子标注）
2. 完整的撤销支持（保存所有被删除标注的原始索引）
3. 正确处理连接标注的引用关系

---

## 快速标注模式

### 流程图

```
用户打开快速标注模式
    ↓
quickAnnotationMode = true
    ↓
用户选中文字
    ↓
handleTextSelection() 检测到快速模式
    ↓
applyQuickAnnotationToSelection(range)
    ↓
立即应用当前配置
    ├─ 使用 state.lastCategory
    ├─ 使用 state.lastColor
    ├─ 使用 state.lastBold
    └─ ... 其他lastXxx配置
    ↓
创建标注记录 → 渲染高亮 → persistState()
    ↓
检查是否需要连接到上次标注
    ├─ 时间间隔 < 10秒
    ├─ 文本相似度高
    └─ 配置相同
    ↓
如果满足条件 → linkAnnotations()
```

### 关键函数详解

#### applyQuickAnnotationToSelection()
**位置**：script.js:6355-6500
**功能**：快速应用标注（无需打开工具栏）

**核心逻辑**：
```javascript
function applyQuickAnnotationToSelection(range) {
    const text = range.toString().trim();
    if (!text) return;

    // 使用当前配置创建标注
    const record = {
        id: generateId(),
        text,
        category: state.lastCategory || 'vocab',
        color: state.lastColor || 'honey',
        bold: state.lastBold,
        underline: state.lastUnderline,
        // ... 使用所有 state.lastXxx 配置
        timestamp: Date.now(),
        documentId: state.activeDocumentId
    };

    // 检查是否需要连接到上次标注
    const timeDiff = Date.now() - state.lastAnnotationTime;
    const shouldLink = (
        timeDiff < 10000 &&  // 10秒内
        state.lastAnnotationId &&
        categoriesMatch(record.category, state.lastCategory) &&
        colorsMatch(record.color, state.lastColor)
    );

    if (shouldLink) {
        linkAnnotations(state.lastAnnotationId, record.id);
    }

    // 保存标注
    state.annotations.push(record);
    renderHighlight(record);
    saveHistory('create', record);
    persistState();

    // 更新上次标注信息
    state.lastAnnotationText = text;
    state.lastAnnotationTime = Date.now();
    state.lastAnnotationId = record.id;

    // 清除选择
    window.getSelection().removeAllRanges();
}
```

**特性**：
1. 无需打开工具栏，直接应用当前配置
2. 自动连接到上次标注（断点连接功能）
3. 提升标注效率

---

## 工具栏管理

### 工具栏状态同步

**两个工具栏**：
1. **selection-toolbar**：选中文字时弹出（普通模式）
2. **formatting-toolbar**：固定工具栏（快速模式）

**同步机制**：所有按钮操作都会同时更新两个工具栏的状态

#### 1. resetToolbarForm()
**位置**：script.js:2492-2650
**功能**：重置工具栏表单，恢复默认或上次配置

```javascript
function resetToolbarForm() {
    // 同步类别按钮
    dom.categoryButtons.forEach(btn => btn.classList.remove('active'));
    if (dom.formatCategoryButtons) {
        dom.formatCategoryButtons.forEach(btn => btn.classList.remove('active'));
    }

    // 如果有保存的类别，恢复选中
    if (state.lastCategory) {
        const defaultButton = Array.from(dom.categoryButtons).find(btn => btn.dataset.category === state.lastCategory);
        if (defaultButton) {
            handleCategorySelection(defaultButton);
        }
        // 同步formatting-toolbar
        if (dom.formatCategoryButtons) {
            const formatButton = Array.from(dom.formatCategoryButtons).find(btn => btn.dataset.category === state.lastCategory);
            if (formatButton) {
                formatButton.classList.add('active');
            }
        }
    }

    // 恢复颜色
    if (state.lastColor) {
        setHighlightColor(state.lastColor);
    }

    // 恢复格式
    setBoldState(state.lastBold);
    setUnderlineState(state.lastUnderline);

    // ... 恢复其他配置
}
```

#### 2. setBoldState() / setUnderlineState()
**位置**：script.js:1691-1747
**功能**：设置加粗/下划线状态，同步两个工具栏

```javascript
function setBoldState(enabled, options = {}) {
    const { syncForm = true, syncToolbar = true, persist = false } = options;
    state.lastBold = Boolean(enabled);

    // 同步 selection-toolbar 的复选框
    if (syncForm && dom.boldToggle) {
        dom.boldToggle.checked = state.lastBold;
    }

    // 同步 formatting-toolbar 的按钮
    if (syncToolbar && dom.formatBoldToggle) {
        dom.formatBoldToggle.classList.toggle('active', state.lastBold);
        dom.formatBoldToggle.setAttribute('aria-pressed', String(state.lastBold));
    }

    // 显示/隐藏颜色选择按钮
    if (dom.boldColorBtn) {
        if (state.lastBold) {
            dom.boldColorBtn.classList.remove('hidden');
        } else {
            dom.boldColorBtn.classList.add('hidden');
            state.lastBoldColor = null;
        }
    }

    if (persist) {
        persistState();
    }
    updateLivePreview();
}
```

#### 3. showToolbar() / hideToolbar()
**位置**：script.js:2052-2180
**功能**：显示/隐藏selection-toolbar

```javascript
function showToolbar(target, isEditing = false) {
    dom.selectionToolbar.classList.remove('hidden');

    // 隐藏翻译按钮（避免冲突）
    hideQuickTranslateBtn();

    // 定位工具栏
    if (target instanceof DOMRect) {
        positionToolbarFromRect(target);
    } else {
        positionToolbar(target);
    }

    // 设置模式（创建/编辑）
    dom.selectionToolbar.dataset.mode = isEditing ? 'edit' : 'create';

    if (!isEditing) {
        updateLivePreview();
    }
}

function hideToolbar() {
    if (dom.selectionToolbar) {
        dom.selectionToolbar.classList.add('hidden');
    }
    state.activeRange = null;
    state.editingId = null;
    clearLivePreview();
}
```

---

## 关键函数索引

### 文本选择与检测

| 函数名 | 位置 | 功能 |
|--------|------|------|
| `scheduleSelectionCheck()` | 1831 | 延迟执行选中检测 |
| `handleTextSelection()` | 1843 | 处理文本选中事件，决定创建或编辑 |
| `getHighlightAncestor()` | 1910 | 检测节点是否在highlight元素内 |
| `getSelectionText()` | 3381 | 获取选中的文本 |

### 标注创建

| 函数名 | 位置 | 功能 |
|--------|------|------|
| `handleSaveAnnotation()` | 3201 | 保存标注（创建或更新） |
| `applyQuickAnnotationToSelection()` | 6355 | 快速标注模式应用 |
| `renderHighlight()` | 5200+ | 渲染高亮标注到DOM |
| `generateId()` | 3423 | 生成唯一标注ID |

### 标注编辑

| 函数名 | 位置 | 功能 |
|--------|------|------|
| `prepareEditingExisting()` | 1918 | 准备编辑现有标注 |
| `updateAnnotation()` | 3350 | 更新现有标注 |
| `createRangeFromElement()` | 2030 | 从元素创建Range对象 |

### 标注删除

| 函数名 | 位置 | 功能 |
|--------|------|------|
| `deleteAnnotation()` | 4079 | 删除标注（支持级联和撤销） |
| `handleColorSelection()` | 2396 | 颜色按钮处理（含删除逻辑） |
| `handleBorderStyleSelection()` | 2436 | 边框按钮处理（含删除逻辑） |
| `handleEmojiSelection()` | 2482 | Emoji按钮处理（含删除逻辑） |

### 工具栏管理

| 函数名 | 位置 | 功能 |
|--------|------|------|
| `resetToolbarForm()` | 2492 | 重置工具栏表单 |
| `showToolbar()` | 2052 | 显示工具栏 |
| `hideToolbar()` | 2070 | 隐藏工具栏 |
| `setBoldState()` | 1691 | 设置加粗状态 |
| `setUnderlineState()` | 1720 | 设置下划线状态 |
| `setHighlightColor()` | 1758 | 设置高亮颜色 |

### 状态管理

| 函数名 | 位置 | 功能 |
|--------|------|------|
| `persistState()` | 8100+ | 持久化状态到localStorage |
| `loadState()` | 8200+ | 从localStorage加载状态 |
| `saveHistory()` | 7800+ | 保存操作历史（撤销/重做） |

### 连接标注

| 函数名 | 位置 | 功能 |
|--------|------|------|
| `linkAnnotations()` | 6600+ | 连接两个标注 |
| `shouldLinkToPreviousAnnotation()` | 6500+ | 判断是否应该连接到上次标注 |

---

## 状态转换图

```
┌─────────────────────────────────────────────────────────────┐
│                       初始状态                              │
│  editingId: null                                           │
│  activeRange: null                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
            用户选中文字（pointerup/keyup事件）
                            │
                            ↓
        ┌───────────────────┴───────────────────┐
        │                                       │
        ↓                                       ↓
┌─────────────────┐                   ┌─────────────────┐
│  快速标注模式？  │                   │  选中已有标注？  │
└─────────────────┘                   └─────────────────┘
        │                                       │
   是   │   否                              是   │   否
        ↓                                       ↓
┌─────────────────┐                   ┌─────────────────┐
│  立即应用标注    │                   │   编辑模式      │
│                 │                   │                 │
│ quickMode=true  │                   │ editingId=xxx   │
│ 使用lastXxx配置 │                   │ 同步工具栏状态  │
└─────────────────┘                   └─────────────────┘
        │                                       │
        ↓                                       ↓
    创建标注                          ┌─────────────────┐
        │                             │ 用户点击按钮？   │
        │                             └─────────────────┘
        │                                       │
        │                          ┌────────────┴────────────┐
        │                          │                         │
        │                          ↓                         ↓
        │                  ┌─────────────────┐     ┌─────────────────┐
        │                  │  active按钮？    │     │  新配置？        │
        │                  └─────────────────┘     └─────────────────┘
        │                          │                         │
        │                     是   │   否                    │
        │                          ↓                         ↓
        │                  ┌─────────────────┐     ┌─────────────────┐
        │                  │   删除标注       │     │   更新标注      │
        │                  │                 │     │                 │
        │                  │ deleteAnnotation│     │ updateAnnotation│
        │                  └─────────────────┘     └─────────────────┘
        │                          │                         │
        └──────────────────────────┴─────────────────────────┘
                                   │
                                   ↓
                           ┌─────────────────┐
                           │  持久化状态      │
                           │                 │
                           │  persistState() │
                           └─────────────────┘
                                   │
                                   ↓
                           ┌─────────────────┐
                           │  返回初始状态    │
                           │                 │
                           │ editingId: null │
                           └─────────────────┘
```

---

## 最佳实践

### 1. 添加新的样式选项

**步骤**：
1. 在 `state` 中添加 `lastXxx` 变量
2. 在标注记录结构中添加对应字段
3. 在工具栏HTML中添加按钮
4. 创建设置函数（如 `setXxxState()`）
5. 在 `resetToolbarForm()` 中恢复配置
6. 在 `prepareEditingExisting()` 中同步状态
7. 在 `handleSaveAnnotation()` 中保存配置
8. 在 `renderHighlight()` 中应用样式

### 2. 添加删除逻辑到新按钮

**模板**：
```javascript
function handleNewButtonSelection(button) {
    const newValue = button.dataset.value;
    const isActive = button.classList.contains('active');

    if (isActive) {
        // 场景1：编辑模式 + active按钮 = 删除标注
        if (state.editingId) {
            console.log('[DEBUG] 🗑️ 编辑模式下取消XXX，删除标注', { id: state.editingId });
            deleteAnnotation(state.editingId);
            hideToolbar();
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
            }
            return;
        }

        // 场景2：普通模式 = 取消选择
        button.classList.remove('active');
        state.lastNewValue = null;
    } else {
        // 选中新值
        button.classList.add('active');
        state.lastNewValue = newValue;
    }

    updateLivePreview();
    persistState();
}
```

### 3. 调试技巧

**查看当前状态**：
```javascript
console.log('[DEBUG] 当前状态', {
    editingId: state.editingId,
    lastColor: state.lastColor,
    lastBold: state.lastBold,
    annotationsCount: state.annotations.length
});
```

**查看标注记录**：
```javascript
console.log('[DEBUG] 标注记录', JSON.stringify(state.annotations, null, 2));
```

**查看DOM高亮元素**：
```javascript
const highlights = dom.readingArea.querySelectorAll('.highlight');
console.log('[DEBUG] 高亮元素数量', highlights.length);
```

---

## 常见问题

### Q1: 为什么有些按钮是toggle，有些是单选？

**A**: 根据语义不同：
- **toggle**：加粗、下划线、删除线（可以叠加）
- **单选**：颜色、边框、类别（只能选一个）

### Q2: 编辑模式和创建模式如何区分？

**A**: 通过 `state.editingId` 判断：
- `state.editingId !== null` → 编辑模式
- `state.editingId === null` → 创建模式

### Q3: 为什么删除标注要清除选择？

**A**: 避免残留选择状态，防止用户再次操作时触发意外行为。

### Q4: 连接标注的判断条件是什么？

**A**:
1. 时间间隔 < 10秒
2. 类别相同
3. 颜色相同
4. 其他关键配置相同

### Q5: 如何支持撤销删除？

**A**: `deleteAnnotation()` 已经通过 `saveHistory('delete', undoData)` 保存了完整的撤销数据，包括：
- 主标注记录和原始索引
- 所有子标注记录和原始索引
- 主标注的连接关系

撤销时会按原始索引恢复所有标注。

---

## 版本历史

- **v1.0**（2025-10-07）：初始版本，整理完整标注流程逻辑
- **v1.1**（2025-10-07）：新增标注删除流程（编辑模式下点击active按钮删除）

---

**文档维护者**：Claude Code
**最后更新**：2025-10-07
