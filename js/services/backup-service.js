export class BackupService {
  constructor(persistenceService) { this.persistence = persistenceService; }
  create() { return this.persistence.createBackup(); }
  load() { return this.persistence.loadBackup(); }
  restore() { return this.persistence.restoreBackup(); }
  delete() { return this.persistence.deleteBackup(); }
}
