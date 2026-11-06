export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6 md:mb-8">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
      {description && <p className="mt-1.5 text-muted-foreground">{description}</p>}
    </div>
  );
}
