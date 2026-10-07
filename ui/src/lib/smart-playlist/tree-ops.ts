import type { RuleGroup, RuleNode } from "./criteria"

// Immutable tree edits addressed by a path of child indices from the root
// group — the rule tree nests arbitrarily (groups within groups), so a
// flat array of rules wouldn't do.
export type Path = number[]

export function updateAtPath(
  root: RuleGroup,
  path: Path,
  updater: (node: RuleNode) => RuleNode,
): RuleGroup {
  if (path.length === 0) {
    return updater(root) as RuleGroup
  }
  const [index, ...rest] = path
  const rules = root.rules.map((child, i) => {
    if (i !== index) return child
    if (rest.length === 0) return updater(child)
    if (child.kind !== "group") {
      throw new Error("invalid path: expected a group")
    }
    return updateAtPath(child, rest, updater)
  })
  return { ...root, rules }
}

export function addAtPath(
  root: RuleGroup,
  path: Path,
  node: RuleNode,
): RuleGroup {
  return updateAtPath(root, path, (target) => {
    if (target.kind !== "group") {
      throw new Error("invalid path: expected a group")
    }
    return { ...target, rules: [...target.rules, node] }
  })
}

export function removeAtPath(root: RuleGroup, path: Path): RuleGroup {
  if (path.length === 0) {
    throw new Error("cannot remove the root group")
  }
  const parentPath = path.slice(0, -1)
  const index = path[path.length - 1]
  return updateAtPath(root, parentPath, (node) => {
    if (node.kind !== "group") {
      throw new Error("invalid path: expected a group")
    }
    return { ...node, rules: node.rules.filter((_, i) => i !== index) }
  })
}
