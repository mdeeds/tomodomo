import { GameFrame } from "./gameFrame";
import { HeartbeatGroup } from "./heartbeatGroup";
import { SharedTextArea } from "./sharedTextArea";

const body = document.getElementsByTagName('body')[0];

const url = new URL(document.URL);

const username = url.searchParams.get('login');

if (!username) {
  const loginDiv = document.createElement('div');
  body.appendChild(loginDiv);
  loginDiv.innerText = "Login: ";
  const usernameSpan = document.createElement('span');
  usernameSpan.spellcheck = false;
  usernameSpan.innerText = " ";
  loginDiv.appendChild(usernameSpan);
  usernameSpan.contentEditable = "true";
  const forward = document.createElement('a');
  body.appendChild(forward);
  const updateUsername = () => {
    const loginName = usernameSpan.innerText.trim();
    if (loginName.match(/^[A-Za-z][A-Za-z0-9]+$/)) {
      const newUrl = new URL(url.href);
      newUrl.searchParams.append("login", loginName);
      forward.href = newUrl.href;
      forward.innerText = "Let's go!";
    } else {
      forward.href = "";
      forward.innerText = "";
    }
  }
  usernameSpan.addEventListener('keypress', updateUsername);
  usernameSpan.addEventListener('keyup', updateUsername);

} else {
  const joinId = url.searchParams.get('join');
  const heartbeatGroup = new HeartbeatGroup(username, joinId);
  const joinDiv = document.createElement('div');
  joinDiv.id = "joinDiv";
  joinDiv.innerText = "Establishing connection...";
  body.appendChild(joinDiv);
  if (joinId) {
    const joinUrl = new URL(document.URL);
    joinUrl.searchParams.set('join', joinId);
    joinUrl.searchParams.delete('login');
    joinDiv.innerText = joinUrl.href;
  } else {
    heartbeatGroup.getConnection().waitReady().then((conn) => {
      const joinUrl = new URL(document.URL);
      joinUrl.searchParams.set('join', conn.id());
      joinUrl.searchParams.delete('login');
      joinDiv.innerText = joinUrl.href;
    })
  }

  const b = new SharedTextArea(heartbeatGroup);
  const g = new GameFrame();
  g.setContent("<h1>Hello, World!</h1>");
}