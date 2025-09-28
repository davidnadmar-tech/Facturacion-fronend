# Instrucciones para Agentes de IA

Objetivo: Mantener y extender un frontend Vue 3 (Composition API) + Vite para una aplicación de Facturación ("FacturaPro") con rutas diferenciadas por layout (público/login, sitio público, dashboard) y estado local administrado principalmente con Pinia y `localStorage` (por ahora sin backend real salvo axios base configurada).

## Arquitectura y Flujo

- Entrada principal: `src/main.js` monta `App.vue`, registra Pinia y Vue Router.
- `App.vue` actúa como orquestador de layouts mediante `route.meta.layout` (valores usados: `default`, `blank`, `dashboard`). Cualquier ruta nueva debe definir `meta.layout` si necesita un layout distinto.
- Layouts:
  - Default: Header + nav responsiva (`ResponsiveNav`) + footer.
  - Blank: Página limpia (login u otras pantallas sin chrome) -> meta `{ layout: 'blank' }`.
  - Dashboard: Envuelve vistas internas bajo `DashboardLayout.vue`, que gestiona sidebar colapsable y contenido principal.
- Rutas declaradas en `src/router/index.js` con code-splitting usando `() => import(...)`. Añade siempre `meta: { title: '...' }` para título dinámico (gestión básica en `App.vue`).
- Estado: Pinia en `src/stores/`. Patrón observado: validaciones y persistencia dentro del store (`clientes.js`). Reutiliza este estilo para nuevos módulos (ver sección Patrones).
- API: Instancia axios centralizada en `src/api/axiosConection.js` (`baseURL: http://localhost:9090/`). Centralizar interceptores futuros aquí (no dupliques `axios.create`).

## Patrones de Código

- Stores Pinia: Exporta con `export const useXStore = defineStore('x', { state, getters, actions })`. Incluye:
  - Carga diferida desde `localStorage` con flag `cargado` para evitar recargas.
  - Validación central (`validar`) que retorna objeto de errores; acciones devuelven `{ ok: boolean, errores? | item? | error? }` en vez de lanzar excepciones. Respeta este contrato.
  - Generación de códigos incrementales (`generarCodigo`) con prefijos (ej: `C0001`). Si creas otro recurso (facturas, productos), replica generador con prefijo apropiado.
- Layout dinámico: Derivado de `route.meta.layout`. No insertes lógica condicional de layout dentro de vistas; solo ajusta `meta` en la ruta.
- Icons Dashboard: Función `icon(name)` al final de `DashboardLayout.vue`. Si crece, mover a util dedicado (`src/util/icons.js`) pero mantén API `icon(name)`.
- Estilos: CSS modular por componente con `scoped`. Variables tema referenciadas (`--color-background`, etc.) vienen de `assets/*.css`. Mantén naming consistente (`dash-*`, `app-*`).
- Lazy routes: Usa siempre funciones dinámicas para vistas secundarias para mantener bundles ligeros.

## Consistencia de Diseño (UI System)

- Tokens/Variables: Usa variables de `src/assets/base.css` (ej. `--brand-primary`, `--color-background-soft`, sombras `--shadow-*`, radios `--radius-*`). Evita colores hex directos salvo excepciones mínimas (añade token si se repite >1 vez).
- Utilidades: Reutiliza clases de `utilities.css` (`flex-*`, `gap-*`, `surface-*`, `round-*`, `btn`, `btn-primary`, `btn-outline`, `text-*`). Antes de crear una nueva variante revisa si una combinación existente cubre el caso.
- Botones: Preferir `.btn`/`.btn-primary`/`.btn-outline`. Las clases dentro de `DashboardLayout.vue` (`ghost-btn`, `primary-btn`) pueden migrarse gradualmente a utilidades estándar; no dupliques estilos, referencia patrones existentes.
- Superficies: Elige entre `surface-card` (panel elevado), `surface-soft` (contenedor neutro) y `surface-glow` (énfasis visual). No introduzcas nuevas sombras personalizadas: usa `--shadow-xs|sm|md|lg`.
- Espaciado: Usa la escala (`--space-*`) o utilidades (`mt-4`, `gap-3`, etc.). Evita valores arbitrarios (`13px`, `22px`). Para padding horizontales responsivos sigue patrón `clamp()` visto en `App.vue`/`DashboardLayout.vue` cuando sea global.
- Tipografía: Preferir clases `text-xs|sm|base` o variables `--fz-*` en lugar de tamaños en línea. Peso tipográfico normal salvo títulos (usa `font-weight:600`).
- Colores de estado: Para éxito/acento utiliza `--brand-primary` / clases `text-success`. Para error define una clase reutilizable (ya existe `.text-danger`). No inventar rojos nuevos.
- Dark Mode: Heredado de variables; no forzar colores según media query salvo que extiendas tokens existentes.
- Responsivo: Reutiliza breakpoints ya presentes (≈1020px, 820px, 640px, 520px). Mantén consistencia de sidebar y headers sticky. Si añades un breakpoint nuevo, justifica y documenta.
- Animaciones: Usa `fade-in` cuando necesites una entrada sutil; respeta `prefers-reduced-motion`. Evita animaciones permanentes o loops innecesarios.
- Iconos: Para items de dashboard ampliar objeto `paths` del helper `icon(name)` (no importar librerías pesadas todavía). Nombre corto semántico (`invoice`, `report`, etc.).
- Organización CSS: Estilos específicos van dentro del componente (`<style scoped>`). Si detectas repetición en ≥3 componentes, extrae a nueva utilidad en `assets/` y referencia. No modifiques `base.css` para casos de un solo componente.
- Nuevos componentes: Base markup minimal + clases utilitarias + tokens. Solo añade reglas nuevas si no se logra con utilidades. Prefiere composición de clases sobre cascada profunda.
- Evitar: Inline styles, `!important` (salvo overrides puntuales documentados), duplicar gradientes (usa `--grad-*`).

## Añadir una Nueva Vista (Ejemplo)

1. Crear `src/views/DashboardFacturas.vue`.
2. Ruta en `router/index.js`:

```js
{ path: '/dashboard/facturas', name: 'dashboard-facturas', component: () => import('../views/DashboardFacturas.vue'), meta: { layout: 'dashboard', title: 'Facturas' } }
```

3. Añadir entrada en `menu` de `DashboardLayout.vue` si debe aparecer en sidebar.
4. Si necesita datos persistentes, crear `src/stores/facturas.js` siguiendo patrón de `clientes.js`.

## Flujo de Persistencia Local (Clientes)

- `cargarLocal()` lee una sola vez (`cargado` evita repetición).
- `persistir()` tras mutaciones exitosas.
- Validación previa a mutar; en edición se pasa `{ edit: true }` para permitir coincidencias sobre el mismo registro.

## Tests

- Framework: Vitest + Vue Test Utils (`@vue/test-utils`). Ubicación actual de tests: `src/components/__tests__/` y `src/stores/__tests__/`.
- Ejecutar: `npm run test:unit`.
- Al crear nuevos stores/components, ubica pruebas en un `__tests__` hermano.
- Patrón esperado para stores: probar generación de código, validación de duplicados y persistencia básica (mockear `localStorage`).

## Scripts Clave

- Dev: `npm run dev` (Vite server).
- Build prod: `npm run build`.
- Preview build: `npm run preview`.
- Lint + fix: `npm run lint` (usa ESLint 9 + plugin Vue + Prettier config). Formato específico: `npm run format` (solo `src/`).

## Convenciones

- Imports con alias `@` para `src/` (config Vite implícita). Usa rutas relativas solo para siblings cercanos.
- Nombres de rutas: `dashboard-*` para vistas internas, evita colisiones.
- Componentes PascalCase (`DashboardLayout.vue`). Stores en minúscula plural (`clientes.js`).
- Objetos retornados por acciones de store siempre normalizados `{ ok, ... }` (no mezclar retornos booleanos crudos y objetos en el mismo método).
- Persistencia local: sufijo `_v1` en keys de `localStorage` → incrementa versión si cambias formato.

## Errores Comunes a Evitar

- Duplicar creación de instancia axios: importar siempre `api`.
- Mutar estado fuera de acciones Pinia: encapsular lógica en acciones.
- Olvidar `meta.layout` en rutas nuevas → UI sin estructura esperada.
- Usar `new Date()` en múltiples partes para timestamps: crea una vez y reutiliza dentro de la acción.

## Extensiones Futuras (Mantener Consistencia)

- Autenticación: Añadir guard global en router (`beforeEach`) usando bandera `meta.public` (ya presente en login) para redirigir.
- Interceptores axios: manejar `Authorization` y errores globales (401) ahí, no en cada vista.

## Checklist Rápido al Contribuir

- [ ] Ruta nueva con `meta.title` + `meta.layout`.
- [ ] Store nuevo replica contrato `{ ok, ... }` y persistencia versionada.
- [ ] Pruebas mínimas en `__tests__` (crear/validar/edge).
- [ ] Lint y format sin errores.
- [ ] Evitar lógica de layout dentro de vistas.

¿Algo poco claro o faltan patrones que quieras documentar mejor? Indica y lo iteramos.
