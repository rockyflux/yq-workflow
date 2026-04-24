---
layout: home

hero:
  name: 'YQ-workflow'
  text: 'AI编程工作流工具包'
  tagline: '安装命令包、提示词、技能和规则，保持实现透明，不依赖多模型路由或黑盒包装。'
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
    title: '单模型，路径更直'
    details: '以 Claude Code 为核心，不再依赖 codeagent-wrapper、多模型路由或额外编排层，心智负担更小。'
  - icon: '2'
    title: '命令、提示词、技能一起装'
    details: '会把 `/yq:*` 命令文件、Claude 提示词、规则和技能安装到标准目录，并同步镜像到 `~/.agents/skills/`。'
  - icon: '3'
    title: '保留结构化交付能力'
    details: '支持 `plan / execute / workflow / spec-* / team-*` 等工作流，让需求澄清、计划、实施、验证和交付保持连贯。'
  - icon: '4'
    title: 'MCP 分类清晰'
    details: '按必装工具、数据库、Git/版本控制、文件/资源四类配置 MCP，避免历史版本里杂乱的入口设计。'
  - icon: '5'
    title: '主菜单覆盖常用运维'
    details: '除了安装和更新工作流，也能在主菜单里配置 API、MCP、输出风格，以及检查 Claude Code、Codex、CCR、CCometixLine 更新。'
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
