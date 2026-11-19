import type { RequestAuth } from "@shared/models/auth";
import type { KeyValue, RequestBody, RequestDefinition } from "@shared/models/request";
import type { VariableResolver } from "../../variables/variable-resolver";
import type { VariableService } from "../../variables/variable-service";
import type { PipelineStep } from "../request-context";

/** Replaces {{variables}} in the URL, headers, body and auth, using environment → collection → globals. */
export function resolveVariables(variables: VariableService): PipelineStep {
  return (context) => {
    const { workspaceId, environmentId, collectionId } = context.input;
    context.scopes = variables.resolveScopes(
      workspaceId,
      { environmentId, collectionId },
      context.localVariables,
    );
    context.resolved = resolveDefinition(context.definition, context.scopes.resolver);
  };
}

function resolveDefinition(definition: RequestDefinition, resolver: VariableResolver): RequestDefinition {
  const resolveRows = (rows: KeyValue[]): KeyValue[] =>
    rows.map((row) => ({ ...row, key: resolver.resolve(row.key), value: resolver.resolve(row.value) }));
  return {
    ...definition,
    url: resolver.resolve(definition.url),
    params: resolveRows(definition.params),
    headers: resolveRows(definition.headers),
    ...(definition.pathVariables === undefined
      ? {}
      : { pathVariables: resolveRows(definition.pathVariables) }),
    body: resolveBody(definition.body, resolver, resolveRows),
    auth: resolveAuth(definition.auth, resolver),
  };
}

/** Every text field of the auth (usernames, tokens, keys, payloads); choices like "algorithm" stay as they are. */
function resolveAuth(auth: RequestAuth, resolver: VariableResolver): RequestAuth {
  const resolved: Record<string, unknown> = { ...auth };
  for (const [field, value] of Object.entries(auth)) {
    if (typeof value === "string" && !UNRESOLVED_AUTH_FIELDS.has(field))
      resolved[field] = resolver.resolve(value);
  }
  return resolved as RequestAuth;
}

const UNRESOLVED_AUTH_FIELDS = new Set(["type", "algorithm", "addTo"]);

function resolveBody(
  body: RequestBody,
  resolver: VariableResolver,
  resolveRows: (rows: KeyValue[]) => KeyValue[],
): RequestBody {
  switch (body.type) {
    case "none":
      return body;
    case "json":
    case "raw":
      return { ...body, text: resolver.resolve(body.text) };
    case "urlencoded":
    case "form-data":
      return { ...body, fields: resolveRows(body.fields) };
    case "graphql":
      return { ...body, query: resolver.resolve(body.query), variables: resolver.resolve(body.variables) };
  }
}
