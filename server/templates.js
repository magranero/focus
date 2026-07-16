/**
 * Layout templates offered in step 1 of the wizard. Positions use a 12-column
 * grid. "overview" mimics a classic browser start page: everything at a glance.
 */

export const TEMPLATES = [
  {
    id: 'overview',
    nameKey: 'templates.overview',
    items: [
      { widget: 'builtin/search', x: 3, y: 0, w: 6, h: 1 },
      { widget: 'builtin/clock', x: 0, y: 1, w: 3, h: 2 },
      { widget: 'builtin/weather', x: 3, y: 1, w: 3, h: 2 },
      { widget: 'builtin/tasks', x: 6, y: 1, w: 3, h: 3 },
      { widget: 'builtin/news', x: 9, y: 1, w: 3, h: 3 },
      { widget: 'builtin/links', x: 0, y: 3, w: 6, h: 2 }
    ]
  },
  {
    id: 'minimal',
    nameKey: 'templates.minimal',
    items: [
      { widget: 'builtin/clock', x: 4, y: 0, w: 4, h: 2 },
      { widget: 'builtin/search', x: 3, y: 2, w: 6, h: 1 }
    ]
  },
  {
    id: 'dashboard',
    nameKey: 'templates.dashboard',
    items: [
      { widget: 'builtin/clock', x: 0, y: 0, w: 2, h: 2 },
      { widget: 'builtin/weather', x: 2, y: 0, w: 3, h: 2 },
      { widget: 'builtin/disk', x: 5, y: 0, w: 2, h: 2 },
      { widget: 'builtin/countdown', x: 7, y: 0, w: 3, h: 2 },
      { widget: 'builtin/news', x: 10, y: 0, w: 2, h: 4 },
      { widget: 'builtin/tasks', x: 0, y: 2, w: 4, h: 3 },
      { widget: 'builtin/links', x: 4, y: 2, w: 3, h: 2 },
      { widget: 'builtin/embed', x: 7, y: 2, w: 3, h: 3 }
    ]
  },
  {
    id: 'sidebar',
    nameKey: 'templates.sidebar',
    items: [
      { widget: 'builtin/clock', x: 0, y: 0, w: 3, h: 2 },
      { widget: 'builtin/weather', x: 0, y: 2, w: 3, h: 2 },
      { widget: 'builtin/tasks', x: 0, y: 4, w: 3, h: 3 },
      { widget: 'builtin/search', x: 4, y: 0, w: 7, h: 1 },
      { widget: 'builtin/news', x: 4, y: 1, w: 7, h: 3 }
    ]
  }
];
