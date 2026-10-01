import { describe, expect, it } from "vitest"
import { addAtPath, removeAtPath, updateAtPath } from "./tree-ops"
import { emptyGroup, type RuleGroup, type RuleLeaf } from "./criteria"

function rule(field: string): RuleLeaf {
  return { kind: "rule", field, operator: "is", value: "x" }
}

describe("addAtPath", () => {
  it("appends a node to the root group", () => {
    const root = emptyGroup("all")
    const result = addAtPath(root, [], rule("genre"))
    expect(result.rules).toEqual([rule("genre")])
    // Original is untouched — the tree is updated immutably.
    expect(root.rules).toEqual([])
  })

  it("appends a node to a nested group by path", () => {
    const nested: RuleGroup = {
      kind: "group",
      combinator: "all",
      rules: [{ kind: "group", combinator: "any", rules: [rule("a")] }],
    }
    const result = addAtPath(nested, [0], rule("b"))
    expect(result.rules[0]).toEqual({
      kind: "group",
      combinator: "any",
      rules: [rule("a"), rule("b")],
    })
  })
})

describe("updateAtPath", () => {
  it("replaces the node at the given path", () => {
    const root: RuleGroup = { kind: "group", combinator: "all", rules: [rule("a")] }
    const result = updateAtPath(root, [0], () => rule("b"))
    expect(result.rules).toEqual([rule("b")])
  })

  it("updates the root group itself when path is empty", () => {
    const root = emptyGroup("all")
    const result = updateAtPath(root, [], (node) => ({ ...node, combinator: "any" }) as RuleGroup)
    expect(result.combinator).toBe("any")
  })

  it("updates a deeply nested node without disturbing siblings", () => {
    const root: RuleGroup = {
      kind: "group",
      combinator: "all",
      rules: [
        rule("keep-me"),
        { kind: "group", combinator: "any", rules: [rule("a"), rule("b")] },
      ],
    }
    const result = updateAtPath(root, [1, 1], () => rule("changed"))
    expect(result.rules[0]).toEqual(rule("keep-me"))
    expect((result.rules[1] as RuleGroup).rules).toEqual([rule("a"), rule("changed")])
  })
})

describe("removeAtPath", () => {
  it("removes a top-level rule", () => {
    const root: RuleGroup = {
      kind: "group",
      combinator: "all",
      rules: [rule("a"), rule("b")],
    }
    const result = removeAtPath(root, [1])
    expect(result.rules).toEqual([rule("a")])
  })

  it("removes a rule from within a nested group", () => {
    const root: RuleGroup = {
      kind: "group",
      combinator: "all",
      rules: [{ kind: "group", combinator: "any", rules: [rule("a"), rule("b")] }],
    }
    const result = removeAtPath(root, [0, 0])
    expect((result.rules[0] as RuleGroup).rules).toEqual([rule("b")])
  })
})
