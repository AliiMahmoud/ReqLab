import type { OAuth2Service } from "../auth/oauth2/oauth2-service";
import type { InteropService } from "../interop/interop-service";
import type { NetworkSettingsStore } from "../network/network-settings-store";
import type { RequestSettingsStore } from "../network/request-settings-store";
import type { RequestSender } from "../pipeline/request-sender";
import type { ClipboardGuard } from "../secrets/clipboard-guard";
import type { KeyManager } from "../storage/keys/key-manager";
import type { VariableService } from "../variables/variable-service";
import type { WorkspaceData } from "../workspaces/workspace-data";
import type { WorkspaceService } from "../workspaces/workspace-service";

export interface IpcServices {
  keys: KeyManager;
  workspaces: WorkspaceService;
  data: WorkspaceData;
  variables: VariableService;
  sender: RequestSender;
  interop: InteropService;
  clipboard: ClipboardGuard;
  networkSettings: NetworkSettingsStore;
  requestSettings: RequestSettingsStore;
  oauth2: OAuth2Service;
}
