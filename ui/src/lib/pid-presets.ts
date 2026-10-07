export const PID_GLOBAL = "global"
export const PID_FOLDER = "folder"
export const PID_CUSTOM = "custom"

export type PidMode = typeof PID_GLOBAL | typeof PID_FOLDER | typeof PID_CUSTOM
export type PidField = "pidAlbum" | "pidTrack"

export function pidModeFromValue(
  value: string | undefined,
  allowFolder: boolean,
): PidMode {
  const v = (value ?? "").trim()
  if (v === "") return PID_GLOBAL
  if (allowFolder && v === PID_FOLDER) return PID_FOLDER
  return PID_CUSTOM
}

/** The value to store for a dropdown choice. Custom starts from the global
 * spec so admins edit a working spec instead of typing one from scratch. */
export function pidValueForMode(mode: PidMode, globalValue: string): string {
  switch (mode) {
    case PID_GLOBAL:
      return ""
    case PID_FOLDER:
      return PID_FOLDER
    default:
      return globalValue
  }
}

/** Whether the form values change the effective PID spec of the saved
 * record. Like the server, it trims, treats empty as the global value and
 * compares case-insensitively. */
export function pidConfigChanged(
  values: Partial<Record<PidField, string>>,
  record: Partial<Record<PidField, string>>,
  globals: Record<PidField, string>,
): boolean {
  const effective = (value: string | undefined, field: PidField) =>
    ((value ?? "").trim() || globals[field]).toLowerCase()
  return (["pidAlbum", "pidTrack"] as const).some(
    (field) => effective(values[field], field) !== effective(record[field], field),
  )
}
