# 🤖 AI自动语法标注功能

## 📚 功能说明

通过AI接口实现英语句子的自动语法分析和标注，AI会自动识别句子成分并应用对应的颜色和符号。

---

## 🎯 主要功能

### 自动识别以下语法成分

| 语法成分 | 颜色 | 符号 | AI识别类型 |
|---------|------|------|-----------|
| **主要主语** | ⬛ 黑色 | 无 | mainSubject |
| **从句主语** | 🟢 绿色 | 无 | clauseSubject |
| **主要谓语** | 🔴 红色 | 无 | mainVerb |
| **从句谓语** | 🟥 深红色 | 无 | clauseVerb |
| **宾语表语** | 🟠 橙色 | 无 | object |
| **定语** | 🟣 紫色 | `(...)` | attribute |
| **状语** | 🔵 蓝色 | `[...]` | adverbial |
| **连词** | 🔷 蓝绿色 | 无 | conjunction |
| **从句引导词** | 🩷 粉色 | `{...}` | clauseMarker |

---

## ⚙️ 配置步骤

### 1️⃣ 打开AI设置

点击页面右上角的 **🤖 AI** 按钮，打开AI设置面板。

### 2️⃣ 配置API信息

#### API Key（必填）
- 输入您的OpenAI或其他兼容API的密钥
- 密钥保存在浏览器本地，不会上传到服务器

#### API端点（可选）
- 默认：`https://api.openai.com/v1/chat/completions`
- 可修改为其他兼容ChatGPT格式的API端点
- 例如：
  - Azure OpenAI: `https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2024-02-15-preview`
  - 国内中转API: `https://your-proxy.com/v1/chat/completions`

#### 模型选择
- **GPT-4**: 最准确，但速度较慢，费用较高
- **GPT-3.5 Turbo**: 速度快，准确度高，性价比最佳（推荐）
- **Claude 3 Sonnet**: 准确度高，适合复杂句子
- **Claude 3 Haiku**: 速度最快，适合简单句子
- **自定义**: 输入自定义模型ID

#### 分析选项
- ✅ **自动应用标注**: AI分析完成后自动添加标注到文本
- ⬜ **仅分析选中文本**: 勾选后只分析选中部分，否则分析全文

### 3️⃣ 保存设置

点击 **保存设置** 按钮，配置信息会保存到浏览器本地。

---

## 🚀 使用方法

### 方式1：分析全文

1. 在左侧输入区粘贴或输入英文文本
2. 点击 **保存并打开短文** 载入文本
3. 点击右侧面板的 **🤖 AI分析** 按钮
4. 等待AI分析完成（显示"分析中..."）
5. AI自动应用语法标注，完成后弹出提示

### 方式2：分析选中文本

1. 在AI设置中勾选 **仅分析选中文本**
2. 在阅读区域选中要分析的句子或段落
3. 点击 **🤖 AI分析** 按钮
4. AI只分析选中部分

---

## 📖 使用示例

### 示例句子
```
The book that I read yesterday was very interesting.
```

### AI自动标注结果

**The book** `{that}` **I** **read** `[yesterday]` **was** **very interesting**.

- `The book` - 主要主语（黑色加粗）
- `{that}` - 从句引导词（粉色 + 花括号）
- `I` - 从句主语（绿色加粗）
- `read` - 从句谓语（深红色加粗）
- `[yesterday]` - 状语（蓝色 + 方括号）
- `was` - 主要谓语（红色加粗）
- `very interesting` - 表语（橙色）

---

## 💡 使用技巧

### 1. 选择合适的模型

**简单文章**（日常对话、新闻）
- 推荐：GPT-3.5 Turbo 或 Claude 3 Haiku
- 速度快，成本低

**复杂文章**（学术论文、长难句）
- 推荐：GPT-4 或 Claude 3 Sonnet
- 准确度高，理解更深入

### 2. 分段分析

对于很长的文章：
1. 勾选"仅分析选中文本"
2. 选中一段文字进行分析
3. 逐段分析，避免token超限

### 3. 检查和修正

AI标注可能不完全准确：
- 可以手动编辑AI生成的标注
- 点击标注项右侧的"编辑"按钮修改
- 也可以手动添加遗漏的标注

### 4. 结合手动标注

- 先用AI快速标注基本语法结构
- 再手动标注生词、词组等学习内容
- 形成完整的学习笔记

---

## 🔧 支持的API接口

### OpenAI官方API
```
端点: https://api.openai.com/v1/chat/completions
模型: gpt-4, gpt-3.5-turbo
```

### Azure OpenAI
```
端点: https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-02-15-preview
头部: api-key: YOUR_KEY（需在代码中修改Authorization头）
```

### Claude API (Anthropic)
```
端点: https://api.anthropic.com/v1/messages
模型: claude-3-sonnet-20240229, claude-3-haiku-20240307
注意: 需要修改请求格式（Anthropic格式与OpenAI不同）
```

### 兼容OpenAI格式的第三方API
- 国内API中转服务
- 本地部署的LLM（如llama.cpp、Ollama）
- 只要接口格式兼容OpenAI ChatCompletion格式即可

---

## ⚠️ 注意事项

### 1. API费用
- AI分析会调用API，产生费用
- GPT-3.5 Turbo约为 $0.001-0.002 / 1000 tokens
- GPT-4约为 $0.03 / 1000 tokens
- 建议设置API账户的使用限额

### 2. 网络连接
- 需要能够访问API端点
- 国内用户访问OpenAI可能需要代理
- 可使用国内API中转服务

### 3. 文本长度限制
- GPT-3.5 Turbo: 最多约16k tokens（约12000字）
- GPT-4: 最多约128k tokens（约96000字）
- 超长文本请分段分析

### 4. 准确率
- AI分析准确率约85-95%
- 复杂长难句可能出现错误
- 建议人工检查和修正

### 5. 隐私安全
- API密钥仅保存在浏览器本地
- 文本会发送到AI服务商进行分析
- 不要分析包含敏感信息的文本

---

## 🔍 故障排除

### 问题1: 提示"请先配置AI API密钥"
**解决**: 点击"🤖 AI"按钮，输入有效的API密钥并保存

### 问题2: 提示"API请求失败 (401)"
**原因**: API密钥无效或已过期
**解决**: 检查API密钥是否正确，是否有足额

### 问题3: 提示"API请求失败 (429)"
**原因**: API调用频率超限或配额用尽
**解决**:
- 等待几分钟后重试
- 检查API账户余额
- 降低调用频率

### 问题4: 提示"网络错误"或无响应
**原因**: 无法连接到API端点
**解决**:
- 检查网络连接
- 检查API端点URL是否正确
- 如访问OpenAI，可能需要代理
- 尝试使用国内中转API

### 问题5: AI返回格式错误
**原因**: AI未按JSON格式返回
**解决**:
- 重试分析
- 尝试更换模型（如GPT-3.5换成GPT-4）
- 简化待分析文本

### 问题6: 标注位置不准确
**原因**: 文本匹配偏差
**解决**:
- 手动调整标注
- 清除重复标注
- 重新分析

---

## 🎓 学习工作流推荐

### 📖 精读工作流

1. **第一遍：AI快速标注语法**
   - 点击"🤖 AI分析"自动标注所有语法成分
   - 快速了解句子结构

2. **第二遍：手动标注学习要点**
   - 标注生词、词组
   - 添加翻译和笔记
   - 添加标签分类

3. **第三遍：复习和导出**
   - 使用键盘导航（↑↓）逐个复习标注
   - 查看统计面板了解学习进度
   - 导出Markdown保存笔记

### 📚 长难句分析流程

1. **选中长难句**
   - 勾选"仅分析选中文本"
   - 选中要分析的句子

2. **AI自动拆分句子成分**
   - 点击"🤖 AI分析"
   - 查看主句、从句结构

3. **理解句子结构**
   - 主句：主语（黑）+ 谓语（红）+ 宾语（橙）
   - 从句：引导词（粉）+ 从句主语（绿）+ 从句谓语（深红）
   - 修饰：定语（紫括号）+ 状语（蓝方括号）

4. **手动翻译和笔记**
   - 添加整句翻译
   - 记录理解难点

---

## 📊 AI分析原理

### System Prompt（系统提示词）

AI使用以下提示词进行分析：

```
你是一个英语语法分析专家。请分析以下英文文本的句子成分，并以JSON格式返回结果。

对每个需要标注的词或短语，返回以下信息：
- text: 原文文本
- category: 语法类别（mainSubject/clauseSubject/mainVerb等）
- start: 文本在原文中的起始位置（字符索引）
- end: 文本在原文中的结束位置（字符索引）

返回格式：JSON
```

### 返回格式示例

```json
{
  "annotations": [
    {
      "text": "The book",
      "category": "mainSubject",
      "start": 0,
      "end": 8
    },
    {
      "text": "that",
      "category": "clauseMarker",
      "start": 9,
      "end": 13
    },
    {
      "text": "I",
      "category": "clauseSubject",
      "start": 14,
      "end": 15
    }
  ]
}
```

---

## 🔄 版本历史

### v3.1 (2025-10-02)
- ✅ 新增AI自动语法标注功能
- ✅ 支持OpenAI、Claude等兼容API
- ✅ 支持全文分析和选中文本分析
- ✅ 自动应用9种语法标注（主语、谓语、宾语、定语、状语等）
- ✅ 完整的AI设置界面（API配置、模型选择）

---

## 📞 技术支持

### 获取API密钥

**OpenAI**
1. 访问 https://platform.openai.com/
2. 注册账号并登录
3. 进入 API Keys 页面
4. 创建新密钥

**Anthropic (Claude)**
1. 访问 https://console.anthropic.com/
2. 注册并申请API访问
3. 获取API密钥

### 社区资源
- GitHub Issues: 报告bug或建议新功能
- 讨论区: 分享使用经验和技巧

---

**使用AI自动语法分析，轻松理解英语长难句！** 🚀✨
