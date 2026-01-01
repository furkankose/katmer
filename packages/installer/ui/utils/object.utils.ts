import deepmerger from "@fastify/deepmerge"

const deepMerge = deepmerger({
  all: true,
  mergeArray: (options) => (target, source) => {
    return [...source]
  }
})

export { deepMerge }
