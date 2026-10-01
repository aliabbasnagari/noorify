import { Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RuleValueInput } from "@/components/smart-playlist/rule-value-input"
import {
  FIELDS,
  OPERATORS_BY_TYPE,
  defaultOperatorFor,
  fieldType,
} from "@/lib/smart-playlist/fields"
import {
  defaultValueForOperator,
  emptyGroup,
  emptyRule,
  type RuleGroup,
  type RuleLeaf,
  type RuleOperator,
} from "@/lib/smart-playlist/criteria"
import { addAtPath, removeAtPath, updateAtPath, type Path } from "@/lib/smart-playlist/tree-ops"

export function SmartPlaylistRuleEditor({
  root,
  onChange,
}: {
  root: RuleGroup
  onChange: (root: RuleGroup) => void
}) {
  return <RuleGroupView group={root} path={[]} root={root} onChange={onChange} depth={0} />
}

function RuleGroupView({
  group,
  path,
  root,
  onChange,
  depth,
}: {
  group: RuleGroup
  path: Path
  root: RuleGroup
  onChange: (root: RuleGroup) => void
  depth: number
}) {
  const { t } = useTranslation()

  function setCombinator(combinator: "all" | "any") {
    onChange(updateAtPath(root, path, (node) => ({ ...node, combinator }) as RuleGroup))
  }

  function addRule() {
    const field = FIELDS[0]
    onChange(addAtPath(root, path, emptyRule(field.key, defaultOperatorFor(field.type))))
  }

  function addGroup() {
    onChange(addAtPath(root, path, emptyGroup("all")))
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border border-border p-3",
        depth > 0 && "bg-muted/30",
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{t("smartPlaylist.match")}</span>
        <Select
          value={group.combinator}
          onValueChange={(value) => value && setCombinator(value as "all" | "any")}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("smartPlaylist.all")}</SelectItem>
            <SelectItem value="any">{t("smartPlaylist.any")}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">
          {t("smartPlaylist.ofTheFollowing")}
        </span>
      </div>

      <div className="space-y-2 pl-2">
        {group.rules.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("smartPlaylist.noRules")}
          </p>
        )}
        {group.rules.map((node, index) => {
          const childPath = [...path, index]
          return node.kind === "group" ? (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1">
                <RuleGroupView
                  group={node}
                  path={childPath}
                  root={root}
                  onChange={onChange}
                  depth={depth + 1}
                />
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onChange(removeAtPath(root, childPath))}
                aria-label={t("smartPlaylist.removeGroup")}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ) : (
            <RuleLeafRow
              key={index}
              rule={node}
              onChange={(updated) => onChange(updateAtPath(root, childPath, () => updated))}
              onRemove={() => onChange(removeAtPath(root, childPath))}
            />
          )
        })}
      </div>

      <div className="flex gap-2 pl-2">
        <Button variant="outline" size="sm" onClick={addRule}>
          <Plus className="size-3.5" />
          {t("smartPlaylist.addRule")}
        </Button>
        <Button variant="outline" size="sm" onClick={addGroup}>
          <Plus className="size-3.5" />
          {t("smartPlaylist.addGroup")}
        </Button>
      </div>
    </div>
  )
}

function RuleLeafRow({
  rule,
  onChange,
  onRemove,
}: {
  rule: RuleLeaf
  onChange: (rule: RuleLeaf) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const type = fieldType(rule.field)

  function handleFieldChange(field: string) {
    const newType = fieldType(field)
    const stillValid = OPERATORS_BY_TYPE[newType].some((o) => o.value === rule.operator)
    const operator = stillValid ? rule.operator : defaultOperatorFor(newType)
    onChange({ ...rule, field, operator, value: defaultValueForOperator(operator) })
  }

  function handleOperatorChange(operator: RuleOperator) {
    onChange({ ...rule, operator, value: defaultValueForOperator(operator) })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={rule.field} onValueChange={(v) => v && handleFieldChange(v)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FIELDS.map((f) => (
            <SelectItem key={f.key} value={f.key}>
              {t(`smartPlaylist.fields.${f.key}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={rule.operator}
        onValueChange={(v) => v && handleOperatorChange(v as RuleOperator)}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPERATORS_BY_TYPE[type].map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {t(`smartPlaylist.operators.${o.value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <RuleValueInput
        type={type}
        operator={rule.operator}
        value={rule.value}
        onChange={(value) => onChange({ ...rule, value })}
      />
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        aria-label={t("smartPlaylist.removeRule")}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}
