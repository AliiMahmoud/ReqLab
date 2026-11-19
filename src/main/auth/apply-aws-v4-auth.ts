import { RequestFailed } from "../errors";
import { findHeader, type PreparedRequest } from "../http/http-types";
import { signAwsV4, type AwsCredentials } from "./sign-aws-v4";

export function applyAwsV4Auth(credentials: AwsCredentials, request: PreparedRequest): PreparedRequest {
  if (findHeader(request.headers, "authorization") !== undefined) return request;
  if (
    credentials.accessKey === "" ||
    credentials.secretKey === "" ||
    credentials.region === "" ||
    credentials.service === ""
  ) {
    throw new RequestFailed("AWS Signature needs an access key, secret key, region and service.");
  }
  return { ...request, headers: [...request.headers, ...signAwsV4(request, credentials, new Date())] };
}
