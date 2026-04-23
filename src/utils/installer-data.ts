import type { WorkflowConfig } from '../types'

type CommandCategory = 'development' | 'init' | 'git' | 'spec'

function cmd(
  id: string,
  order: number,
  category: CommandCategory,
  name: string,
  nameEn: string,
  description: string,
  descriptionEn: string,
  cmdOverride?: string,
): WorkflowConfig {
  return {
    id,
    name,
    nameEn,
    category,
    commands: [cmdOverride ?? id],
    defaultSelected: true,
    order,
    description,
    descriptionEn,
  }
}

const WORKFLOW_CONFIGS: WorkflowConfig[] = [
  cmd('workflow', 1, 'development', '完整开发工作流', 'Full Development Workflow', '单模型开发工作流：需求澄清、计划、实施、验证、交付', 'Single-model workflow for clarify, plan, implement, verify, deliver'),
  cmd('plan', 1.5, 'development', '实施规划', 'Implementation Planning', '整理上下文并生成可执行实施计划', 'Gather context and create an executable implementation plan'),
  cmd('execute', 1.6, 'development', '按计划执行', 'Execute Plan', '依据现有计划逐步实施并同步验证', 'Implement step-by-step against an existing plan with verification'),
  cmd('team', 1.75, 'development', '团队执行工作流', 'Team Workflow', '面向多人协作的结构化交付工作流', 'Structured workflow for team-oriented delivery'),
  cmd('team-research', 1.8, 'development', '团队需求研究', 'Team Research', '梳理需求、约束和成功标准', 'Clarify requirements, constraints, and success criteria'),
  cmd('team-plan', 1.85, 'development', '团队规划', 'Team Planning', '拆解任务边界并生成协作计划', 'Break work into clear boundaries and generate a collaboration plan'),
  cmd('team-exec', 1.9, 'development', '团队实施', 'Team Execution', '根据计划推进并记录分工与验证', 'Drive implementation from the plan with ownership and verification'),
  cmd('team-review', 1.95, 'development', '团队审查', 'Team Review', '汇总发现、风险与修复建议', 'Summarize findings, risks, and fix guidance'),
  cmd('frontend', 2, 'development', '前端专项', 'Frontend Tasks', '前端任务处理：需求、实现、验证、交付', 'Frontend task flow covering intent, implementation, verification, and delivery'),
  cmd('codex-exec', 2.5, 'development', '执行计划', 'Plan Executor', '读取计划文件并在当前会话落实实现', 'Read a plan file and execute it in the current session'),
  cmd('context', 2.6, 'development', '项目上下文管理', 'Project Context Manager', '维护项目上下文、决策记录与历史整理', 'Maintain project context, decisions, and history'),
  cmd('backend', 3, 'development', '后端专项', 'Backend Tasks', '后端任务处理：需求、实现、验证、交付', 'Backend task flow covering intent, implementation, verification, and delivery'),
  cmd('feat', 4, 'development', '功能开发', 'Feature Development', '功能开发：明确边界后完成实现与验证', 'Feature development with clear scope, implementation, and verification'),
  cmd('analyze', 5, 'development', '技术分析', 'Technical Analysis', '只读分析代码、架构与风险', 'Read-only analysis of code, architecture, and risks'),
  cmd('debug', 6, 'development', '问题诊断', 'Debug', '复现问题、定位根因并完成修复', 'Reproduce issues, find root cause, and fix safely'),
  cmd('optimize', 7, 'development', '性能优化', 'Performance Optimization', '定位瓶颈、设计优化方案并验证收益', 'Find bottlenecks, optimize, and verify gains'),
  cmd('test', 8, 'development', '测试生成', 'Test Generation', '补齐关键路径、边界条件与回归测试', 'Add coverage for key paths, edge cases, and regressions'),
  cmd('review', 9, 'development', '代码审查', 'Code Review', '审查变更的正确性、风险与测试缺口', 'Review changes for correctness, risk, and testing gaps'),
  cmd('enhance', 9.5, 'development', '需求增强', 'Prompt Enhancement', '把模糊需求整理成结构化任务说明', 'Turn vague requests into structured task descriptions'),
  cmd('init-project', 10, 'init', '项目初始化', 'Project Init', '初始化项目 AI 上下文，生成 CLAUDE.md', 'Initialize project AI context and generate CLAUDE.md', 'init'),
  cmd('commit', 20, 'git', 'Git 提交', 'Git Commit', '智能生成 conventional commit 信息', 'Generate conventional commit messages'),
  cmd('rollback', 21, 'git', 'Git 回滚', 'Git Rollback', '交互式回滚分支到历史版本', 'Interactively roll back to a historical revision'),
  cmd('clean-branches', 22, 'git', 'Git 清理分支', 'Git Clean Branches', '安全清理已合并或过期分支', 'Safely clean merged or stale branches'),
  cmd('worktree', 23, 'git', 'Git Worktree', 'Git Worktree', '管理 Git worktree', 'Manage Git worktrees'),
  cmd('spec-init', 30, 'spec', 'OpenSpec 初始化', 'OpenSpec Init', '初始化 OpenSpec 环境并检查规范目录', 'Initialize OpenSpec and validate spec directories'),
  cmd('spec-research', 31, 'spec', '需求研究', 'Spec Research', '从需求提炼约束、范围和验收标准', 'Turn requirements into constraints, scope, and acceptance criteria'),
  cmd('spec-plan', 32, 'spec', '规范规划', 'Spec Plan', '根据规范生成实施计划', 'Generate an implementation plan from the spec'),
  cmd('spec-impl', 33, 'spec', '规范驱动实现', 'Spec Implementation', '按规范执行实现并同步验证', 'Implement against the spec with continuous verification'),
  cmd('spec-review', 34, 'spec', '归档前审查', 'Spec Review', '归档前检查规范一致性与剩余风险', 'Check spec alignment and residual risk before archiving'),
]

export function getWorkflowConfigs(): WorkflowConfig[] {
  return WORKFLOW_CONFIGS.sort((a, b) => a.order - b.order)
}

export function getWorkflowById(id: string): WorkflowConfig | undefined {
  return WORKFLOW_CONFIGS.find(w => w.id === id)
}

export function getAllCommandIds(): string[] {
  return WORKFLOW_CONFIGS.map(w => w.id)
}

export const WORKFLOW_PRESETS = {
  full: {
    name: '完整',
    nameEn: 'Full',
    description: `全部命令（${WORKFLOW_CONFIGS.length}个）`,
    descriptionEn: `All commands (${WORKFLOW_CONFIGS.length})`,
    workflows: WORKFLOW_CONFIGS.map(w => w.id),
  },
}

export type WorkflowPreset = keyof typeof WORKFLOW_PRESETS

export function getWorkflowPreset(preset: WorkflowPreset): string[] {
  return [...WORKFLOW_PRESETS[preset].workflows]
}
