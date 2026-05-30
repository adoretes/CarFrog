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
  character_book: WorldBook
  extensions: Record<string, unknown>
}

export interface CharaCardV2 {
  spec: 'chara_card_v2'
  spec_version: '2.0'
  data: CharaCardData
}

export type CharaCard = CharaCardV2

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
      character_book: {
        name: null,
        entries: [],
        extensions: {},
      },
      extensions: {
        talkativeness: '0.5',
        fav: false,
        world: '',
        depth_prompt: {
          prompt: '',
          depth: 4,
          role: 'system',
        },
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
