# CarFrog 🐸

**SillyTavern 角色卡生成器** — 基于 React + TypeScript + Vite 的 Web 工具，用于创建、编辑和导出 SillyTavern V2 角色卡。

## 功能

- **角色卡编辑** — 编辑名称、描述、性格、场景、开场白、示例对话等
- **世界书编辑器** — 嵌入 Lorebook / World Info 条目
- **对话预览** — 与角色进行模拟对话，测试角色表现
- **PNG 导出** — 将角色数据嵌入 PNG（符合 SillyTavern PNG 元数据规范）
- **JSON 导入/导出** — 支持纯 JSON 文件导入导出
- **AI 对话** — 可选接入 AI 接口进行对话生成

## 技术栈

| 工具 | 用途 |
|------|------|
| React 19 | UI 框架 |
| TypeScript | 类型检查 |
| Vite 6 | 构建工具 |
| Tailwind CSS 3 | 样式 |
| Zustand 5 | 状态管理 |
| react-markdown | Markdown 渲染 |

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```

构建产物输出到 `dist/` 目录。

## 部署

推送到 `main` 分支会自动触发 GitHub Actions 构建并部署到 GitHub Pages。
