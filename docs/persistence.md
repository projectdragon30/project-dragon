# Persistencia de PROJECT DRAGON

La persistencia usa adaptadores de texto con el namespace `project-dragon`. Las claves son
`project-dragon:save:primary`, `project-dragon:save:backup` y
`project-dragon:save:metadata`. Ningún servicio de dominio accede a `localStorage`.

Cada partida se guarda en un envelope `PROJECT_DRAGON_SAVE` con `formatVersion: 1`,
`schemaVersion`, identidad y fechas de la partida, versión de aplicación, checksum y una
copia completa del World State. El checksum FNV-1a se calcula sobre JSON canónico con
claves ordenadas y arrays en su orden original. Detecta alteración accidental; no ofrece
autenticidad ni seguridad criptográfica.

Antes de reemplazar una primaria válida se conserva como backup. La nueva escritura se
vuelve a leer, verifica y valida. Importar exige texto limitado en tamaño, envelope y
checksum válidos, migración disponible y World State estructuralmente válido. Exportar
produce JSON legible y portable. Restaurar valida el backup y no lo elimina.

El motor recibe opcionalmente `PersistenceService`; por ello funciona sin navegador. El
adaptador `LocalStorageAdapter` encapsula la API del navegador y el adaptador en memoria
permite pruebas deterministas. No se persisten elementos visuales efímeros ni secretos.
