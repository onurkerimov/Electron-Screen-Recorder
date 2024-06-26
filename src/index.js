const { app, screen, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { eventTypes } = require('./shared');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

let mainWindow
let interval

const updateDisplays = (event) => {
  if(event) console.log('update displays')
  const displays = screen.getAllDisplays()
  mainWindow.webContents.send(eventTypes.updateDisplays, displays);
}

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    titleBarStyle: 'hidden',
    width: 400,
    height: 400,
    minWidth: 350,
    minHeight: 350,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // Open links in external browser
  mainWindow.webContents.on('new-window', function(e, url) {
    e.preventDefault();
    require('electron').shell.openExternal(url);
  });

  mainWindow.setBackgroundColor('#282828')

  // Remove the window's menu bar. (Linux and Windows)
  mainWindow.removeMenu()

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'render/index.html'));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  screen.on('display-added', updateDisplays)
  screen.on('display-removed', updateDisplays)
  
  // Emit cursor position at regular intervals
  interval = setInterval(() => {
    updateDisplays()
    const cursor = screen.getCursorScreenPoint();
    mainWindow.webContents.send(eventTypes.updateCursor, cursor);
  }, 100);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on("fullscreenon",() => {
  window.setAlwaysOnTop(true, 'screen-saver');
  window.setFullScreen(true);
})

ipcMain.on("fullscreenoff", () => {
  mainWindow.setFullScreen(false);
  mainWindow.setAlwaysOnTop(true, 'floating')
})

app.on('window-all-closed', () => {
  clearInterval(interval)
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
