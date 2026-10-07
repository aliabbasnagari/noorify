import { describe, expect, it } from "vitest"
import {
  PID_CUSTOM,
  PID_FOLDER,
  PID_GLOBAL,
  pidConfigChanged,
  pidModeFromValue,
  pidValueForMode,
} from "./pid-presets"

const globals = { pidAlbum: "album-spec", pidTrack: "track-spec" }

describe("pid-presets", () => {
  it("derives the mode from the stored value", () => {
    expect(pidModeFromValue("", true)).toBe(PID_GLOBAL)
    expect(pidModeFromValue("  ", true)).toBe(PID_GLOBAL)
    expect(pidModeFromValue(undefined, true)).toBe(PID_GLOBAL)
    expect(pidModeFromValue("folder", true)).toBe(PID_FOLDER)
    expect(pidModeFromValue("folder", false)).toBe(PID_CUSTOM)
    expect(pidModeFromValue("a,b", true)).toBe(PID_CUSTOM)
  })

  it("maps a mode back to the value to store", () => {
    expect(pidValueForMode(PID_GLOBAL, "g")).toBe("")
    expect(pidValueForMode(PID_FOLDER, "g")).toBe("folder")
    expect(pidValueForMode(PID_CUSTOM, "g")).toBe("g")
  })

  it("detects effective changes only", () => {
    expect(pidConfigChanged({}, {}, globals)).toBe(false)
    expect(pidConfigChanged({ pidAlbum: "ALBUM-SPEC " }, {}, globals)).toBe(false)
    expect(pidConfigChanged({ pidAlbum: "folder" }, {}, globals)).toBe(true)
    expect(
      pidConfigChanged({ pidTrack: "" }, { pidTrack: "custom" }, globals),
    ).toBe(true)
  })
})
