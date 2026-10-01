import { describe, expect, it } from "vitest"
import {
  criteriaToWire,
  defaultValueForOperator,
  emptyGroup,
  emptyRule,
  wireToCriteria,
  type SmartPlaylistCriteria,
} from "./criteria"

describe("criteriaToWire / wireToCriteria", () => {
  it("round-trips a nested all/any tree with sort, order, and limit", () => {
    const criteria: SmartPlaylistCriteria = {
      root: {
        kind: "group",
        combinator: "all",
        rules: [
          { kind: "rule", field: "genre", operator: "is", value: "Rock" },
          {
            kind: "group",
            combinator: "any",
            rules: [
              { kind: "rule", field: "artist", operator: "contains", value: "Beatles" },
              { kind: "rule", field: "year", operator: "gt", value: 1970 },
            ],
          },
        ],
      },
      sort: "year",
      order: "desc",
      limit: 50,
    }

    expect(wireToCriteria(criteriaToWire(criteria))).toEqual(criteria)
  })

  it("matches the wire shape model/criteria expects: {operator: {field: value}}", () => {
    const criteria: SmartPlaylistCriteria = {
      root: emptyGroup("all"),
      sort: undefined,
      order: undefined,
      limit: undefined,
    }
    criteria.root.rules.push({ kind: "rule", field: "loved", operator: "is", value: true })

    expect(criteriaToWire(criteria)).toEqual({
      all: [{ is: { loved: true } }],
    })
  })

  it("omits sort/order/limit from the wire format when unset", () => {
    const wire = criteriaToWire({ root: emptyGroup("any") })
    expect(wire).toEqual({ any: [] })
  })

  it("round-trips a bare rule wrapped in the implicit root group", () => {
    const wire = { all: [{ isMissing: { comment: true } }] }
    const criteria = wireToCriteria(wire)
    expect(criteria.root).toEqual({
      kind: "group",
      combinator: "all",
      rules: [{ kind: "rule", field: "comment", operator: "isMissing", value: true }],
    })
  })
})

describe("emptyRule / defaultValueForOperator", () => {
  it("defaults inTheRange to a zero pair", () => {
    expect(defaultValueForOperator("inTheRange")).toEqual([0, 0])
  })

  it("defaults isMissing/isPresent to true", () => {
    expect(defaultValueForOperator("isMissing")).toBe(true)
    expect(defaultValueForOperator("isPresent")).toBe(true)
  })

  it("defaults everything else to an empty string", () => {
    expect(defaultValueForOperator("contains")).toBe("")
    expect(defaultValueForOperator("gt")).toBe("")
  })

  it("builds a leaf rule using the operator's default value", () => {
    expect(emptyRule("title", "startsWith")).toEqual({
      kind: "rule",
      field: "title",
      operator: "startsWith",
      value: "",
    })
  })
})
