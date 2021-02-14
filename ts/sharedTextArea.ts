import beautify from "js-beautify";

import { GameFrame } from "./gameFrame";
import { HeartbeatGroup } from "./heartbeatGroup";
import { Edit, Levenshtein } from "./levenshtein";

class ShadowPosition {
  ownerId: string;
  x: number;
  y: number;
  hue: number;
}

class TextUpdate {
  sourcePosition: number;
  encodedText: string;
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
      (serialized: string) => {
        const update: TextUpdate = JSON.parse(serialized) as TextUpdate;
        console.log(`Recieved ${serialized.length} bytes.`);
        const newText = atob(update.encodedText);
        const oldText = this.div.value;
        const charsAdded = newText.length - oldText.length;
        const insertBefore = this.div.selectionStart > update.sourcePosition;
        const newStart = this.div.selectionStart + (insertBefore ? charsAdded : 0);
        const newEnd = this.div.selectionEnd + (insertBefore ? charsAdded : 0);
        console.log(`Delta: ${charsAdded}, `
          + `this position: ${this.div.selectionStart}, `
          + `incoming position: ${update.sourcePosition}`);
        this.div.value = newText;
        this.div.setSelectionRange(newStart, newEnd);
      }
    )

    this.heartbeatGroup.getConnection().addCallback("edit: ",
      (serialized: string) => {
        const selectionStart = this.div.selectionStart;
        const selectionEnd = this.div.selectionEnd;
        const edits: Edit<string>[] = JSON.parse(serialized);
        const lines: string[] = Levenshtein.splitLines(this.div.value);
        Levenshtein.applyEdits<string>(lines, edits);
        this.div.value = Levenshtein.combineLines(lines);
        this.div.setSelectionRange(selectionStart, selectionEnd);
      });

    this.heartbeatGroup.addMeetCallback((peerId: string) => {
      const update = new TextUpdate();
      update.encodedText = btoa(this.div.value);
      update.sourcePosition = this.div.selectionStart;
      const message = `text: ${JSON.stringify(update)}`;
      this.heartbeatGroup.getConnection().send(peerId, message);
    })

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

      const edits = Levenshtein.distance<string>(
        Levenshtein.splitLines(previousText),
        Levenshtein.splitLines(this.div.value));
      const message = `edit: ${JSON.stringify(edits)}`;
      this.heartbeatGroup.broadcast(message);
      previousText = this.div.value;
    })
  }

  sendCode() {
    const code = this.div.value;
    console.log(`Uploading ${code.length} bytes.`);
    this.gameFrame.setScript(code);
    localStorage.setItem('tomodomo/code', code);
  }

  format() {
    const code = beautify(this.div.value, {
      "indent_size": 2,
      "indent_char": " ",
      "max_preserve_newlines": 1,
      "preserve_newlines": true,
      "keep_array_indentation": false,
      "break_chained_methods": false,
      "brace_style": "collapse",
      "space_before_conditional": true,
      "unescape_strings": false,
      "jslint_happy": false,
      "end_with_newline": false,
      "wrap_line_length": 80,
      "comma_first": false,
      "e4x": false,
      "indent_empty_lines": false
    });
    this.div.value = code;
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