import { z } from "zod";
import { RequestAuth } from "./models/auth";
import {
  CollectionTree,
  ContainerAuthInput,
  CreateCollectionInput,
  CreateItemInput,
  EntityInput,
  MoveItemInput,
  MoveCollectionInput,
  EntityId,
  RenameEntityInput,
  TreeItem,
  Collection,
  WorkspaceScoped,
} from "./models/collection";
import {
  CreateEnvironmentInput,
  Environment,
  OwnerInput,
  ProtectEnvironmentInput,
  ColorEnvironmentInput,
  SaveVariablesInput,
  VariableList,
  VariableNamesInput,
  SetVariableValueInput,
  VisibleVariable,
} from "./models/environment";
import { CookieKeyInput, StoredCookie } from "./models/cookie";
import { ParseCurlInput, ParsedCurl } from "./models/curl";
import { ChosenDataFolder, DataLocation, MoveDataInput } from "./models/data-location";
import { RequestSettings, UpdateRequestSettingsInput } from "./models/request-settings";
import {
  ContainerInput,
  ContainerSettings,
  InheritedAuth,
  SaveContainerSettingsInput,
} from "./models/scripts";
import { HistoryEntry } from "./models/history";
import { OAuth2Input, OAuth2TokenStatus } from "./models/oauth2";
import {
  AddClientCertificateInput,
  NetworkSettingsView,
  RemoveCertificateInput,
  UpdateNetworkSettingsInput,
} from "./models/network-settings";
import {
  ChosenImport,
  ExportResult,
  ExportWorkspaceInput,
  ImportReport,
  RunImportInput,
  ExportCollectionInput,
  ExportSelectionInput,
  ImportIntoWorkspaceInput,
} from "./models/interop";
import { CancelRequestInput, ResponseView, SendRequestInput } from "./models/http-exchange";
import { OpenTabs, SaveOpenTabsInput } from "./models/open-tabs";
import { RequestDefinition, RequestItemInput, SaveRequestInput } from "./models/request";
import { SecurityStatus } from "./models/security-status";
import {
  CreateWorkspaceInput,
  DeleteWorkspaceInput,
  LockWorkspaceInput,
  RenameWorkspaceInput,
  UnlockWorkspaceInput,
  WorkspaceSummary,
} from "./models/workspace";

const Done = z.literal(true);

/**
 * Every message the renderer may send to main. Nothing outside this list exists.
 * Main validates every input AND every output against these schemas.
 */
/** A plain #rrggbb colour (title bar colours from the colour theme). */
const HexColor = z.string().regex(/^#[0-9a-f]{6}$/i);

export const ipcContract = {
  "app:get-security-status": { input: z.undefined(), output: SecurityStatus },

  "workspaces:list": { input: z.undefined(), output: z.array(WorkspaceSummary) },
  "storage:get-location": { input: z.undefined(), output: DataLocation },
  "storage:choose-folder": { input: z.undefined(), output: ChosenDataFolder.nullable() },
  "storage:move": { input: MoveDataInput, output: Done },
  "storage:restarts-itself": { input: z.undefined(), output: z.boolean() },
  "storage:move-to-standard": { input: z.undefined(), output: Done },
  "workspaces:get-last": { input: z.undefined(), output: WorkspaceSummary.nullable() },
  "workspaces:set-last": { input: WorkspaceScoped, output: Done },
  "workspaces:create": { input: CreateWorkspaceInput, output: WorkspaceSummary },
  "workspaces:unlock": { input: UnlockWorkspaceInput, output: WorkspaceSummary },
  "workspaces:lock": { input: LockWorkspaceInput, output: WorkspaceSummary },
  "workspaces:rename": { input: RenameWorkspaceInput, output: WorkspaceSummary },
  "workspaces:delete": { input: DeleteWorkspaceInput, output: Done },

  "import:choose-files": { input: z.undefined(), output: ChosenImport.nullable() },
  "import:run": { input: RunImportInput, output: ImportReport },
  "export:workspace": { input: ExportWorkspaceInput, output: ExportResult },

  "window:set-zoom": { input: z.object({ factor: z.number().min(0.75).max(1.5) }), output: Done },
  "window:set-modal": { input: z.object({ isOpen: z.boolean() }), output: Done },
  "window:set-theme": {
    input: z.object({
      theme: z.enum(["light", "dark"]),
      colors: z.object({ surface: HexColor, symbol: HexColor }).optional(),
    }),
    output: Done,
  },
  "oauth2:status": { input: OAuth2Input, output: OAuth2TokenStatus },
  "oauth2:get-token": { input: OAuth2Input, output: OAuth2TokenStatus },
  "oauth2:clear": { input: OAuth2Input, output: OAuth2TokenStatus },
  "import:parse-curl": { input: ParseCurlInput, output: ParsedCurl },
  "import:into-workspace": { input: ImportIntoWorkspaceInput, output: ImportReport },
  "export:collection": { input: ExportCollectionInput, output: ExportResult },
  "export:selection": { input: ExportSelectionInput, output: ExportResult },
  "request-settings:get": { input: WorkspaceScoped, output: RequestSettings },
  "request-settings:update": { input: UpdateRequestSettingsInput, output: RequestSettings },
  "network:get": { input: WorkspaceScoped, output: NetworkSettingsView },
  "network:update": { input: UpdateNetworkSettingsInput, output: NetworkSettingsView },
  "network:add-ca": { input: WorkspaceScoped, output: NetworkSettingsView.nullable() },
  "network:add-client-certificate": {
    input: AddClientCertificateInput,
    output: NetworkSettingsView.nullable(),
  },
  "network:remove-certificate": { input: RemoveCertificateInput, output: NetworkSettingsView },

  "collections:get-tree": { input: WorkspaceScoped, output: CollectionTree },
  "collections:create": { input: CreateCollectionInput, output: Collection },
  "collections:create-item": { input: CreateItemInput, output: TreeItem },
  "collections:rename": { input: RenameEntityInput, output: Done },
  "collections:delete": { input: EntityInput, output: Done },
  "collections:move-item": { input: MoveItemInput, output: Done },
  "collections:move": { input: MoveCollectionInput, output: Done },
  "collections:duplicate": { input: EntityInput, output: z.object({ id: EntityId }) },
  "collections:get-auth": { input: ContainerAuthInput, output: RequestAuth },
  "collections:save-auth": { input: ContainerAuthInput.extend({ auth: RequestAuth }), output: Done },

  "containers:get-settings": { input: ContainerInput, output: ContainerSettings },
  "containers:save-settings": { input: SaveContainerSettingsInput, output: Done },
  "requests:inherited-auth": { input: RequestItemInput, output: InheritedAuth },
  "requests:get": { input: RequestItemInput, output: RequestDefinition },
  "requests:copy-id": { input: RequestItemInput, output: Done },
  "requests:save": { input: SaveRequestInput, output: Done },

  "environments:list": { input: WorkspaceScoped, output: z.array(Environment) },
  "environments:create": { input: CreateEnvironmentInput, output: Environment },
  "environments:rename": { input: RenameEntityInput, output: Done },
  "environments:delete": { input: EntityInput, output: Done },
  "environments:duplicate": { input: EntityInput, output: Environment },
  "environments:set-protected": { input: ProtectEnvironmentInput, output: Done },
  "environments:set-color": { input: ColorEnvironmentInput, output: Done },
  "variables:get": { input: OwnerInput, output: VariableList },
  "variables:save": { input: SaveVariablesInput, output: VariableList },
  "variables:list-visible": { input: VariableNamesInput, output: z.array(VisibleVariable).max(5_000) },
  "variables:set-value": { input: SetVariableValueInput, output: Done },

  "http:send": { input: SendRequestInput, output: ResponseView },
  "http:cancel": { input: CancelRequestInput, output: Done },
  "http:copy-as-curl": { input: SendRequestInput, output: z.object({ containsSecrets: z.boolean() }) },

  "cookies:list": { input: WorkspaceScoped, output: z.array(StoredCookie) },
  "cookies:delete": { input: CookieKeyInput, output: Done },
  "cookies:clear": { input: WorkspaceScoped, output: Done },

  "history:list": { input: WorkspaceScoped, output: z.array(HistoryEntry) },
  "history:clear": { input: WorkspaceScoped, output: Done },

  "tabs:get": { input: WorkspaceScoped, output: OpenTabs },
  "tabs:save": { input: SaveOpenTabsInput, output: Done },
} as const;

export type Channel = keyof typeof ipcContract;
export type ChannelInput<C extends Channel> = z.input<(typeof ipcContract)[C]["input"]>;
export type ChannelOutput<C extends Channel> = z.output<(typeof ipcContract)[C]["output"]>;
