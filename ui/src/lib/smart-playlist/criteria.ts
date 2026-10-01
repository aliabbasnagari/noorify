// Wire format for model/criteria.Criteria (Go), confirmed against
// model/criteria/criteria_test.go's canonical example — NOT a port of any
// existing UI, old-ui has no smart-playlist editor at all. A rule is a
// single-key object `{ operator: { field: value } }`; a group is
// `{ all: [...] }` or `{ any: [...] }`, and groups nest arbitrarily. The
// top-level Criteria is a group plus sort/order/limit/offset siblings at
// the same object level.

export type RuleOperator =
  | "is"
  | "isNot"
  | "gt"
  | "lt"
  | "contains"
  | "notContains"
  | "startsWith"
  | "endsWith"
  | "inTheRange"
  | "before"
  | "after"
  | "inTheLast"
  | "notInTheLast"
  | "isMissing"
  | "isPresent"

export type RuleValue = string | number | boolean | [number, number]

export interface RuleLeaf {
  kind: "rule"
  field: string
  operator: RuleOperator
  value: RuleValue
}

export interface RuleGroup {
  kind: "group"
  combinator: "all" | "any"
  rules: RuleNode[]
}

export type RuleNode = RuleLeaf | RuleGroup

export interface SmartPlaylistCriteria {
  root: RuleGroup
  sort?: string
  order?: "asc" | "desc"
  limit?: number
}

type WireRule = Record<string, unknown>

function ruleToWire(node: RuleNode): WireRule {
  if (node.kind === "group") {
    return { [node.combinator]: node.rules.map(ruleToWire) }
  }
  return { [node.operator]: { [node.field]: node.value } }
}

function wireToRule(wire: WireRule): RuleNode {
  const key = Object.keys(wire)[0]
  if (key === "all" || key === "any") {
    return {
      kind: "group",
      combinator: key,
      rules: (wire[key] as WireRule[]).map(wireToRule),
    }
  }
  const valueObj = wire[key] as Record<string, unknown>
  const field = Object.keys(valueObj)[0]
  return {
    kind: "rule",
    field,
    operator: key as RuleOperator,
    value: valueObj[field] as RuleValue,
  }
}

export function criteriaToWire(criteria: SmartPlaylistCriteria): Record<string, unknown> {
  return {
    ...ruleToWire(criteria.root),
    ...(criteria.sort ? { sort: criteria.sort } : {}),
    ...(criteria.order ? { order: criteria.order } : {}),
    ...(criteria.limit ? { limit: criteria.limit } : {}),
  }
}

export function wireToCriteria(wire: Record<string, unknown>): SmartPlaylistCriteria {
  const { sort, order, limit, ...rest } = wire
  return {
    root: wireToRule(rest) as RuleGroup,
    sort: typeof sort === "string" ? sort : undefined,
    order: order === "asc" || order === "desc" ? order : undefined,
    limit: typeof limit === "number" ? limit : undefined,
  }
}

export function emptyGroup(combinator: "all" | "any" = "all"): RuleGroup {
  return { kind: "group", combinator, rules: [] }
}

export function defaultValueForOperator(operator: RuleOperator): RuleValue {
  if (operator === "inTheRange") return [0, 0]
  if (operator === "isMissing" || operator === "isPresent") return true
  return ""
}

export function emptyRule(field: string, operator: RuleOperator): RuleLeaf {
  return { kind: "rule", field, operator, value: defaultValueForOperator(operator) }
}
