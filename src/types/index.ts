import * as z from "zod"


export const characterBookEntrySchema = z.object({
  comment: z.string().default(""),
  content: z.string(),
  enabled: z.boolean().default(true),
  position: z.coerce.string().optional(),
  insertion_order: z.number().optional()
})

export const characterLorebookSchema = z.object({
  name: z.string().optional(),
  entries: z.array(characterBookEntrySchema)
})

export const characterCardSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().default(""),
  personality: z.string().default(""),
  scenario: z.string().default(""),
  first_mes: z.string().default(""),
  data: z.object({
    alternate_greetings: z.array(z.string()).default([]),
    character_book: characterLorebookSchema.nullable().optional(),
  })
})

export type CharacterCard = z.infer<typeof characterCardSchema>


const promptOrderEntrySchema = z.object({
  identifier: z.string().trim().min(1),
  enabled: z.boolean()
})

const promptOrderGroupSchema = z.object({
  order: z.array(promptOrderEntrySchema)
})

const promptEntrySchema = z.object({
  identifier: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  role: z.string(),
  content: z.string().optional()
})

export const presetFileSchema = z.object({
  prompts: z.array(promptEntrySchema),
  prompt_order: z.array(promptOrderGroupSchema),
})
