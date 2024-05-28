const { desktopCapturer, remote, ipcRenderer } = require('electron');
const { eventTypes } = require('../shared');

const { Menu } = remote

const methodize = (obj, key) => obj[key].bind(obj)
const setProperty = methodize(document.documentElement.style, 'setProperty')

const distortion = (value, gain) => {
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
      x: distortion(intermediate.x, margin),
      y: distortion(intermediate.y, margin),
    }
  }

  return { x , y }
}

ipcRenderer.on(eventTypes.updateCursor, (_event, cursorPosition) => {
  const { x, y } = cursorPosition
  const offset = getOffset(x, y, currentDisplay)
  setProperty('--x-offset', offset.x)
  setProperty('--y-offset', offset.y)
});

function maximizeWindow () {
  const window = remote.BrowserWindow.getFocusedWindow();
  window.isMaximized() ? window.unmaximize() : window.maximize();
}

document.body.addEventListener('dblclick', maximizeWindow)

const videoSelectBtn = document.getElementById('videoSelectBtn');
videoSelectBtn.onclick = getVideoSources;

let detectedDisplays = []
ipcRenderer.on(eventTypes.updateDisplays, (event, payload) => {
  detectedDisplays = payload
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
        click: () => onSetSource(source)
      };
    })
  );

  videoOptionsMenu.popup();
}

let currentDisplay

async function onSetSource(source) {
  const displayId = parseInt(source.display_id)
  currentDisplay = detectedDisplays.find((s) => s.id === displayId)
  

  videoSelectBtn.innerText = source.name;

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

  setProperty(
    '--compensate', 
    (innerWidth/innerHeight) / (currentDisplay.bounds.width / currentDisplay.bounds.height)
  )

  setProperty(
    '--width-ratio', 
   currentDisplay.bounds.width / innerWidth
  )
  
    videoElement.play();
}
