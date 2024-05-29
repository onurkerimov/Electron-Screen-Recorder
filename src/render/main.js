const { desktopCapturer, remote, ipcRenderer } = require('electron');
const { eventTypes } = require('../shared');
const { methodize } = require('./utils');
require('./range')

const { Menu } = remote
const win = remote.getCurrentWindow();

let sourceType = 'screen'
let allDisplays = []
let currentDisplay

const videoElement = document.querySelector('video')

const setProperty = methodize(document.documentElement.style, 'setProperty')

const onRealClick = (listener) => {
  document.body.addEventListener('click', listener)
}

const toggleFullScreen = () => {
  win.isFullScreen() ? win.setFullScreen(false) : win.setFullScreen(true);
}

window.addEventListener('keydown', (e) => {
  if (e.key === "Escape") {
    win.setFullScreen(false)
  }
})

const toggleMaximize = () => {
  win.isMaximized() ? win.unmaximize() : win.maximize();
}

function capitalize(s) {
    return s[0].toUpperCase() + s.slice(1);
}

const setCSSVariables = () => {
  if (!currentDisplay) return
  const { width, height } = currentDisplay.bounds

  setProperty('--width-ratio', width / innerWidth)
  setProperty('--compensate', (innerWidth/innerHeight) / (width / height))
}

const range = document.getElementById('range');
range.addEventListener('input', (e) => {
  setProperty('--scale', e.target.value)
})

const applyMargin = (value, gain) => {
  if (value < gain) return 0
  if (value > 1 - gain) return 1
  return (value - gain) / (1 - 2*gain)
}

const getOffset = (x, y, currentDisplay, margin = 0.12) => {
  if (!currentDisplay) return { x, y }

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

// Update CSS variables when new cursor coordinates are received
ipcRenderer.on(eventTypes.updateCursor, (_event, cursorPosition) => {
  const { x, y } = cursorPosition
  const offset = getOffset(x, y, currentDisplay)
  setProperty('--x-offset', offset.x)
  setProperty('--y-offset', offset.y)
});

// Since all of the application is a huge "drag handle", also act like a titlebar
document.body.addEventListener('dblclick', toggleMaximize)
onRealClick(() => document.body.classList.toggle('visible'))

window.addEventListener('resize', setCSSVariables)
window.addEventListener('orientationchange', setCSSVariables)

const sourceTypeBtn = document.getElementById('sourceTypeBtn');
sourceTypeBtn.onclick = () => {
  sourceType = sourceType === 'window' ? 'screen' : 'window'
  sourceTypeBtn.innerHTML = sourceType === 'window' ? 'Window (beta)' : 'Screen'
  resetSource()
};

const videoSelectBtn = document.getElementById('videoSelectBtn');
videoSelectBtn.onclick = getVideoSources;

const fullScreenBtn = document.getElementById('fullScreenBtn');
fullScreenBtn.onclick = toggleFullScreen;

ipcRenderer.on(eventTypes.updateDisplays, (event, payload) => {
  allDisplays = payload
});

const resetSource = () => {
  videoSelectBtn.innerText = 'None';
  onSetSource(undefined)
  document.body.classList.remove('active')
}

// Get the available video sources
async function getVideoSources() {
  const sources = await desktopCapturer.getSources({
    types: [sourceType]
  });

  const sourcesList = sources.map(source => {
    return {
      label: source.name,
      click: () => {
        videoSelectBtn.innerText = source.name;
        onSetSource(source)
      }
    };
  })

  const sourcesWithNone = [{ label: 'None', click: resetSource }, ...sourcesList]

  const videoOptionsMenu = Menu.buildFromTemplate(
    sourcesWithNone
  );

  videoOptionsMenu.popup();
}

function stopStreamedVideo() {
  const tracks = stream.getTracks();

  tracks.forEach((track) => {
    track.stop();
  });

  videoElement.srcObject = null;
}

let stream
async function onSetSource(source) {
  if(!source) {
    stopStreamedVideo()
    return
  }


  const displayId = parseInt(source.display_id)
  currentDisplay = sourceType === 'screen' 
    ? allDisplays.find((s) => s.id === displayId)
    : allDisplays[0]

  document.body.classList.add('active')
  // setTimeout(() => document.body.classList.remove('visible'), 1000)

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

  stream = await navigator.mediaDevices.getUserMedia(constraints);
  videoElement.srcObject = stream;
  videoElement.width = currentDisplay.bounds.width
  videoElement.height = currentDisplay.bounds.height
  videoElement.onloadedmetadata = () => videoElement.play()

  setCSSVariables()
}

const clickOutsideDiv = document.getElementById('click-outside')
clickOutsideDiv.addEventListener('click', (e) => e.stopPropagation())