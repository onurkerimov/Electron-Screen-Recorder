const { desktopCapturer, remote, ipcRenderer } = require('electron');
const { eventTypes } = require('./shared');

const { Menu } = remote;

function getCurrentDisplay(x, y) {
  return detectedDisplays.find(display => {
    const { bounds } = display;

    const x1 = bounds.x;
    const x2 = x1 + bounds.width;
    if (x < x1 || x2 < x) return false;

    const y1 = bounds.y;
    const y2 = y1 + bounds.height;
    if (y < y1 || y2 < y) return false;

    return true;
  });
}

const distortion = (value, gain) => {
  if(value < gain) return 0
  if(value > 1-gain) return 1
  return (value - gain) / (1 - 2*gain)
}

const getNormalizedPosition = (x, y, currentDisplay, margin = 0.12) => {
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
  const currentDisplay = getCurrentDisplay(x,y)
  const pos = getNormalizedPosition(x,y, currentDisplay)

  document.documentElement.style.setProperty(
    '--x-offset', 
    pos.x
  )

  document.documentElement.style.setProperty(
    '--y-offset', 
    pos.y
  )
});

function maximizeWindow () {
  const window = remote.BrowserWindow.getFocusedWindow();
  window.isMaximized() ? window.unmaximize() : window.maximize();
}

document.body.addEventListener('dblclick', maximizeWindow)

// Buttons
const videoElement = document.querySelector('video');

// const sourceTypeBtn = document.getElementById('sourceTypeBtn');
// sourceTypeBtn.onclick = getSourceType;

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
        click: () => selectSource(source)
      };
    })
  );


  videoOptionsMenu.popup();
}

// Change the videoSource window to record
async function selectSource(source) {
  const currentDisplay = detectedDisplays[parseInt(source.display_id) - 1]

  videoSelectBtn.innerText = source.name;

  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id,
        minWidth: currentDisplay.bounds.width * currentDisplay.scaleFactor 

      },
      optional: [
        { 
          minWidth: currentDisplay.bounds.width * currentDisplay.scaleFactor 
        },
      ]
    }
  };

  // Create a Stream
  const stream = await navigator.mediaDevices
    .getUserMedia(constraints);

  // Preview the source in a video element
  videoElement.srcObject = stream;
  videoElement.width = currentDisplay.bounds.width// * 2 
  videoElement.height = currentDisplay.bounds.height// * 2

  document.documentElement.style.setProperty(
    '--compensate', 
    (innerWidth/innerHeight) / (currentDisplay.bounds.width / currentDisplay.bounds.height)
  )

  document.documentElement.style.setProperty(
    '--width-ratio', 
   currentDisplay.bounds.width / innerWidth
  )
  
  
  // videoElement.width = detectedDisplays
  videoElement.play();
}
