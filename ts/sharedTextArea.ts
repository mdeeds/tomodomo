import { GameFrame } from "./gameFrame";
import { HeartbeatGroup } from "./heartbeatGroup";

class ShadowPosition {
  ownerId: string;
  x: number;
  y: number;
  hue: number;
}

export class SharedTextArea {
  private heartbeatGroup: HeartbeatGroup;
  private id: string;
  private div: HTMLTextAreaElement;
  private shadows: Map<string, ShadowPosition>;
  private shadowImages: Map<string, HTMLImageElement>;
  private gameFrame: GameFrame;
  private updateTimeout: NodeJS.Timeout;
  constructor(heartbeatGroup: HeartbeatGroup, gameFrame: GameFrame) {
    this.heartbeatGroup = heartbeatGroup;
    this.gameFrame = gameFrame;
    this.heartbeatGroup.getConnection().waitReady().then(
      (conn) => {
        this.id = conn.id();
        const sp = new ShadowPosition();
        sp.ownerId = this.id;
        sp.hue = Math.random();
        console.log(`This id: ${this.id}`);
        this.shadows.set(this.id, sp)
        this.updateShadows();

        this.div.addEventListener('mousemove',
          (ev) => { this.handleMove(ev); });
        this.div.addEventListener('scroll',
          (ev) => { this.handleMove(ev); })
      });
    this.div = document.createElement('textarea');
    if (localStorage.getItem('tomodomo/code')) {
      this.div.value = localStorage.getItem('tomodomo/code');
    }
    this.sendCode();

    this.shadows = new Map<string, ShadowPosition>();
    this.shadowImages = new Map<string, HTMLImageElement>();

    const body = document.getElementsByTagName('body')[0];
    this.div.contentEditable = "true";
    this.div.spellcheck = false;
    this.div.id = "SharedTextArea";
    body.appendChild(this.div);

    this.heartbeatGroup.getConnection().addCallback("text: ",
      (text: string) => {
        console.log(`Recieved ${text.length} bytes.`);
        const oldPosition = this.div.selectionStart;
        this.div.value = atob(text);
        this.div.setSelectionRange(oldPosition, oldPosition);
      }
    )

    this.heartbeatGroup.getConnection().addCallback("shadow: ",
      (serialized: string) => {
        const shadow = JSON.parse(serialized) as ShadowPosition;
        this.shadows.set(shadow.ownerId, shadow);
        this.updateShadows();
      });

    let previousText = this.div.value;
    this.div.addEventListener('keyup', (ev) => {
      if (this.div.value.length === 0 || previousText === this.div.value) {
        return;
      }
      clearTimeout(this.updateTimeout);
      this.updateTimeout = setTimeout(() => { this.sendCode(); }, 1000);
      previousText = this.div.value;
      const message = `text: ${btoa(this.div.value)}`;
      this.heartbeatGroup.broadcast(message);
    })
  }

  sendCode() {
    const code = this.div.value;
    console.log(`Uploading ${code} bytes.`);
    this.gameFrame.setScript(code);
    localStorage.setItem('tomodomo/code', code);
  }

  private lastX: number;
  private lastY: number;
  handleMove(ev: Event) {
    const shadow = this.shadows.get(this.id);
    if (ev instanceof MouseEvent) {
      shadow.x = ev.clientX;
      shadow.y = ev.clientY + this.div.scrollTop;
      this.lastX = ev.clientX;
      this.lastY = ev.clientY;
    } else {
      shadow.x = this.lastX;
      shadow.y = this.lastY + this.div.scrollTop;
    }
    this.heartbeatGroup.broadcast(`shadow: ${JSON.stringify(shadow)}`);
    this.updateShadows();
  }

  updateShadows() {
    for (const [id, shadow] of this.shadows.entries()) {
      if (!this.shadowImages.has(id)) {
        console.log(`Add shadow: ${id}`);
        const body = document.getElementsByTagName('body')[0];
        const shadowImg = document.createElement('img');
        shadowImg.src = "Shadow.png";
        shadowImg.classList.add("shadow");
        shadowImg.style.setProperty('filter', `hue-rotate(${shadow.hue}turn)`);

        this.shadowImages.set(id, shadowImg);
        body.appendChild(shadowImg);
      }
      const shadowImg = this.shadowImages.get(id);
      shadowImg.style.left = `${shadow.x - 20}px`;
      shadowImg.style.top = `${shadow.y - this.div.scrollTop - 20}px`;
    }
  }
}