export class SaveGameService {
  constructor(persistenceService) { this.persistence = persistenceService; }
  save(state) { return this.persistence.save(state); }
  load() { return this.persistence.load(); }
  export() { return this.persistence.exportSave(); }
  import(text) { return this.persistence.importSave(text); }
}
