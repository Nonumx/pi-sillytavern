import * as z from "zod"


export const characterBookEntrySchema = z.object({
  comment: z.string(),
  content: z.string(),
  enabled: z.boolean(),
  position: z.coerce.string(),
  insertion_order: z.number()
})

export const characterLorebookSchema = z.object({
  name: z.string(),
  entries: z.array(characterBookEntrySchema)
})

export const characterCardSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string(),
  personality: z.string(),
  first_mes: z.string(),
  data: z.object({
    alternate_greetings: z.array(z.string()),
    character_book: characterLorebookSchema.nullable().optional(),
  })
})


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
