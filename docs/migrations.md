# Migraciones del World State

`schemaVersion` identifica el contrato del World State; `formatVersion` identifica el
formato exterior del archivo. La versión productiva actual permanece en `1.0.0` porque
la Fase 7 no requiere cambiar el World State.

El registro asocia cada versión de origen con una única función y versión de destino.
Las migraciones se aplican secuencialmente, sobre copias, sin saltos y preservando los
historiales. Existe una migración de fixture `0.9.0 → 1.0.0` para demostrar y probar el
sistema sin inventar una nueva versión productiva.

Una versión futura se rechaza con `UNSUPPORTED_FUTURE_SCHEMA_VERSION`. Una versión
antigua sin ruta completa se rechaza con `MIGRATION_PATH_NOT_FOUND`. Después de migrar,
el World State siempre pasa por la validación estructural vigente.
