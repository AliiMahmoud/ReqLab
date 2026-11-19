import { CollectionRepository } from "../storage/repositories/collection-repository";
import { ContainerAuthRepository } from "../storage/repositories/container-auth-repository";
import { ContainerDescriptionRepository } from "../storage/repositories/container-description-repository";
import { ContainerScriptsRepository } from "../storage/repositories/container-scripts-repository";
import { CookieRepository } from "../storage/repositories/cookie-repository";
import { EnvironmentRepository } from "../storage/repositories/environment-repository";
import { HistoryRepository } from "../storage/repositories/history-repository";
import { RequestRepository } from "../storage/repositories/request-repository";
import { SettingsRepository } from "../storage/repositories/settings-repository";
import { VariableRepository } from "../storage/repositories/variable-repository";
import type { WorkspaceService } from "./workspace-service";

/** Hands out repositories bound to one unlocked workspace. Fails with "locked" otherwise. */
export class WorkspaceData {
  constructor(private readonly workspaces: WorkspaceService) {}

  collections(workspaceId: string): CollectionRepository {
    return new CollectionRepository(this.workspaces.requireUnlockedDatabase(workspaceId));
  }

  cookies(workspaceId: string): CookieRepository {
    return new CookieRepository(this.workspaces.requireUnlockedDatabase(workspaceId));
  }

  containerAuth(workspaceId: string): ContainerAuthRepository {
    return new ContainerAuthRepository(this.workspaces.requireUnlockedDatabase(workspaceId));
  }

  containerDescriptions(workspaceId: string): ContainerDescriptionRepository {
    return new ContainerDescriptionRepository(this.workspaces.requireUnlockedDatabase(workspaceId));
  }

  containerScripts(workspaceId: string): ContainerScriptsRepository {
    return new ContainerScriptsRepository(this.workspaces.requireUnlockedDatabase(workspaceId));
  }

  requests(workspaceId: string): RequestRepository {
    return new RequestRepository(this.workspaces.requireUnlockedDatabase(workspaceId));
  }

  environments(workspaceId: string): EnvironmentRepository {
    return new EnvironmentRepository(this.workspaces.requireUnlockedDatabase(workspaceId));
  }

  history(workspaceId: string): HistoryRepository {
    return new HistoryRepository(this.workspaces.requireUnlockedDatabase(workspaceId));
  }

  variables(workspaceId: string): VariableRepository {
    return new VariableRepository(this.workspaces.requireUnlockedDatabase(workspaceId));
  }

  settings(workspaceId: string): SettingsRepository {
    return new SettingsRepository(this.workspaces.requireUnlockedDatabase(workspaceId));
  }
}
