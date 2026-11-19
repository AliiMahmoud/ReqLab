import type { PostmanEvent } from "../postman-scripts";
/** The parts of Postman's Collection v2.1 format that ReqLab writes. */
export interface PostmanRow {
  key: string;
  value: string;
  type?: string;
  description?: string;
  disabled?: true;
}

export interface PostmanUrl {
  raw: string;
  protocol?: string;
  host?: string[];
  port?: string;
  path?: string[];
  query?: PostmanRow[];
  variable?: PostmanRow[];
}

export interface PostmanAuth {
  type: string;
  [settings: string]: string | PostmanRow[];
}

export interface PostmanRequestItem {
  name: string;
  event?: PostmanEvent[];
  request: {
    auth?: PostmanAuth;
    method: string;
    header: PostmanRow[];
    body?: Record<string, unknown>;
    url: PostmanUrl;
    description?: string;
  };
  response: never[];
}

export interface PostmanFolder {
  name: string;
  event?: PostmanEvent[];
  description?: string;
  auth?: PostmanAuth;
  item: (PostmanFolder | PostmanRequestItem)[];
}

export interface PostmanCollection {
  event?: PostmanEvent[];
  info: { _postman_id: string; name: string; description?: string; schema: string };
  item: (PostmanFolder | PostmanRequestItem)[];
  auth?: PostmanAuth;
  variable?: PostmanRow[];
}
