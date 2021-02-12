export class GameFrame {
  private iFrame: HTMLIFrameElement;
  constructor() {
    this.iFrame = document.createElement('iframe');
    this.iFrame.id = "GameFrame";
    this.iFrame.allow = "allow-scripts";
    this.iFrame.src = "about:blank";
    const body = document.getElementsByTagName('body')[0];
    body.appendChild(this.iFrame);
  }

  setContent(html: string) {
    const dataUrl = `data:text/html;base64,${btoa(html)}`;
    this.iFrame.src = dataUrl;
  }

  setScript(javascript: string) {
    const html =
      `<head><script>${javascript}</script>` +
      `<body onload="main()"></body>`;
  }
}