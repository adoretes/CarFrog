export interface WorldBookEntry {
  keys: string[]
  keysecondary?: string[]
  content: string
  comment?: string
  constant?: boolean
  selective?: boolean
  selectiveLogic?: number
  order?: number
  position?: string | number
  depth?: number
  sticky?: number
  cooldown?: number
  delay?: number
  enabled?: boolean
  name?: string
  id?: number
  extensions?: Record<string, unknown>
}

export interface WorldBook {
  name?: string | null
  entries: WorldBookEntry[]
  extensions?: Record<string, unknown>
}

/** V3 的 assets 条目；本工具不消费它，但导入导出时原样保留 */
export interface CharaAsset {
  type: string
  uri: string
  name: string
  ext: string
  [key: string]: unknown
}

export interface CharaCardData {
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string
  creator_notes: string
  system_prompt: string
  post_history_instructions: string
  alternate_greetings: string[]
  tags: string[]
  creator: string
  character_version: string
  character_book?: WorldBook

  /** V2 就存在的扩展槽，V3 也在用 */
  extensions?: Record<string, unknown>

  // ---- V3 独有字段 ----
  // 本工具不提供编辑入口，但导入/导出必须原样保留，
  // 否则「导入 V3 卡再导出」会静默丢掉这些数据。
  nickname?: string
  creator_notes_multilingual?: Record<string, string>
  source?: string[]
  group_only_greetings?: string[]
  creation_date?: number
  modification_date?: number
  assets?: CharaAsset[]
}

export type CardSpec = 'chara_card_v2' | 'chara_card_v3'

export interface CharaCardV2 {
  spec: CardSpec
  spec_version: string
  data: CharaCardData
}

export type CharaCard = CharaCardV2

export function isV3Card(card: CharaCard): boolean {
  return card.spec === 'chara_card_v3'
}

export function createEmptyCharaCard(): CharaCard {
  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: '',
      description: '',
      personality: '',
      scenario: '',
      first_mes: '',
      mes_example: '',
      creator_notes: '',
      system_prompt: '',
      post_history_instructions: '',
      alternate_greetings: [],
      tags: [],
      creator: '',
      character_version: '1.0',
      character_book: {
        name: null,
        entries: [],
        extensions: {},
      },
    },
  }
}

export function createDefaultWorldBookEntry(overrides?: Partial<WorldBookEntry>): WorldBookEntry {
  return {
    keys: [],
    keysecondary: [],
    content: '',
    comment: '',
    constant: false,
    selective: true,
    selectiveLogic: 0,
    order: 100,
    position: 'before_char',
    depth: 4,
    sticky: 0,
    cooldown: 0,
    delay: 0,
    enabled: true,
    extensions: {},
    ...overrides,
  }
}
