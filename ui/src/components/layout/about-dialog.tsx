import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Copy } from "lucide-react"
import { apiFetch } from "@/lib/api/http"
import { config } from "@/lib/config"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ConfigResponse {
  id: string
  configFile: string
  config: Record<string, unknown>
}

interface InsightsResponse {
  id: string
  lastRun: string
  success: boolean
}

/** Old-ui's config/insights viewer lives inside an "About" dialog, not a
 * standalone admin page — it's explicitly a dev/debug feature (the `Dev`
 * prefix on `DevUIShowConfig`), read-only, and this codebase has no
 * TOML serializer, so "copy as TOML" is scoped down to "copy as JSON". */
export function AboutDialog({
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  trigger?: React.ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChangeProp ?? setInternalOpen
  const [copied, setCopied] = useState(false)
  const isAdmin = useAuthStore((s) => s.session?.isAdmin ?? false)
  const showConfigTab = isAdmin && config.devUIShowConfig

  const { data: serverConfig } = useQuery({
    queryKey: ["config", "config"],
    queryFn: () => apiFetch<ConfigResponse>("/api/config/config"),
    enabled: open && showConfigTab,
  })

  const { data: insights } = useQuery({
    queryKey: ["insights", "status"],
    queryFn: () => apiFetch<InsightsResponse>("/api/insights/status"),
    enabled: open && isAdmin,
  })

  async function copyConfig() {
    if (!serverConfig) return
    await navigator.clipboard.writeText(JSON.stringify(serverConfig.config, null, 2))
    setCopied(true)
  }

  const insightsLabel = !insights
    ? "…"
    : insights.lastRun === "disabled"
      ? "Disabled"
      : insights.lastRun.startsWith("1969-12-31") || insights.lastRun.startsWith("0001-01-01")
        ? "Waiting for first run"
        : insights.lastRun

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>About Navidrome</DialogTitle>
        </DialogHeader>
        {showConfigTab ? (
          <Tabs defaultValue="about">
            <TabsList>
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="config">Config</TabsTrigger>
            </TabsList>
            <TabsContent value="about" className="space-y-3 pt-2">
              <AboutContent version={config.version} insightsLabel={isAdmin ? insightsLabel : null} />
            </TabsContent>
            <TabsContent value="config" className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {serverConfig?.configFile || "No config file loaded"}
                </p>
                <Button variant="outline" size="sm" onClick={() => void copyConfig()}>
                  <Copy className="size-3.5" />
                  {copied ? "Copied!" : "Copy as JSON"}
                </Button>
              </div>
              <div className="max-h-96 overflow-y-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/50">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">Name</th>
                      <th className="px-2 py-1.5 text-left font-medium">Environment variable</th>
                      <th className="px-2 py-1.5 text-left font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serverConfig &&
                      Object.entries(serverConfig.config).map(([key, value]) => (
                        <tr key={key} className="border-t border-border">
                          <td className="px-2 py-1.5">{key}</td>
                          <td className="px-2 py-1.5 font-mono text-muted-foreground">
                            ND_{key.toUpperCase()}
                          </td>
                          <td className="px-2 py-1.5 font-mono break-all text-muted-foreground">
                            {typeof value === "object" ? JSON.stringify(value) : String(value)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <AboutContent version={config.version} insightsLabel={isAdmin ? insightsLabel : null} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function AboutContent({
  version,
  insightsLabel,
}: {
  version: string
  insightsLabel: string | null
}) {
  return (
    <div className="space-y-3 text-sm">
      <p>
        Version <span className="font-mono">{version}</span>
      </p>
      <div className="flex flex-col gap-1 text-muted-foreground">
        <a
          className="hover:underline"
          href="https://www.navidrome.org"
          target="_blank"
          rel="noreferrer"
        >
          Homepage
        </a>
        <a
          className="hover:underline"
          href="https://github.com/navidrome/navidrome"
          target="_blank"
          rel="noreferrer"
        >
          Source code
        </a>
        <a
          className="hover:underline"
          href="https://github.com/navidrome/navidrome/issues"
          target="_blank"
          rel="noreferrer"
        >
          Report a bug
        </a>
      </div>
      {insightsLabel && (
        <p className="text-xs text-muted-foreground">
          Last insights collection: {insightsLabel}
        </p>
      )}
    </div>
  )
}
