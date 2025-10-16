# 🎨 语法标注颜色&符号速查表

## 📋 完整对照表

| 语法成分 | 颜色 | 符号 | 类别名称 | 使用示例 |
|---------|------|------|---------|---------|
| **主要主语** | ⬛ 黑色 | 无 | mainSubject | **The book** was interesting. |
| **从句主语** | 🟢 绿色 | 无 | clauseSubject | The book that **I** read... |
| **主要谓语** | 🔴 红色 | 无 | mainVerb | The book **was** interesting. |
| **从句谓语** | 🟥 深红色 | 无 | clauseVerb | The book that I **read**... |
| **宾语表语** | 🟠 橙色 | 无 | object | The book was **interesting**. |
| **定语** | 🟣 紫色 | `(...)` | attribute | The **(very good)** book... |
| **状语** | 🔵 蓝色 | `[...]` | adverbial | I read **[yesterday]**. |
| **连词** | 🔷 蓝绿色 | 无 | conjunction | I like apples **and** oranges. |
| **从句引导词** | 🩷 粉色 | `{...}` | clauseMarker | The book **{that}** I read... |

---

## 💡 实际标注示例

### 示例1：定语从句
**原句**: The book that I read yesterday was very interesting.

**标注后**:
```
The book {that} I read [yesterday] was very interesting.
  ⬛      🩷   🟢  🟥      🔵      🔴       🟠
 主语   引导词 从句  从句   状语    谓语     表语
            主语  谓语
```

**详细说明**:
- `The book` - 主要主语（黑色，加粗）
- `{that}` - 从句引导词（粉色，花括号）
- `I` - 从句主语（绿色，加粗）
- `read` - 从句谓语（深红色，加粗）
- `[yesterday]` - 状语（蓝色，方括号）
- `was` - 主要谓语（红色，加粗）
- `very interesting` - 表语（橙色）

---

### 示例2：状语从句
**原句**: I will call you when I arrive home.

**标注后**:
```
I will call you {when} I arrive [home].
⬛   🔴      🟠   🩷   🟢  🟥     🔵
主语 谓语   宾语 引导词 从句 从句   状语
                    主语 谓语
```

---

### 示例3：复合句
**原句**: The student who studies hard will succeed.

**标注后**:
```
(The student) {who} studies [hard] will succeed.
    🟣         🩷     🟢      🔵    🔴     🟠
   定语      引导词  从句    状语  谓语   宾语
                    主语
```

---

## 🎯 手动标注步骤

### 方法1：使用语法分析按钮
1. 选中要标注的文本
2. 在标注对话框找到"语法分析"区域
3. 点击对应的按钮（主语、谓语、宾/表等）
4. 保存标注

### 方法2：使用AI自动分析
1. 配置AI API密钥
2. 点击"🤖 AI分析"按钮
3. AI自动识别并标注所有语法成分
4. 查看结果

---

## 🔤 CSS类名对照

| 语法成分 | CSS类名 | 数据属性 |
|---------|---------|---------|
| 主要主语 | `.highlight[data-category="mainSubject"]` | `data-category="mainSubject"` |
| 从句主语 | `.highlight[data-category="clauseSubject"]` | `data-category="clauseSubject"` |
| 主要谓语 | `.highlight[data-category="mainVerb"]` | `data-category="mainVerb"` |
| 从句谓语 | `.highlight[data-category="clauseVerb"]` | `data-category="clauseVerb"` |
| 宾语表语 | `.highlight[data-category="object"]` | `data-category="object"` |
| 定语 | `.highlight[data-category="attribute"]` | `data-category="attribute"` |
| 状语 | `.highlight[data-category="adverbial"]` | `data-category="adverbial"` |
| 连词 | `.highlight[data-category="conjunction"]` | `data-category="conjunction"` |
| 从句引导词 | `.highlight[data-category="clauseMarker"]` | `data-category="clauseMarker"` |

---

## 🎨 颜色代码

### 浅色模式
```css
主要主语: color: #000000; (黑色)
从句主语: color: #059669; (绿色)
主要谓语: color: #dc2626; (红色)
从句谓语: color: #991b1b; (深红色)
宾语表语: color: #ea580c; (橙色)
定语:    color: #9333ea; (紫色)
状语:    color: #2563eb; (蓝色)
连词:    color: #0891b2; (蓝绿色)
引导词:  color: #ec4899; (粉色)
```

### 暗黑模式
```css
主要主语: color: #f3f4f6; (灰白色)
从句主语: color: #6ee7b7; (浅绿色)
主要谓语: color: #f87171; (浅红色)
从句谓语: color: #fca5a5; (粉红色)
宾语表语: color: #fb923c; (浅橙色)
定语:    color: #c084fc; (浅紫色)
状语:    color: #60a5fa; (浅蓝色)
连词:    color: #22d3ee; (青色)
引导词:  color: #f9a8d4; (粉色)
```

---

## 🔧 符号自动添加规则

### JavaScript实现
```javascript
const GRAMMAR_SYMBOLS = {
    attribute: { prefix: '(', suffix: ')' },      // 定语：圆括号
    adverbial: { prefix: '[', suffix: ']' },      // 状语：方括号
    clauseMarker: { prefix: '{', suffix: '}' }    // 引导词：花括号
};
```

### 自动添加逻辑
- **定语**: 在文本前后添加 `( )`
- **状语**: 在文本前后添加 `[ ]`
- **从句引导词**: 在文本前后添加 `{ }`
- **其他成分**: 不添加符号，仅改变颜色

---

## 📖 记忆口诀

### 颜色记忆
```
主语黑和绿，谓语红深红
宾表用橙色，定语紫括号
状语蓝方框，连词蓝绿色
引导粉花括，颜色要记牢
```

### 符号记忆
```
圆括号(定语)修饰名词用
方括号[状语]修饰动形容
花括号{引导}从句连接词
三种符号别记混
```

---

## ✅ 功能验证清单

### 手动标注测试
- [ ] 主要主语显示黑色
- [ ] 从句主语显示绿色
- [ ] 主要谓语显示红色
- [ ] 从句谓语显示深红色
- [ ] 宾语表语显示橙色
- [ ] 定语显示紫色+括号
- [ ] 状语显示蓝色+方括号
- [ ] 连词显示蓝绿色
- [ ] 引导词显示粉色+花括号

### AI自动标注测试
- [ ] AI能正确识别主语
- [ ] AI能正确识别谓语
- [ ] AI能正确识别宾语/表语
- [ ] AI能正确识别定语
- [ ] AI能正确识别状语
- [ ] AI能正确识别连词
- [ ] AI能正确识别从句引导词
- [ ] 符号自动添加正确

### 视觉效果测试
- [ ] 浅色模式颜色清晰可辨
- [ ] 暗黑模式颜色清晰可辨
- [ ] 符号显示正确
- [ ] 文本不重叠
- [ ] 多个标注可以共存

---

## 🎓 使用建议

### 初学者
1. 先学习基本句型（主谓宾）
2. 使用AI自动分析查看结构
3. 对比AI标注学习语法
4. 逐渐尝试手动标注

### 进阶用户
1. 先手动标注练习
2. 使用AI验证结果
3. 分析复杂长难句
4. 总结语法规律

### 考研用户
1. 精读真题文章
2. AI辅助语法分析
3. 标注重点难点
4. 整理高频结构

---

## 🔍 常见问题

### Q: 为什么定语、状语、引导词有符号？
**A**: 为了快速区分修饰成分和连接成分，符号提供视觉辅助。

### Q: 可以修改颜色吗？
**A**: 可以，在`styles.css`中修改对应的CSS规则。

### Q: AI分析不准确怎么办？
**A**: AI准确率约90%，建议人工检查并手动修改。

### Q: 如何快速切换语法标注？
**A**: 使用标注对话框中的语法分析按钮，或使用模板功能。

---

## 📚 相关文档

- [AI语法标注使用指南](./AI_GRAMMAR_ANNOTATION.md)
- [完整功能清单](./FEATURE_CHECKLIST.md)
- [新功能说明v4.0](./NEW_FEATURES_V4.md)
- [语法分析文档](./GRAMMAR_ANNOTATION.md)

---

**快速上手**: 加载文本 → 点击"🤖 AI分析" → 查看颜色标注 → 开始学习！

**记住**: 主语黑绿、谓语红深红、宾表橙、定语紫()、状语蓝[]、连词蓝绿、引导粉{}
