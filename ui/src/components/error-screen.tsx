import { Component, type ErrorInfo, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

/** Full-area fallback shown when rendering throws. */
export function ErrorScreen({
  error,
  onRetry,
}: {
  error?: unknown
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      role="alert"
      className="flex h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground"
    >
      <h1 className="text-xl font-semibold">
        {t("errors.somethingWentWrong")}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("errors.unexpected")}
      </p>
      {import.meta.env.DEV && error instanceof Error && (
        <pre className="max-w-xl overflow-auto text-xs text-destructive">
          {error.message}
        </pre>
      )}
      <div className="flex gap-2">
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            {t("errors.tryAgain")}
          </Button>
        )}
        <Button onClick={() => window.location.reload()}>
          {t("errors.reload")}
        </Button>
      </div>
    </div>
  )
}

export function NotFoundScreen() {
  const { t } = useTranslation()
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{t("errors.pageNotFound")}</h1>
      <p className="text-sm text-muted-foreground">
        {t("errors.pageNotFoundDescription")}
      </p>
      <Button render={<a href="#/" />}>{t("errors.goHome")}</Button>
    </div>
  )
}

/** Last-resort boundary so a render exception never leaves a blank page. */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: unknown; hasError: boolean }
> {
  state = { error: null as unknown, hasError: false }

  static getDerivedStateFromError(error: unknown) {
    return { error, hasError: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorScreen
          error={this.state.error}
          onRetry={() => this.setState({ error: null, hasError: false })}
        />
      )
    }
    return this.props.children
  }
}
