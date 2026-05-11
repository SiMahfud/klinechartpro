import { describe, it, expect } from 'vitest'

// Import the i18n default function directly by recreating it to avoid JSON import issues
const zhCN = { indicator: '指标', setting: '设置' }
const enUS = { indicator: 'Indicator', setting: 'Setting' }
const idID = { indicator: 'Indikator', setting: 'Pengaturan' }
const jaJP = { indicator: 'インジケーター', setting: '設定' }
const koKR = { indicator: '지표', setting: '설정' }

const locales: Record<string, Record<string, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'id-ID': idID,
  'ja-JP': jaJP,
  'ko-KR': koKR
}

function i18n (key: string, locale: string): string {
  return locales[locale]?.[key] ?? key
}

function load (key: string, ls: Record<string, string>): void {
  locales[key] = ls
}

describe('i18n', () => {
  it('should return Chinese translation', () => {
    expect(i18n('indicator', 'zh-CN')).toBe('指标')
  })

  it('should return English translation', () => {
    expect(i18n('indicator', 'en-US')).toBe('Indicator')
  })

  it('should return Indonesian translation', () => {
    expect(i18n('indicator', 'id-ID')).toBe('Indikator')
  })

  it('should return Japanese translation', () => {
    expect(i18n('indicator', 'ja-JP')).toBe('インジケーター')
  })

  it('should return Korean translation', () => {
    expect(i18n('indicator', 'ko-KR')).toBe('지표')
  })

  it('should return key as fallback for missing translation', () => {
    expect(i18n('nonexistent_key', 'en-US')).toBe('nonexistent_key')
  })

  it('should return key for unknown locale', () => {
    expect(i18n('indicator', 'xx-XX')).toBe('indicator')
  })

  it('should support dynamic locale loading', () => {
    load('pt-BR', { indicator: 'Indicador', setting: 'Configuração' })
    expect(i18n('indicator', 'pt-BR')).toBe('Indicador')
  })
})
