import { useState } from "react"
import { describe, expect, it } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SmartPlaylistRuleEditor } from "./rule-editor"
import { emptyGroup, type RuleGroup } from "@/lib/smart-playlist/criteria"
import { FIELDS } from "@/lib/smart-playlist/fields"

// A stateful wrapper, matching how the real editor page uses this
// controlled component — otherwise clicking "Add rule" wouldn't visibly
// change anything since the component never holds its own state.
function ControlledEditor({ initial }: { initial: RuleGroup }) {
  const [root, setRoot] = useState(initial)
  return <SmartPlaylistRuleEditor root={root} onChange={setRoot} />
}

describe("SmartPlaylistRuleEditor", () => {
  it("shows a placeholder when there are no rules yet", () => {
    render(<ControlledEditor initial={emptyGroup("all")} />)
    expect(screen.getByText("No rules yet — add one below.")).toBeInTheDocument()
  })

  it("adds a rule using the first field with its default operator", () => {
    render(<ControlledEditor initial={emptyGroup("all")} />)
    fireEvent.click(screen.getByRole("button", { name: "Add rule" }))
    expect(
      screen.queryByText("No rules yet — add one below."),
    ).not.toBeInTheDocument()
    // The field select's closed trigger displays the raw selected value
    // (Base UI only resolves it to the item's rendered label once the
    // popup has actually opened and registered its items — see the
    // dropdown-interaction note in song-row.test.tsx) — so the closed
    // trigger shows the field key, not FIELDS[0].label.
    expect(screen.getByText(FIELDS[0].key)).toBeInTheDocument()
  })

  it("adds a nested group", () => {
    render(<ControlledEditor initial={emptyGroup("all")} />)
    fireEvent.click(screen.getByRole("button", { name: "Add group" }))
    expect(screen.getByRole("button", { name: "Remove group" })).toBeInTheDocument()
    // Two "Match ... of the following" selectors now: root + nested group.
    expect(screen.getAllByText("of the following:")).toHaveLength(2)
  })

  it("removes a rule", () => {
    const initial: RuleGroup = {
      kind: "group",
      combinator: "all",
      rules: [{ kind: "rule", field: "title", operator: "is", value: "" }],
    }
    render(<ControlledEditor initial={initial} />)
    fireEvent.click(screen.getByRole("button", { name: "Remove rule" }))
    expect(screen.getByText("No rules yet — add one below.")).toBeInTheDocument()
  })

  it("removes a nested group without touching sibling rules", () => {
    const initial: RuleGroup = {
      kind: "group",
      combinator: "all",
      rules: [
        { kind: "rule", field: "title", operator: "is", value: "keep" },
        { kind: "group", combinator: "any", rules: [] },
      ],
    }
    render(<ControlledEditor initial={initial} />)
    fireEvent.click(screen.getByRole("button", { name: "Remove group" }))
    expect(
      screen.queryByRole("button", { name: "Remove group" }),
    ).not.toBeInTheDocument()
    expect(screen.getByText("title")).toBeInTheDocument()
  })
})
