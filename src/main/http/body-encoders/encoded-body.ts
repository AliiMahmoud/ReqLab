export interface EncodedBody {
  bytes: Buffer;
  /** Used only when the user did not set a Content-Type header. */
  contentType: string;
}
