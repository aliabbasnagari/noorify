export function PlaceholderPage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex h-full flex-col items-start justify-center gap-2 py-16">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="max-w-md text-muted-foreground">{description}</p>
    </div>
  )
}
