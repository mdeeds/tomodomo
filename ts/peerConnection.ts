import Peer, { DataConnection } from "peerjs";

class ResolveReject {
  resolve: Function;
  reject: Function;
  timeout: NodeJS.Timeout;
  constructor(resolve: Function, reject: Function) {
    this.resolve = resolve;
    this.reject = reject;
    this.timeout = setTimeout(() => {
      reject("Deadline exceeded.");
    }, 5000);
  }
}

export class PeerConnection {
  private peer: Peer;
  private ready: boolean;

  private peers: Map<string, DataConnection>;
  private responses: Map<number, ResolveReject>;
  private callbacks: Map<string, Function>;
  private readyCallbacks: Function[];

  constructor(id: string) {
    this.peer = new Peer(id);
    this.peers = new Map<string, DataConnection>();
    this.responses = new Map<number, ResolveReject>();
    this.callbacks = new Map<string, Function>();
    this.ready = false;
    this.readyCallbacks = [];
    this.peer.on('open', (id: string) => {
      this.ready = true;
      for (const readyCallback of this.readyCallbacks) {
        readyCallback(this);
      }
    })
    this.peer.on('connection', (conn) => {
      conn.on('data', (data: string) => {
        // First check if this is a timestamped response that we asked for.
        const m = data.match(/<(\d+)<(.*)/);
        if (m !== null) {
          const timestamp = parseInt(m[1]);
          if (this.responses.has(timestamp)) {
            const rr = this.responses.get(timestamp);
            clearTimeout(rr.timeout);
            this.responses.delete(timestamp);
            rr.resolve(m[2]);
          } else {
          }
          return;
        }
        // Check if this is a timestamped request from someone.  We will
        // need to use this timestamp on the reply.
        const m2 = data.match(/>(\d+)>(.*)/);
        let responseTag = '';
        if (m2 !== null) {
          const timestamp = parseInt(m2[1]);
          data = m2[2];
          responseTag = `<${timestamp}<`;
        }
        if (this.callbacks.has(data)) {
          const responseMessage = this.callbacks.get(data)();
          if (responseMessage instanceof Promise) {
            responseMessage.then((message) => {
              this.send(conn.peer, responseTag + message);
            });
          } else {
            this.send(conn.peer, responseTag + responseMessage);
          }
        } else {
          for (const prefix of this.callbacks.keys()) {
            if (data.startsWith(prefix)) {
              const value = data.substr(prefix.length);
              const response = this.callbacks.get(prefix)(value);
              if (response) {
                this.send(conn.peer, responseTag + response);
              }
            }
          }
        }
      });
    });
  }

  async waitReady(): Promise<PeerConnection> {
    return new Promise((resolve, reject) => {
      if (this.ready) {
        resolve(this);
      } else {
        this.readyCallbacks.push(resolve);
      }
    });
  }

  id() {
    return this.peer.id;
  }

  addCallback(keyPhrase: string, callback: Function) {
    this.callbacks.set(keyPhrase, callback);
  }

  send(targetId: string, message: string) {
    if (targetId === this.id()) {
      return;
    }
    let messageSent = false;
    if (this.peers.has(targetId)) {
      const conn = this.peers.get(targetId);
      if (conn.open) {
        conn.send(message);
        messageSent = true;
      } else {
      }
    }
    if (!messageSent) {
      const conn = this.peer.connect(targetId);
      this.peers.set(targetId, conn);
      conn.on('open', () => {
        conn.send(message);
      });
    }
  }

  async sendAndPromiseResponse(targetId: string, message: string)
    : Promise<string> {
    const timestamp = Math.trunc(window.performance.now());
    this.waitReady()
      .then(() => {
        this.send(targetId, `>${timestamp.toFixed(0)}>${message}`);
      });
    return new Promise((resolve, reject) => {
      const rr = new ResolveReject(resolve, reject);
      this.responses.set(timestamp, rr);
    });
  }

}