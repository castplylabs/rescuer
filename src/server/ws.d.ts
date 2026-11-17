declare module 'ws' {
  import type { IncomingMessage } from 'node:http';
  import type { Server } from 'node:http';
  import type { Duplex } from 'node:stream';

  export class WebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readonly readyState: number;
    send(data: string | Buffer): void;
    close(code?: number, reason?: string): void;
    on(event: 'message', listener: (data: Buffer | ArrayBuffer | Buffer[]) => void): this;
    on(event: 'close', listener: (code: number, reason: Buffer) => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
  }

  export class WebSocketServer {
    constructor(options: { server?: Server; path?: string; noServer?: boolean });
    on(event: 'connection', listener: (ws: WebSocket, req: IncomingMessage) => void): this;
    handleUpgrade(
      request: IncomingMessage,
      socket: Duplex,
      head: Buffer,
      callback: (ws: WebSocket) => void
    ): void;
  }
}
