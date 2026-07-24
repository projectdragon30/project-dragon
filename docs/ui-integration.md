# Integración UI del WorldEngine

`bootstrap.js` crea el adaptador, `PersistenceService` y `WorldEngine`, intenta cargar la
partida primaria, recupera el backup cuando es posible y mantiene un estado inicial si
ambos fallan. Sin `localStorage` usa memoria y muestra una advertencia.

El flujo es unidireccional: World State → selectores → View Models → controladores. La UI
solo envía comandos mediante `engine.execute()`. Una única suscripción del motor vuelve
a consultar View Models y actualiza mapa y panel; el resultado inmediato de cada comando
solo gestiona errores y avisos. Autosave está habilitado después de comandos exitosos.

`regiones.js` contiene exclusivamente metadata visual: identificador, `domainId`, título,
posición, dimensiones, variante, anclajes y etiqueta accesible. Para agregar una región
visual se añade una entrada y se enlaza su `domainId` con un Domain ya existente. Nunca
se duplican XP, progreso, condición, maestría o disponibilidad en ese archivo.

Los View Models traducen enums, porcentajes y estados combinables fuera del motor. El
MapController conserva nodos y conexiones; DomainPanelController mantiene el diálogo,
foco y contenido derivado; MissionController centraliza comandos de jugador. La
persistencia y la UI siguen desacopladas y no requieren backend.
