const { desktopCapturer, remote, ipcRenderer } = require('electron');
const { eventTypes } = require('../shared');
const { methodize } = require('./utils');

const { Menu } = remote

let allDisplays = []
let currentDisplay

const setProperty = methodize(document.documentElement.style, 'setProperty')

const applyMargin = (value, gain) => {
  if(value < gain) return 0
  if(value > 1-gain) return 1
  return (value - gain) / (1 - 2*gain)
}

const getOffset = (x, y, currentDisplay, margin = 0.12) => {
  if (currentDisplay) {
    const { bounds } = currentDisplay
    const intermediate = {
      x: (x - bounds.x) / bounds.width ,
      y: (y - bounds.y) / bounds.height,
    }

    return {
      x: applyMargin(intermediate.x, margin),
      y: applyMargin(intermediate.y, margin),
    }
  }

  return { x , y }
}

// Update CSS variables when new cursor coordinates are received
ipcRenderer.on(eventTypes.updateCursor, (_event, cursorPosition) => {
  const { x, y } = cursorPosition
  const offset = getOffset(x, y, currentDisplay)
  setProperty('--x-offset', offset.x)
  setProperty('--y-offset', offset.y)
});

// Since all of the application is a huge "drag handle", also act like a titlebar
function maximizeWindow () {
  const window = remote.BrowserWindow.getFocusedWindow();
  window.isMaximized() ? window.unmaximize() : window.maximize();
}
document.body.addEventListener('dblclick', maximizeWindow)

const videoSelectBtn = document.getElementById('videoSelectBtn');
videoSelectBtn.onclick = getVideoSources;

ipcRenderer.on(eventTypes.updateDisplays, (event, payload) => {
  allDisplays = payload
});

// Get the available video sources
async function getVideoSources() {
  const sources = await desktopCapturer.getSources({
    types: ['screen']
  });

  const videoOptionsMenu = Menu.buildFromTemplate(
    sources.map(source => {
      return {
        label: source.name,
        click: () => {
          videoSelectBtn.innerText = source.name;
          onSetSource(source)
        }
      };
    })
  );

  videoOptionsMenu.popup();
}

async function onSetSource(source) {
  const displayId = parseInt(source.display_id)
  currentDisplay = allDisplays.find((s) => s.id === displayId)

  document.body.classList.add('active')

  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id,
        minWidth: currentDisplay.bounds.width * currentDisplay.scaleFactor 
      },
    }
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  const videoElement = document.querySelector('video')
  videoElement.srcObject = stream;
  videoElement.width = currentDisplay.bounds.width
  videoElement.height = currentDisplay.bounds.height
  videoElement.onloadedmetadata = () => videoElement.play()

  setProperty(
    '--compensate', 
    (innerWidth/innerHeight) / (currentDisplay.bounds.width / currentDisplay.bounds.height)
  )

  setProperty(
    '--width-ratio', 
   currentDisplay.bounds.width / innerWidth
  )
}
