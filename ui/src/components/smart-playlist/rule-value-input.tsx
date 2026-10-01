import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FieldType } from "@/lib/smart-playlist/fields"
import type { RuleOperator, RuleValue } from "@/lib/smart-playlist/criteria"

export function RuleValueInput({
  type,
  operator,
  value,
  onChange,
}: {
  type: FieldType
  operator: RuleOperator
  value: RuleValue
  onChange: (value: RuleValue) => void
}) {
  const { t } = useTranslation()
  // These two operators only need the field reference, not a real value.
  if (operator === "isMissing" || operator === "isPresent") {
    return null
  }

  if (operator === "inTheRange") {
    const [min, max] = Array.isArray(value) ? value : [0, 0]
    return (
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          className="w-20"
          value={min}
          onChange={(e) => onChange([Number(e.target.value), max])}
          aria-label={t("smartPlaylist.minimum")}
        />
        <span className="text-sm text-muted-foreground">
          {t("smartPlaylist.and")}
        </span>
        <Input
          type="number"
          className="w-20"
          value={max}
          onChange={(e) => onChange([min, Number(e.target.value)])}
          aria-label={t("smartPlaylist.maximum")}
        />
      </div>
    )
  }

  if (operator === "inTheLast" || operator === "notInTheLast") {
    return (
      <Input
        type="number"
        className="w-24"
        value={typeof value === "number" ? value : ""}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={t("smartPlaylist.days")}
      />
    )
  }

  if (type === "boolean") {
    return (
      <Select
        value={String(value)}
        onValueChange={(v) => onChange(v === "true")}
      >
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">{t("smartPlaylist.true")}</SelectItem>
          <SelectItem value="false">{t("smartPlaylist.false")}</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  if (type === "date") {
    return (
      <Input
        type="date"
        className="w-40"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  if (type === "number") {
    return (
      <Input
        type="number"
        className="w-24"
        value={typeof value === "number" ? value : ""}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    )
  }

  return (
    <Input
      className="w-40"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
