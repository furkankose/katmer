import { Type, type Static } from "typebox"
import { StepHooksConfigSchema } from "./hooks"

/**
 * FormKitSchemaDefinition comes from @formkit/core and is not JSON-Schema based.
 * We treat it as unknown for schema purposes.
 */
export const FormKitSchemaDefinitionSchema = Type.Any({
  description: "FormKit schema definition (opaque to JSON Schema)."
})
export type FormKitSchemaDefinition = Static<
  typeof FormKitSchemaDefinitionSchema
>

export const StepConfigSchema = Type.Object(
  {
    /**
     * Unique step key (can be a translation key).
     * Example: "steps.domain"
     */
    name: Type.String(),
    label: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    icon: Type.Optional(Type.String()),
    form: Type.Optional(
      Type.Object(
        {
          defaults: Type.Optional(Type.Record(Type.String(), Type.Any())),
          schema: FormKitSchemaDefinitionSchema
        },
        { additionalProperties: false }
      )
    ),
    hooks: Type.Optional(StepHooksConfigSchema)
  },
  { additionalProperties: false }
)
export type StepConfig = Static<typeof StepConfigSchema>

export const FormConfigSchema = Type.Object(
  {
    steps: Type.Array(StepConfigSchema)
  },
  { additionalProperties: false }
)
export type FormConfig = Static<typeof FormConfigSchema>
