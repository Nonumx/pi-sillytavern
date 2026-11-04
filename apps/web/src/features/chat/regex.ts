import type { RegexScript } from '@/features/card/types'

export type RegexTarget = 'markdown' | 'prompt'

function appliesTo(script: RegexScript, target: RegexTarget): boolean {
  if (target === 'markdown') return script.markdownOnly || !script.promptOnly
  return script.promptOnly || !script.markdownOnly
}

function compileRegex(source: string): RegExp {
  if (source.startsWith('/')) {
    const lastSlash = source.lastIndexOf('/')
    if (lastSlash > 0) {
      return new RegExp(source.slice(1, lastSlash), source.slice(lastSlash + 1))
    }
  }
  return new RegExp(source)
}

export function applyRegexScripts(
  content: string,
  scripts: RegexScript[],
  target: RegexTarget,
): string {
  let result = content

  for (const script of scripts) {
    if (script.disabled || !appliesTo(script, target)) continue
    try {
      result = result.replace(compileRegex(script.findRegex), script.replaceString)
    } catch (error) {
      console.warn(`正则脚本“${script.scriptName}”执行失败`, error)
    }
  }

  return result
}
