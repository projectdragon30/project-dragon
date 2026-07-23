# PROJECT DRAGON — Sprint 2

Prototipo funcional del **Mapa del Juego** de PROJECT DRAGON. Presenta el Santuario del Dragón, ocho regiones, el jefe del nivel y un panel informativo accesible para explorar cada elemento.

## Ejecución

No requiere instalación, compilación ni dependencias.

1. Abre la carpeta con un servidor local, por ejemplo Live Server.
2. Visita `index.html`; la página dirige automáticamente a `pages/mapa.html`.

También puede publicarse directamente mediante GitHub Pages desde la raíz del proyecto.

El catálogo visual está disponible en `pages/design-system.html`.

## Estructura

```text
PROJECT-DRAGON/
├── index.html
├── pages/
│   ├── mapa.html
│   └── design-system.html
├── css/
│   ├── tokens.css
│   ├── global.css
│   ├── components.css
│   ├── design-system.css
│   └── mapa.css
├── js/
│   ├── data/regiones.js
│   ├── components/region-panel.js
│   └── mapa.js
├── assets/
│   ├── icons/
│   ├── images/
│   └── audio/
└── README.md
```

## Archivos principales

- `pages/mapa.html`: estructura semántica del HUD, mapa, frase y diálogo.
- `js/data/regiones.js`: fuente central de datos de regiones y entidades especiales.
- `js/components/region-panel.js`: diálogo reutilizable, cierre y gestión del foco.
- `js/mapa.js`: construcción de nodos, interacciones y conexiones SVG adaptables.
- `css/tokens.css`: variables visuales globales.
- `css/components.css`: componentes reutilizables con prefijo `.pd-*`.
- `css/design-system.css`: composición exclusiva del catálogo visual.
- `css/mapa.css`: composición radial, estados, panel, movimiento y adaptación responsive.
- `pages/design-system.html`: referencia visual de tokens, componentes y movimiento.

## Uso del Design System

Incluye las hojas en este orden:

```html
<link rel="stylesheet" href="../css/tokens.css">
<link rel="stylesheet" href="../css/global.css">
<link rel="stylesheet" href="../css/components.css">
```

Utiliza los tokens de `tokens.css` en lugar de valores aislados. La escala de
espaciado sigue un ritmo base de 4 px (`--space-1` a `--space-8`) y la escala
tipográfica va de `--text-xs` a `--text-4xl`.

Componentes disponibles:

- `.pd-hud`: superficie principal de información del jugador.
- `.pd-eyebrow`: etiqueta superior de sección o componente.
- `.pd-node` con variantes `--future` y `--consequence`.
- `.pd-state` con variantes de futuro, consecuencia y amenaza.
- `.pd-button` y `.pd-button--quiet`.
- `.pd-panel`: superficie de panel emergente.
- `.pd-boss`: presencia de amenaza.
- `.pd-system-message`: mensaje central del sistema.
- `.pd-motion--breathe`, `.pd-motion--drift` y `.pd-motion--pulse`.

Las clases de movimiento respetan automáticamente `prefers-reduced-motion`
mediante las reglas globales del proyecto.

## Accesibilidad y responsive

Todos los nodos son botones nativos utilizables con mouse, Enter y Space. El panel usa `role="dialog"`, `aria-modal`, cierre con Escape o fondo, control básico del foco y devolución del foco al origen. Las animaciones respetan `prefers-reduced-motion`.

El mapa es radial en escritorio y tablet. En móvil se convierte en una composición legible de dos columnas y, desde 360 px, una sola columna.

## Alcance y limitaciones

Este Sprint 2 implementa únicamente la exploración visual del mapa. Las acciones del panel son demostrativas y cierran el diálogo. No incluye combate, XP, persistencia, bases de datos, misiones reales ni integración con Notion. Los textos descriptivos de región son preliminares y reemplazables cuando exista contenido definitivo del GDD.
