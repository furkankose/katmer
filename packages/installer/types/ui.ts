import { Type } from "typebox"

export const UIConfigSchema = Type.Object(
  {
    appLogo: Type.Optional(Type.String()),
    appTitle: Type.Optional(Type.String()),
    landing: Type.Optional(
      Type.Object(
        {
          title: Type.Optional(Type.String()),
          description: Type.Optional(Type.String())
        },
        { additionalProperties: false }
      )
    ),
    hideSteps: Type.Optional(Type.Boolean()),
    hideSummary: Type.Optional(Type.Boolean()),
    stepsLayout: Type.Optional(
      Type.Union(
        [
          Type.Literal("vertical"),
          Type.Literal("simple"),
          Type.Literal("horizontal")
        ],
        { default: "vertical" }
      )
    )
  },
  {
    default: {},
    additionalProperties: false
  }
)
