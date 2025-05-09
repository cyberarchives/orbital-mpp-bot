const { app, BrowserWindow, Menu } = require('electron');

function createWindow() {
    let width = 1225;
    let height = 550;

    win = new BrowserWindow({
        width,
        height,
        transparent: true,
        frame: false,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            backgroundThrottling: false,
            webSecurity: false,
            autoHideMenuBar: false
        }
    });
    
    win.loadFile('index.html');

    // Menu.setApplicationMenu(null);
}

app.whenReady().then(() => {
    createWindow()
})