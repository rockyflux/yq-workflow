---
layout: home

hero:
  name: 'YQ-workflow'
  text: 'AI编程工具助手'
  tagline: '安装命令包、提示词、技能、规则和常用工具入口，保持实现透明，不依赖黑盒包装。'
  image:
    src: /logo.svg
    alt: YQ
  actions:
    - theme: brand
      text: '三分钟上手'
      link: /guide/getting-started
    - theme: alt
      text: '查看命令'
      link: /guide/commands
    - theme: alt
      text: '查看技能'
      link: /guide/skills
    - theme: alt
      text: 'GitHub'
      link: http://172.16.68.178:8090/vb-coding/yq-workflow

features:
  - icon: '1'
    title: '工具定位更清晰'
    details: 'YQ 自身定位为 AI 编程工具助手，Claude Code、Codex 等只是下层可接入的具体工具，心智模型更清楚。'
  - icon: '2'
    title: '命令、提示词、技能一起装'
    details: '会把 `/yq:*` 命令文件、Claude 提示词、规则和技能安装到标准目录，并同步镜像到 `~/.agents/skills/` 与 `~/.kiro/skills/`。'
  - icon: '3'
    title: '保留结构化交付能力'
    details: '支持 `plan / execute / workflow / spec-* / team-*` 等工作流，让需求澄清、计划、实施、验证和交付保持连贯。'
  - icon: '4'
    title: 'MCP 分类清晰'
    details: '按必装工具、数据库、Git/版本控制、文件/资源四类配置 MCP，避免历史版本里杂乱的入口设计。'
  - icon: '5'
    title: '主菜单覆盖常用运维'
    details: '除了安装和更新工作流，也能在主菜单里打开 API 配置工具下载页、配置 MCP、输出风格，以及统一管理 Claude Code、Codex、Gemini CLI、OpenCode、CCR、CCometixLine。'
  - icon: '6'
    title: '跨平台即装即用'
    details: '`npx yq-workflow` 即可启动，支持 macOS、Linux、Windows，默认中文界面。'
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #0f766e 20%, #f59e0b 90%);
  --vp-home-hero-image-background-image: linear-gradient(-45deg, #0f766e33 50%, #f59e0b33 50%);
  --vp-home-hero-image-filter: blur(44px);
}

@media (min-width: 640px) {
  :root {
    --vp-home-hero-image-filter: blur(56px);
  }
}

@media (min-width: 960px) {
  :root {
    --vp-home-hero-image-filter: blur(68px);
  }
}
</style>
