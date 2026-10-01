import type { RuleOperator } from "./criteria"

export type FieldType = "text" | "number" | "date" | "boolean"

export interface FieldDef {
  key: string
  label: string
  type: FieldType
}

// A curated subset of model/criteria/fields.go's ~70-entry allow-list (plus
// dynamically-registered tag fields like genre/artist/albumartist, which
// aren't literal Go constants but are real runtime field names) — enough
// to build genuinely useful smart playlists without a UI for every field
// day one. Extend this list; the wire format doesn't change.
export const FIELDS: FieldDef[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "album", label: "Album", type: "text" },
  { key: "artist", label: "Artist", type: "text" },
  { key: "albumartist", label: "Album Artist", type: "text" },
  { key: "genre", label: "Genre", type: "text" },
  { key: "path", label: "File Path", type: "text" },
  { key: "comment", label: "Comment", type: "text" },
  { key: "year", label: "Year", type: "number" },
  { key: "duration", label: "Duration (seconds)", type: "number" },
  { key: "bpm", label: "BPM", type: "number" },
  { key: "rating", label: "Rating", type: "number" },
  { key: "albumrating", label: "Album Rating", type: "number" },
  { key: "playcount", label: "Play Count", type: "number" },
  { key: "albumplaycount", label: "Album Play Count", type: "number" },
  { key: "loved", label: "Favorite", type: "boolean" },
  { key: "albumloved", label: "Album Favorite", type: "boolean" },
  { key: "missing", label: "Missing", type: "boolean" },
  { key: "compilation", label: "Compilation", type: "boolean" },
  { key: "dateadded", label: "Date Added", type: "date" },
  { key: "lastplayed", label: "Last Played", type: "date" },
]

export function fieldType(key: string): FieldType {
  return FIELDS.find((f) => f.key === key)?.type ?? "text"
}

interface OperatorDef {
  value: RuleOperator
  label: string
}

export const OPERATORS_BY_TYPE: Record<FieldType, OperatorDef[]> = {
  text: [
    { value: "is", label: "is" },
    { value: "isNot", label: "is not" },
    { value: "contains", label: "contains" },
    { value: "notContains", label: "does not contain" },
    { value: "startsWith", label: "starts with" },
    { value: "endsWith", label: "ends with" },
  ],
  number: [
    { value: "is", label: "is" },
    { value: "isNot", label: "is not" },
    { value: "gt", label: "is greater than" },
    { value: "lt", label: "is less than" },
    { value: "inTheRange", label: "is between" },
  ],
  date: [
    { value: "before", label: "is before" },
    { value: "after", label: "is after" },
    { value: "inTheLast", label: "is in the last (days)" },
    { value: "notInTheLast", label: "is not in the last (days)" },
    { value: "isPresent", label: "has a value" },
    { value: "isMissing", label: "has no value" },
  ],
  boolean: [{ value: "is", label: "is" }],
}

export function defaultOperatorFor(type: FieldType): RuleOperator {
  return OPERATORS_BY_TYPE[type][0].value
}
