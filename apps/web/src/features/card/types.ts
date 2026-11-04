export interface RegexScript {
  scriptName: string
  disabled: boolean
  findRegex: string
  replaceString: string
  markdownOnly: boolean
  promptOnly: boolean
}

export interface CharacterCard {
  id: string
  imageUrl: string
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  data: {
    alternate_greetings: string[]
    character_book?: {
      name?: string
      entries: Array<{
        comment: string
        content: string
        enabled: boolean
        constant: boolean
      }>
    } | null
    extensions?: {
      regex_scripts: RegexScript[]
    }
  }
}
