import { ipcMain, type IpcMainInvokeEvent } from "electron";
import type { z } from "zod";
import { ipcContract, type Channel, type ChannelOutput } from "@shared/ipc-contract";
import type { Result } from "@shared/result";
import { InvalidInput, ReqLabError } from "../errors";
import { createLogger } from "../logging/logger";
import { assertTrustedSender } from "./assert-trusted-sender";

const log = createLogger("ipc");

type ParsedInput<C extends Channel> = z.output<(typeof ipcContract)[C]["input"]>;
type Handler<C extends Channel> = (input: ParsedInput<C>) => ChannelOutput<C> | Promise<ChannelOutput<C>>;

/**
 * The single entry point for messages from the UI. For every call it:
 * checks the sender, validates the input, runs the handler, validates the output,
 * and turns any failure into a safe { ok: false } result (no stack traces cross).
 */
export class IpcRouter {
  constructor(private readonly onActivity: () => void) {}

  handle<C extends Channel>(channel: C, handler: Handler<C>): void {
    ipcMain.handle(channel, (event, rawInput: unknown) => this.run(channel, handler, { event, rawInput }));
  }

  private async run<C extends Channel>(
    channel: C,
    handler: Handler<C>,
    call: { event: IpcMainInvokeEvent; rawInput: unknown },
  ): Promise<Result<ChannelOutput<C>>> {
    try {
      assertTrustedSender(call.event);
      this.onActivity();
      const input = parseInput(channel, call.rawInput);
      const output = await handler(input);
      return { ok: true, value: ipcContract[channel].output.parse(output) as ChannelOutput<C> };
    } catch (error) {
      return toFailure(channel, error);
    }
  }
}

function parseInput<C extends Channel>(channel: C, rawInput: unknown): ParsedInput<C> {
  const parsed = ipcContract[channel].input.safeParse(rawInput);
  if (parsed.success) return parsed.data as ParsedInput<C>;
  const issue = parsed.error.issues[0];
  const field = issue?.path.join(".") ?? "input";
  throw new InvalidInput(`${field}: ${issue?.message ?? "invalid value"}`);
}

function toFailure(channel: Channel, error: unknown): Result<never> {
  if (error instanceof ReqLabError) {
    return { ok: false, error: { code: error.code, message: error.message } };
  }
  log.error(`Unexpected failure on ${channel}`, error);
  return {
    ok: false,
    error: { code: "internal-error", message: "Something went wrong. See the log for details." },
  };
}
