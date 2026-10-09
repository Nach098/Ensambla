// Distributions change only the widths of the current desktop screen.
// Records, block configuration and the mobile layout remain untouched.
export const layoutPresets = [
  {
    id: 'balanced',
    name: 'En equilibrio',
    copy: 'Una pieza principal y espacio para combinar.',
    spans: [3, 2, 1, 1, 2, 3],
  },
  {
    id: 'focus',
    name: 'Una cosa a la vez',
    copy: 'Cada bloque tiene su propia fila.',
    spans: [3, 3, 3, 3, 3, 3],
  },
  {
    id: 'compact',
    name: 'Todo a mano',
    copy: 'Piezas pequeñas para ver más de un vistazo.',
    spans: [1, 1, 1, 1, 1, 1],
  },
];

export function applyLayoutPreset(app, screenId, presetId) {
  const preset = layoutPresets.find((p) => p.id === presetId);
  if (!preset) throw new Error('Elegí una de las distribuciones disponibles.');
  const blocks = app.blocks
    .filter((b) => b.screen === screenId)
    .sort(
      (a, b) =>
        (app.layouts.desktop[a.id]?.order ?? app.blocks.indexOf(a)) -
        (app.layouts.desktop[b.id]?.order ?? app.blocks.indexOf(b)),
    );
  const snapshot = {
    appId: app.id,
    screenId,
    entries: blocks.map((b) => ({
      id: b.id,
      layout: app.layouts.desktop[b.id] ? { ...app.layouts.desktop[b.id] } : null,
    })),
  };
  blocks.forEach((b, i) => {
    app.layouts.desktop[b.id] = {
      ...app.layouts.desktop[b.id],
      span: preset.spans[i % preset.spans.length],
    };
  });
  return snapshot;
}

export function restoreLayout(app, snapshot) {
  if (!snapshot || snapshot.appId !== app.id)
    throw new Error('Este diseño pertenece a otra aplicación.');
  for (const entry of snapshot.entries) {
    if (!app.blocks.some((b) => b.id === entry.id && b.screen === snapshot.screenId)) continue;
    if (entry.layout === null) delete app.layouts.desktop[entry.id];
    else app.layouts.desktop[entry.id] = { ...entry.layout };
  }
}
