export default function HomePage() {
  return (
    <div className="space-y-8 py-8">
      <section className="rounded-panel border border-line bg-white p-8 shadow-card">
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          Восстановленная электроника с гарантией
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Ноутбуки, видеокарты и комплектующие, проверенные мастерами. Заберите самовывозом или
          закажите доставку — оформление появится вместе с каталогом на следующем этапе пересборки.
        </p>
      </section>

      <section aria-busy="true" aria-live="polite">
        <h2 className="text-lg font-extrabold">Каталог</h2>
        <p className="mt-2 text-sm text-muted">
          Разделы каталога подключаются на этапе 2 (слой API + серверные данные).
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-card border border-line bg-white" />
          ))}
        </div>
      </section>
    </div>
  );
}
