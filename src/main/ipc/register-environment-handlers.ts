import type { IpcRouter } from "./ipc-router";
import type { IpcServices } from "./ipc-services";

export function registerEnvironmentHandlers(router: IpcRouter, { data, variables }: IpcServices): void {
  router.handle("environments:list", ({ workspaceId }) => data.environments(workspaceId).list());
  router.handle("environments:create", ({ workspaceId, name }) =>
    data.environments(workspaceId).create(name),
  );
  router.handle("environments:rename", ({ workspaceId, id, name }) => {
    data.environments(workspaceId).rename(id, name);
    return true as const;
  });
  router.handle("environments:set-color", ({ workspaceId, id, color }) => {
    data.environments(workspaceId).setColor(id, color);
    return true as const;
  });
  router.handle("environments:set-protected", ({ workspaceId, id, isProtected }) => {
    data.environments(workspaceId).setProtected(id, isProtected);
    return true as const;
  });
  router.handle("environments:delete", ({ workspaceId, id }) => {
    data.environments(workspaceId).delete(id);
    return true as const;
  });
  router.handle("environments:duplicate", ({ workspaceId, id }) =>
    variables.duplicateEnvironment(workspaceId, id),
  );
  registerVariableHandlers(router, variables);
}

function registerVariableHandlers(router: IpcRouter, variables: IpcServices["variables"]): void {
  router.handle("variables:get", ({ workspaceId, owner }) => variables.getVariables(workspaceId, owner));
  router.handle("variables:save", ({ workspaceId, owner, variables: views }) =>
    variables.saveVariables(workspaceId, owner, views),
  );
  router.handle("variables:list-visible", ({ workspaceId, ...context }) =>
    variables.listVisible(workspaceId, context),
  );
  router.handle("variables:set-value", ({ workspaceId, owner, key, value }) => {
    variables.setValue(workspaceId, owner, { key, value });
    return true as const;
  });
}
