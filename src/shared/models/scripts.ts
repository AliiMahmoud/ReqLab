import { z } from "zod";
import { MAX_DESCRIPTION_LENGTH } from "../limits";
import { RequestAuth } from "./auth";
import { EntityId, WorkspaceScoped } from "./collection";

export const MAX_SCRIPT_LENGTH = 100_000;

/** Postman-style scripts: before the request is sent, and after its response arrives. */
export const Scripts = z.object({
  preRequest: z.string().max(MAX_SCRIPT_LENGTH).default(""),
  postResponse: z.string().max(MAX_SCRIPT_LENGTH).default(""),
});
export type Scripts = z.infer<typeof Scripts>;

export const NO_SCRIPTS: Scripts = { preRequest: "", postResponse: "" };

/** A collection's or folder's settings window: Overview, Authorization and Scripts. */
export const ContainerSettings = z.object({
  description: z.string().max(MAX_DESCRIPTION_LENGTH),
  auth: RequestAuth,
  scripts: Scripts,
});
export type ContainerSettings = z.infer<typeof ContainerSettings>;

export const ContainerInput = WorkspaceScoped.extend({ id: EntityId });
export const SaveContainerSettingsInput = ContainerInput.extend({ settings: ContainerSettings });

/** What an "Inherit" request really uses, and from which folder or collection. */
export const InheritedAuth = z.object({
  type: z.string(),
  from: z.object({ id: EntityId, name: z.string(), kind: z.enum(["collection", "folder"]) }).nullable(),
});
export type InheritedAuth = z.infer<typeof InheritedAuth>;
