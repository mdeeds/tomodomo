import { PeerConnection } from "./peerConnection";

class PeerHealth {
  readonly peerId: string;
  readonly username: string;
  readonly statusElement: HTMLDivElement;
  private lastPingTime: number;
  private deathTimer: NodeJS.Timeout;
  constructor(peerId: string, username: string, container: HTMLDivElement) {
    this.peerId = peerId;
    this.username = username;
    this.statusElement = document.createElement('div');
    this.statusElement.innerText = `♡ ${username}`;
    this.statusElement.classList.add('pulse');
    container.appendChild(this.statusElement);
    this.update();
  }

  update() {
    this.lastPingTime = window.performance.now();
    this.statusElement.classList.remove('pulse');
    setTimeout(() => { this.statusElement.classList.add('pulse') }, 10);

    if (this.deathTimer) {
      clearTimeout(this.deathTimer);
    }
    this.deathTimer = setTimeout(() => this.die(), 10000);
  }

  die() {
    this.statusElement.innerText = `🕱 ${this.username}`;
  }
}

export class HeartbeatGroup {
  private username: string;
  private connection: PeerConnection;
  // Connection IDs of this and others in the circle.
  private healthMap: Map<string, PeerHealth>;
  private status: HTMLDivElement;
  private leader: boolean;
  private leaderId: string;

  constructor(username: string, joinId: string = null) {
    this.username = username;
    this.connection = new PeerConnection(null);
    this.healthMap = new Map<string, PeerHealth>();

    this.status = document.createElement('div');
    this.status.innerText = "Status";
    this.status.classList.add("status")

    this.connection.waitReady().then(() => {
      this.healthMap.set(this.connection.id(), new PeerHealth(
        this.connection.id(), username, this.status));
      if (joinId) {
        const thumpMessage = this.makeThump();
        this.connection.send(joinId, thumpMessage);
      }
      this.beat();
    });

    if (joinId) {
      this.leaderId = joinId;
      this.healthMap.set(joinId, null)
      this.leader = false;
    } else {
      this.leader = true;
    }

    document.getElementsByTagName('body')[0].appendChild(this.status);

    this.connection.addCallback("thump: ",
      (peers: string) => {
        const peerKVs = peers.split(',');
        for (let i = 0; i < peerKVs.length; ++i) {
          const peerKV = peerKVs[i];
          let peerUser: string;
          let peerId: string;
          [peerId, peerUser] = peerKV.split('=');
          if (peerId === this.getConnection().id()) {
            continue;
          }
          if (!this.healthMap.has(peerId) ||
            this.healthMap.get(peerId) === null) {
            this.healthMap.set(peerId,
              new PeerHealth(peerId, peerUser, this.status));
          } else {
            if (i === 0) {
              this.healthMap.get(peerId).update();
            }
          }
        }
      })
  }

  isLeader() {
    return this.leader;
  }

  getConnection() {
    return this.connection;
  }

  getUsername() {
    return this.username;
  }

  broadcast(message: string) {
    for (const other of this.healthMap.keys()) {
      if (other !== this.connection.id()) {
        this.connection.send(other, message);
      }
    }
  }

  sendToLeader(message: string): Promise<string> {
    if (!this.leaderId) {
    }
    return this.connection.sendAndPromiseResponse(this.leaderId, message);
  }

  private makeThump(): string {
    const otherList: string[] = [`${this.connection.id()}=${this.username}`];
    this.healthMap.get(this.connection.id()).update();
    for (const [peerId, healthStatus] of this.healthMap) {
      if (healthStatus === null) {
        continue;
      }
      otherList.push(`${peerId}=${healthStatus.username}`);
    }
    return `thump: ${otherList.join(',')}`;
  }

  private beat() {
    const thumpMessage = this.makeThump();
    this.broadcast(thumpMessage);
    setTimeout(() => this.beat(), 600);
  }
}