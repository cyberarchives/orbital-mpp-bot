const Client = require('./Client');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Color = require('./Color');
const { convertTextEmojis } = require('./EmojiHandler');

require('dotenv').config();

let activeClients = [];
let selectedClient = null;

const botName = 'Orbital </help>';
let sustain = 1;
let turns = false;
const users = [];
let currentUser = undefined;
let solo = false;
let echo = false;
let lol = 0;
let octaveAmount = 0;
let octaveEnabled = false;
let origTemp = [];
let origTemp1 = false;
let echoAmount = 0;
let echoDelay = 0;

function getSelectedClient() {
    const listBox = document.querySelector('.clients-list');
    const selectedItem = listBox.querySelector('.client-item.selected');
    if (!selectedItem) return null;
    const selectedValue = selectedItem.dataset.room;
    return activeClients.find(c => c.room === selectedValue) || null;
}

function sendChat(client, msg) {
    if (client) {
        client.sendArray([{ m: 'a', message: msg }]);
    }
}

Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)];
};

function turns1(client) {
    users.length = 0;
    Object.values(client.ppl).forEach(person => users.push(person));
    currentUser = users.random();
    if (currentUser && currentUser._id === client.getOwnParticipant()._id) {
        currentUser = users.random();
    }
}

function turnEnabled(client) {
    lol = setTimeout(() => {
        turns1(client);
        sendChat(client, `${currentUser.name}, it's your turn.`);
    }, 300000);
}

function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.classList.add('toast', `toast-${type}`);
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, duration);
}

function addClient(name, client, player) {
    const clientsList = document.querySelector('.clients-list');
    const clientItems = clientsList.querySelectorAll('.client-item');
    if (clientItems.length >= 4) {
        showToast('Maximum of 4 clients allowed.', 'error', 3000);
        return false;
    }
    const item = document.createElement('div');
    item.classList.add('client-item');
    item.textContent = name;
    item.dataset.room = name;
    clientsList.appendChild(item);
    item.addEventListener('click', () => selectClient(name));
    activeClients.push({
        client,
        room: name,
        player,
        cursorInterval: undefined,
        users: {},
        messages: [],
        states: {
            roomVisible: true,
            chatEnabled: true,
            isSolo: false,
            welcomeMessage: false,
            isTurns: false,
            sendChat: true,
            receiveChat: true,
            scrollChat: true
        }
    });
    return true;
}

function removeClient(name) {
    const clientsList = document.querySelector('.clients-list');
    const clientItem = clientsList.querySelector(`.client-item[data-room="${name}"]`);
    if (clientItem) {
        clientItem.remove();
        const clientIndex = activeClients.findIndex(c => c.room === name);
        if (clientIndex !== -1) {
            const { client, player, cursorInterval } = activeClients[clientIndex];
            client.stop();
            player.stop();
            if (cursorInterval) clearInterval(cursorInterval);
            activeClients.splice(clientIndex, 1);
        }
        if (selectedClient?.room === name) {
            selectedClient = null;
            updateUserList();
            updateCheckboxStates();
            updateChatLog();
        }
        return;
    }
    showToast('Client not found.', 'error', 3000);
}

function selectClient(name) {
    const clientsList = document.querySelector('.clients-list');
    const clientItems = clientsList.querySelectorAll('.client-item');
    clientItems.forEach(item => item.classList.remove('selected'));
    const selectedItem = clientsList.querySelector(`.client-item[data-room="${name}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    const clientIndex = activeClients.findIndex(c => c.room === name);
    if (clientIndex !== -1) {
        selectedClient = activeClients[clientIndex];
        updateUserList();
        updateCheckboxStates();
        updateChatLog();
    }
}

function addClientStyles() {
    if (!document.getElementById('client-item-styles')) {
        const style = document.createElement('style');
        style.id = 'client-item-styles';
        style.textContent = `
            .clients-list, .list-box {
                max-height: 120px;
                overflow-y: auto;
            }
            .client-item, .list-item {
                padding: 8px 12px;
                cursor: pointer;
                transition: background-color 0.2s;
                border-bottom: 1px solid #3d405b;
            }
            .client-item:hover, .list-item:hover {
                background-color: #3d405b;
            }
            .client-item.selected, .list-item.selected {
                background-color: #5a67d8;
                color: white;
            }
        `;
        document.head.appendChild(style);
    }
}

addClientStyles();

function updateUserList() {
    const userList = document.getElementById('user-list');
    userList.innerHTML = '';
    if (selectedClient) {
        Object.values(selectedClient.users).forEach(p => {
            const item = document.createElement('div');
            item.classList.add('list-item');
            item.dataset.userId = p._id;

            // if (p.tag) {
            //     const tagSpan = document.createElement('span');
            //     tagSpan.textContent = p.tag.text;
            //     tagSpan.style.backgroundColor = p.tag.color;
            //     tagSpan.style.color = '#fff';
            //     tagSpan.style.padding = '2px 6px';
            //     tagSpan.style.borderRadius = '4px';
            //     tagSpan.style.marginRight = '6px';
            //     tagSpan.style.fontSize = '0.85em';
            //     tagSpan.style.fontWeight = 'bold';

            //     item.appendChild(tagSpan);
            // }

            const nameSpan = document.createElement('span');
            nameSpan.textContent = p.name;
            nameSpan.style.color = p.color;

            // if (p.afk) {
            //     const tagSpan = document.createElement('span');
            //     tagSpan.textContent = "AFK";
            //     tagSpan.style.backgroundColor = `${p.color}90`;
            //     tagSpan.style.color = '#fff';
            //     tagSpan.style.padding = '2px 6px';
            //     tagSpan.style.borderRadius = '4px';
            //     tagSpan.style.marginRight = '6px';
            //     tagSpan.style.fontSize = '0.85em';
            //     tagSpan.style.fontWeight = 'bold';

            //     item.appendChild(tagSpan);
            // }

            item.appendChild(nameSpan);
            userList.appendChild(item);
        });
    }
}

function updateCheckboxStates() {
    if (selectedClient) {
        document.querySelector('.checkbox-group label:nth-child(1) input').checked = selectedClient.states.roomVisible;
        document.querySelector('.checkbox-group label:nth-child(2) input').checked = selectedClient.states.chatEnabled;
        document.querySelector('.checkbox-group label:nth-child(3) input').checked = selectedClient.states.isSolo;
        document.querySelector('.checkbox-group label:nth-child(4) input').checked = selectedClient.states.isTurns;
        document.querySelector('.chat-options label:nth-child(1) input').checked = selectedClient.states.sendChat;
        document.querySelector('.chat-options label:nth-child(2) input').checked = selectedClient.states.receiveChat;
        document.querySelector('.chat-options label:nth-child(3) input').checked = selectedClient.states.scrollChat;
        document.querySelector('.chat-options label:nth-child(4) input').checked = selectedClient.states.welcomeMessage;
    } else {
        document.querySelector('.checkbox-group label:nth-child(1) input').checked = true;
        document.querySelector('.checkbox-group label:nth-child(2) input').checked = true;
        document.querySelector('.checkbox-group label:nth-child(3) input').checked = false;
        document.querySelector('.checkbox-group label:nth-child(4) input').checked = false;
        document.querySelector('.chat-options label:nth-child(1) input').checked = true;
        document.querySelector('.chat-options label:nth-child(2) input').checked = true;
        document.querySelector('.chat-options label:nth-child(3) input').checked = true;
        document.querySelector('.chat-options label:nth-child(4) input').checked = false;
    }
}

function updateChatLog() {
    const chatLog = document.querySelector('.chat-container');
    chatLog.innerHTML = '';
    if (selectedClient && selectedClient.states.receiveChat) {
        selectedClient.messages.forEach(msg => {
            const chatEntry = document.createElement('div');
            chatEntry.textContent = `${msg.name}: ${msg.message}`;
            chatEntry.style.color = msg.color;
            
            chatEntry.style.whiteSpace = 'pre-wrap';
            chatEntry.style.wordBreak = 'break-word';
            chatEntry.style.maxWidth = '600px';

            chatLog.appendChild(chatEntry);
        });
        if (selectedClient.states.scrollChat) scrollToBottom();
    }
}


function scrollToBottom() {
    const box = document.querySelector('.chat-container');
    box.scrollTop = box.scrollHeight;
}

document.getElementById('midifile').onchange = function () {
    const clientObj = getSelectedClient();
    if (!clientObj) return showToast('No client selected.', 'error', 3000);
    const { client, player } = clientObj;
    const file = this.files[0];
    fs.readFile(file.path, (err, data) => {
        if (err) {
            console.error('Error reading MIDI file:', err);
            return showToast('Failed to read MIDI file.', 'error', 3000);
        }
        fs.writeFile(`./midis/${file.name}`, data, err => {
            if (err) {
                console.error('Error writing MIDI file:', err);
                return showToast('Failed to save MIDI file.', 'error', 3000);
            }
            player.loadFile(`./midis/${file.name}`);
            player.play();
            client.sendArray([{ m: 'm', x: 3.13, y: 15.07 }]);
            if (clientObj.cursorInterval) clearInterval(clientObj.cursorInterval);
            clientObj.cursorInterval = setInterval(() => {
                if (player.isPlaying()) {
                    client.sendArray([{ m: 'm', x: 100 - (((player.totalTicks - player.getCurrentTick()) / player.division / player.tempo * 60) / player.getSongTime() * 100), y: 15.07 }]);
                } else {
                    clearInterval(clientObj.cursorInterval);
                    updateTotalNotes(0);
                }
            }, 50);
            showToast(`Playing ${file.name} in ${clientObj.room}`, 'info', 3000);
            document.querySelector('.file-display').textContent = file.name;
            refreshMidiBox();
        });
    });
};

function loadMidiFile(clientObj, songName) {
    const { client, player } = clientObj;
    player.stop();
    try {
        player.loadFile(`./midis/${songName}`);
        player.play();
        client.sendArray([{ m: 'm', x: 3.13, y: 15.07 }]);
        if (clientObj.cursorInterval) clearInterval(clientObj.cursorInterval);
        clientObj.cursorInterval = setInterval(() => {
            if (player.isPlaying()) {
                client.sendArray([{ m: 'm', x: 100 - (((player.totalTicks - player.getCurrentTick()) / player.division / player.tempo * 60) / player.getSongTime() * 100), y: 15.07 }]);
            } else {
                clearInterval(clientObj.cursorInterval);
                updateTotalNotes(0);
            }
        }, 50);
        showToast(`Playing ${songName} in ${clientObj.room}`, 'info', 3000);
        document.querySelector('.file-display').textContent = songName;
    } catch (err) {
        console.error('Error loading MIDI file:', err);
        sendChat(client, `Error: Failed to load ${songName}`);
    }
}

window.onload = function () {
    const midiFiles = fs.readdirSync('./midis/');
    const midiList = document.getElementById('midi-list');
    midiList.innerHTML = '';
    midiFiles.forEach(midiFile => {
        const item = document.createElement('div');
        item.classList.add('list-item');
        item.textContent = midiFile;
        item.dataset.midi = midiFile;
        midiList.appendChild(item);
        item.addEventListener('dblclick', () => {
            const clientObj = getSelectedClient();
            if (clientObj) loadMidiFile(clientObj, midiFile);
        });
    });
};

function refreshMidiBox() {
    const midiList = document.getElementById('midi-list');
    midiList.innerHTML = '';
    const midiFiles = fs.readdirSync('./midis/');
    midiFiles.forEach(midiFile => {
        const item = document.createElement('div');
        item.classList.add('list-item');
        item.textContent = midiFile;
        item.dataset.midi = midiFile;
        midiList.appendChild(item);
        item.addEventListener('dblclick', () => {
            const clientObj = getSelectedClient();
            if (clientObj) loadMidiFile(clientObj, midiFile);
        });
    });
}

document.querySelector('.checkbox-group label:nth-child(4) input').addEventListener('change', () => {
    const clientObj = getSelectedClient();
    if (!clientObj) return showToast('No client selected.', 'error', 3000);
    const { client } = clientObj;
    const isChecked = document.querySelector('.checkbox-group label:nth-child(4) input').checked;
    clientObj.states.isTurns = isChecked;
    if (isChecked) {
        turns = true;
        turns1(client);
        sendChat(client, `Turns are enabled. It is [ ${currentUser ? currentUser._id : 'unknown'} ] / ${currentUser ? currentUser.name : 'unknown'}'s turn. You have 5 minutes.`);
        turnEnabled(client);
    } else {
        turns = false;
        clearTimeout(lol);
        sendChat(client, 'Turns are disabled.');
    }
});

document.querySelector('.checkbox-group label:nth-child(1) input').addEventListener('change', () => {
    const clientObj = getSelectedClient();
    if (clientObj) {
        const isChecked = document.querySelector('.checkbox-group label:nth-child(1) input').checked;
        clientObj.states.roomVisible = isChecked;
        clientObj.client.sendArray([{ m: 'chset', set: { visible: isChecked } }]);
    }
});

document.querySelector('.checkbox-group label:nth-child(2) input').addEventListener('change', () => {
    const clientObj = getSelectedClient();
    if (clientObj) {
        const isChecked = document.querySelector('.checkbox-group label:nth-child(2) input').checked;
        clientObj.states.chatEnabled = isChecked;
        clientObj.client.sendArray([{ m: 'chset', set: { chat: isChecked } }]);
    }
});

document.querySelector('.checkbox-group label:nth-child(3) input').addEventListener('change', () => {
    const clientObj = getSelectedClient();
    if (clientObj) {
        const isChecked = document.querySelector('.checkbox-group label:nth-child(3) input').checked;
        clientObj.states.isSolo = isChecked;
        clientObj.client.sendArray([{ m: 'chset', set: { crownsolo: isChecked } }]);
        solo = isChecked;
    }
});

document.querySelector('.chat-options label:nth-child(4) input').addEventListener('change', () => {
    const clientObj = getSelectedClient();
    if (clientObj) {
        const isChecked = document.querySelector('.chat-options label:nth-child(4) input').checked;
        clientObj.states.welcomeMessage = isChecked;
    }
});

document.querySelector('.chat-options label:nth-child(1) input').addEventListener('change', () => {
    const clientObj = getSelectedClient();
    if (clientObj) {
        const isChecked = document.querySelector('.chat-options label:nth-child(1) input').checked;
        clientObj.states.sendChat = isChecked;
    }
});

document.querySelector('.chat-options label:nth-child(2) input').addEventListener('change', () => {
    const clientObj = getSelectedClient();
    if (clientObj) {
        const isChecked = document.querySelector('.chat-options label:nth-child(2) input').checked;
        clientObj.states.receiveChat = isChecked;
        updateChatLog();
    }
});

document.querySelector('.chat-options label:nth-child(3) input').addEventListener('change', () => {
    const clientObj = getSelectedClient();
    if (clientObj) {
        const isChecked = document.querySelector('.chat-options label:nth-child(3) input').checked;
        clientObj.states.scrollChat = isChecked;
        if (isChecked) scrollToBottom();
    }
});

function start() {
    const room = document.querySelector('.room-input').value;
    const newClient = new Client('ws://localhost:8080', process.env.BOT_TOKEN);
    const newPlayer = new MidiPlayer.Player(createPlayerCallback(newClient));
    newClient.setChannel(room);
    newClient.start();
    if (addClient(room, newClient, newPlayer)) {
        setupClientEventListeners(newClient, room, newPlayer);
    }
}

function disconnect() {
    const clientObj = getSelectedClient();
    if (clientObj) {
        removeClient(clientObj.room);
        showToast(`Disconnected from ${clientObj.room}`, 'error', 3000);
    } else {
        showToast('No client selected.', 'error', 3000);
    }
}

function setupClientEventListeners(client, room, player) {
    const clientObj = activeClients.find(c => c.client === client);

    client.on('hi', () => {
        client.setChannel(room);
        client.setName(botName);
        console.log(`Client connected to room: ${room}`);
        showToast(`Connected to ${room}!`, 'info', 3000);
    });

    client.on('participant added', p => {
        clientObj.users[p._id] = p;
        clientObj.messages.push({
            name: p.name,
            color: p.color,
            message: `${p.name} joined ${room}.`,
            timestamp: Date.now(),
        });

        const color = new Color(p.color);
        let colorParsed = color.getName().split("A shade of ").join(""); 
        if (clientObj.states.welcomeMessage) sendChat(client, `Welcome, ${p.name} (${colorParsed})! Use /help for a list of commands!`);
        if (selectedClient && client === selectedClient.client) {
            updateUserList();
            if (clientObj.states.receiveChat) {
                const chatLog = document.querySelector('.chat-container');
                const chatEntry = document.createElement('div');
                chatEntry.textContent = `${p.name} joined ${room}.`;
                chatEntry.style.color = p.color;
                chatLog.appendChild(chatEntry);
                if (clientObj.states.scrollChat) scrollToBottom();
            }
        }
    });

    client.on('participant update', p => {
        clientObj.users[p._id] = p;
        if (selectedClient && client === selectedClient.client) {
            updateUserList();
            if (clientObj.states.scrollChat) scrollToBottom();
        }
    });

    client.on('participant removed', p => {
        delete clientObj.users[p._id];
        clientObj.messages.push({
            name: p.name,
            color: p.color,
            message: `${p.name} left ${room}.`,
            timestamp: Date.now()
        });
        if (selectedClient && client === selectedClient.client) {
            updateUserList();
            if (clientObj.states.receiveChat) {
                const chatLog = document.querySelector('.chat-container');
                const chatEntry = document.createElement('div');
                chatEntry.textContent = `${p.name} left ${room}.`;
                chatEntry.style.color = p.color;
                chatLog.appendChild(chatEntry);
                if (clientObj.states.scrollChat) scrollToBottom();
            }
        }
        if (turns && p._id === currentUser._id) {
            turns1(client);
            sendChat(client, `Since the last user left. It's ${currentUser.name}'s turn. You have 5 minutes.`);
            turnEnabled(client);
        }
    });

    client.ws.on('close', () => {
        console.log('WebSocket closed');
    });

    client.on('a', msg => {
        clientObj.messages.push({
            name: msg.p.name,
            color: msg.p.color,
            message: msg.a,
            timestamp: Date.now()
        });
        handleChatCommands(client, player, msg);
        if (selectedClient && client === selectedClient.client && clientObj.states.receiveChat) {
            const chatLog = document.querySelector('.chat-container');
            const chatEntry = document.createElement('div');
            chatEntry.textContent = `${msg.p.name}: ${msg.a}`;
            chatEntry.style.color = msg.p.color;
        
            chatEntry.style.whiteSpace = 'pre-wrap';
            chatEntry.style.wordBreak = 'break-word';
            chatEntry.style.maxWidth = '600px';
        
            chatLog.appendChild(chatEntry);
            if (clientObj.states.scrollChat) scrollToBottom();
        }        
    });

    client.on('nq', data => {
        updateMaxNoteQuota(data.max);
        updateNoteQuotaAllowance(data.allowance);
    });

    player.on('endOfFile', () => {
        setTimeout(() => {
            client.sendArray([{ m: 'm', x: 3.13, y: 15.07 }]);
            showToast(`Finished playing in ${room}`, 'info', 3000);
            if (clientObj.cursorInterval) clearInterval(clientObj.cursorInterval);
            document.querySelector('.file-display').textContent = 'No file chosen';
        }, 2000);
    });
}

function queueNote(client, note, velocity, sustain) {
    if (!client.noteBufferTime) {
        client.noteBufferTime = Date.now();
    }
    client.noteBuffer.push({
        n: note,
        v: velocity,
        s: sustain
    });
}

function updateTotalNotes(value) {
    document.querySelector('.counter-item:nth-child(1)').textContent = `Total Notes Played: ${value}`;
}

function updateMaxNoteQuota(value) {
    document.querySelector('.counter-item:nth-child(2)').textContent = `Max Note Quota: ${value}`;
}

function updateNoteQuotaAllowance(value) {
    document.querySelector('.counter-item:nth-child(3)').textContent = `Note Quota Allowance: ${value}`;
}

function getTotalNotes() {
    return parseInt(document.querySelector('.counter-item:nth-child(1)').textContent.replace('Total Notes Played: ', ''), 10);
}

function getMaxNoteQuota() {
    return parseInt(document.querySelector('.counter-item:nth-child(2)').textContent.replace('Max Note Quota: ', ''), 10);
}

function getNoteQuotaAllowance() {
    return parseInt(document.querySelector('.counter-item:nth-child(3)').textContent.replace('Note Quota Allowance: ', ''), 10);
}

function createPlayerCallback(client) {
    return function (event) {
        const clientObj = activeClients.find(c => c.client === client);
        if (!clientObj) return;

        if (event.name === 'Note off' || (event.name === 'Note on' && event.velocity === 0)) {
            client.stopNote(keyNameMap[event.noteName]);
        } else if (event.name === 'Note on') {
            const volume = event.velocity / 127;
            client.startNote(keyNameMap[event.noteName], volume);
            updateTotalNotes(getTotalNotes() + 1);

            if (echo) {
                for (let j = 0; j < echoAmount; j++) {
                    setTimeout(() => {
                        const echoVolume = volume * 0.5;
                        client.startNote(keyNameMap[event.noteName], echoVolume);
                        updateTotalNotes(getTotalNotes() + 1);
                    }, echoDelay * (j + 30));
                }
            }

            if (octaveEnabled) {
                for (let i = 1; i <= octaveAmount; i++) {
                    const octaveNote = keyNameMap[Object.keys(keyNameMap)[Object.keys(keyNameMap).indexOf(event.noteName) + (i * 12)]];
                    if (octaveNote) {
                        client.startNote(octaveNote, volume);
                        updateTotalNotes(getTotalNotes() + 1);
                    }
                }
            }
        } else if (event.name === 'Set Tempo') {
            this.tempo = event.data;
            if (origTemp1) {
                origTemp = event.data;
                origTemp1 = false;
            }
        }
    };
}

function getUser(client, query) {
    return Object.values(client.ppl).find(p => p.name.toLowerCase().includes(query.toLowerCase()) || p._id.toLowerCase().includes(query.toLowerCase()));
}

document.addEventListener('DOMContentLoaded', () => {
    const userList = document.getElementById('user-list');
    const contextMenu = document.getElementById('contextMenu');
    let selectedUser = null;

    userList.addEventListener('contextmenu', event => {
        event.preventDefault();
        const item = event.target.closest('.list-item');
        if (item) {
            selectedUser = item.dataset.userId;
            contextMenu.style.left = `${event.pageX}px`;
            contextMenu.style.top = `${event.pageY}px`;
            contextMenu.style.display = 'block';
        }
    });

    document.addEventListener('click', () => (contextMenu.style.display = 'none'));

    contextMenu.innerHTML = `
        <li id="banBtn">Ban</li>
        <li id="kickBtn">Kick</li>
        <li id="chownBtn">Chown</li>
        <li id="makeTurnBtn">Make Turn</li>
    `;

    contextMenu.querySelector('#banBtn').addEventListener('click', () => {
        const clientObj = getSelectedClient();
        if (clientObj && selectedUser) {
            const user = getUser(clientObj.client, selectedUser);
            const ms = 1440 * 60 * 1000;
            clientObj.client.kickBan(user._id, ms);
            showToast(`Banned ${user.name}`, 'info', 3000);
        }
        contextMenu.style.display = 'none';
    });

    contextMenu.querySelector('#kickBtn').addEventListener('click', () => {
        const clientObj = getSelectedClient();
        if (clientObj && selectedUser) {
            const user = getUser(clientObj.client, selectedUser);
            clientObj.client.kickBan(user._id, 120000);
            showToast(`Kicked ${user.name}`, 'info', 3000);
        }
        contextMenu.style.display = 'none';
    });

    contextMenu.querySelector('#chownBtn').addEventListener('click', () => {
        const clientObj = getSelectedClient();
        if (clientObj && selectedUser) {
            const user = getUser(clientObj.client, selectedUser);
            clientObj.client.sendArray([{ m: 'chown', id: user._id }]);
            showToast(`Chowned ${user.name}`, 'info', 3000);
        }
        contextMenu.style.display = 'none';
    });

    contextMenu.querySelector('#makeTurnBtn').addEventListener('click', () => {
        const clientObj = getSelectedClient();
        if (clientObj && selectedUser) {
            const user = getUser(clientObj.client, selectedUser);
            currentUser = user;
            showToast(`It is now ${user.name}'s turn`, 'info', 3000);
            sendChat(clientObj.client, `${user.name}, it's your turn.`);
        }
        contextMenu.style.display = 'none';
    });
});

document.querySelector('.btn').onclick = start;
document.querySelector('.btn-secondary').onclick = disconnect;

document.querySelector('.btn-secondary:nth-child(1)').addEventListener('click', () => {
    document.getElementById('midifile').click();
});

function addMessageToConsole(msg) {
    const chatLog = document.querySelector('.chat-container');
    const chatEntry = document.createElement('div');
    chatEntry.textContent = `${botName}: ${msg}`;
    chatEntry.style.color = '#9000a3';
    chatLog.appendChild(chatEntry);
    if (selectedClient?.states.scrollChat) scrollToBottom();
}

document.querySelector('.chat-input').addEventListener('input', function() {
  // Get cursor position before making changes
  const cursorPos = this.selectionStart;
  
  // Convert emojis
  const originalText = this.value;
  const convertedText = convertTextEmojis(originalText);
  
  // If text changed after conversion, update the input value
  if (originalText !== convertedText) {
    // Calculate cursor position adjustment
    // This is a simple approach - might need refinement for complex cases
    const lengthDiff = convertedText.length - originalText.length;
    
    this.value = convertedText;
    
    // Restore cursor position, adjusted for any length changes
    this.selectionStart = this.selectionEnd = cursorPos + lengthDiff;
  }
});

// Modified keyup event listener with emoji conversion
document.querySelector('.chat-input').addEventListener('keyup', function (e) {
    if (e.key === 'Enter') {
        const clientObj = getSelectedClient();
        if (!clientObj || !clientObj.states.sendChat) return showToast('No client selected or send chat disabled.', 'error', 3000);
        
        // Get the message and convert emojis
        let msg = this.value;
        let convertedMsg = convertTextEmojis(msg);
        
        if (msg.includes('/help')) {
            addMessageToConsole('/play, /stop, /skip, /download, /info, /oct, /tempo. Owner: /solo, /buffer, /turns, /sustain.');
            addMessageToConsole('Orbital made by Snoofz');
            this.value = '';
            return;
        }
        
        if (msg.includes('/stop')) {
            octaveEnabled = false;
            addMessageToConsole('Music has stopped.');
            if (clientObj.player.isPlaying()) clearInterval(clientObj.cursorInterval);
            clientObj.player.stop();
            clientObj.client.sendArray([{ m: 'm', x: 3.13, y: 15.07 }]);
            this.value = '';
            updateTotalNotes(0);
            document.querySelector('.file-display').textContent = 'No file chosen';
            return;
        }
        
        // Send the converted message instead of the original
        sendChat(clientObj.client, `Console: ${convertedMsg}`);
        this.value = '';
    }
});

document.querySelector('.input-container .btn').addEventListener('click', () => {
    const clientObj = getSelectedClient();
    const input = document.querySelector('.chat-input');
    if (!clientObj || !clientObj.states.sendChat) return showToast('No client selected or send chat disabled.', 'error', 3000);
    const msg = input.value;
    if (msg) {
        sendChat(clientObj.client, `Console: ${msg}`);
        input.value = '';
    }
});

function handleChatCommands(client, player, msg) {
    const clientObj = activeClients.find(c => c.client === client);
    if (!clientObj) return;

    if (msg.p._id === client.getOwnParticipant()._id) return;

    const commands = {
        '/help': () => {
            sendChat(client, 'Main: /play, /stop, /skip, /download, /info, /oct, /tempo, /sustain');
            sendChat(client, 'Owner: /solo, /buffer, /turns');
        },
        '/info': () => sendChat(client, 'Orbital made by Snoofz'),
        '/play': () => {
            octaveEnabled = false;
            if (turns && msg.p._id !== currentUser._id) {
                sendChat(client, "It's not your turn!");
                return;
            }
            try {
                let input = msg.a.substr(6).trim();
                let midiList = fs.readdirSync('./midis/');
                if (!input) return sendChat(client, midiList.join(', '));
                let selectedMidiFileName = midiList.filter(fileName => fileName.toLowerCase().includes(input.toLowerCase())).random();
                if (!selectedMidiFileName) {
                    sendChat(client, 'No matching MIDI file found.');
                    return;
                }
                if (player.isPlaying()) clearInterval(clientObj.cursorInterval);
                player.stop();
                player.loadFile(`./midis/${selectedMidiFileName}`);
                player.play();
                origTemp1 = true;
                client.sendArray([{ m: 'm', x: 3.13, y: 15.07 }]);
                clientObj.cursorInterval = setInterval(() => {
                    if (player.isPlaying()) {
                        client.sendArray([{ m: 'm', x: 100 - (((player.totalTicks - player.getCurrentTick()) / player.division / player.tempo * 60) / player.getSongTime() * 100), y: 15.07 }]);
                    } else {
                        clearInterval(clientObj.cursorInterval);
                        updateTotalNotes(0);
                        document.querySelector('.file-display').textContent = 'No file chosen';
                    }
                }, 50);
                sendChat(client, `Playing ${selectedMidiFileName.replace('.mid', '')} in ${clientObj.room}`);
                document.querySelector('.file-display').textContent = selectedMidiFileName;
            } catch (err) {
                console.error('Error in /play:', err);
                sendChat(client, err.code === 'ENOENT' ? 'File not found.' : `Error: ${err.message || err}`);
            }
        },
        '/sustain': () => {
            if (sustain === 1) {
                player.sustain = true;
                sustain = 0;
                sendChat(client, 'Sustain is on.');
            } else {
                player.sustain = false;
                sustain = 1;
                sendChat(client, 'Sustain is off.');
            }
        },
        '/download': () => {
            octaveEnabled = false;
            let url = msg.a.substring(10).trim();
            if (!url) return sendChat(client, 'Usage: /download <url>. Example: https://bitmidi.com/uploads/87216.mid');
            axios({
                method: 'get',
                url,
                responseType: 'arraybuffer'
            }).then(response => {
                if (response.status !== 200) throw new Error('Failed to fetch MIDI file.');
                const fileName = path.basename(url);
                const fileBuffer = Buffer.from(response.data);
                const saveFolder = path.join(__dirname, 'midis');
                if (!fs.existsSync(saveFolder)) fs.mkdirSync(saveFolder);
                const filePath = path.join(saveFolder, fileName);
                fs.writeFile(filePath, fileBuffer, err => {
                    if (err) throw new Error(`Failed to save MIDI file: ${err.message}`);
                    player.stop();
                    player.loadFile(filePath);
                    player.play();
                    refreshMidiBox();
                    client.sendArray([{ m: 'm', x: 3.13, y: 15.07 }]);
                    clientObj.cursorInterval = setInterval(() => {
                        if (player.isPlaying()) {
                            client.sendArray([{ m: 'm', x: 100 - (((player.totalTicks - player.getCurrentTick()) / player.division / player.tempo * 60) / player.getSongTime() * 100), y: 15.07 }]);
                        } else {
                            clearInterval(clientObj.cursorInterval);
                            updateTotalNotes(0);
                            document.querySelector('.file-display').textContent = 'No file chosen';
                        }
                    }, 50);
                    sendChat(client, `Playing ${fileName} in ${clientObj.room}`);
                    document.querySelector('.file-display').textContent = fileName;
                });
            }).catch(error => sendChat(client, `Error: ${error.message || error}`));
        },
        '/stop': () => {
            if (turns && msg.p._id !== currentUser._id) return;
            octaveEnabled = false;
            sendChat(client, 'Music has stopped.');
            if (player.isPlaying()) clearInterval(clientObj.cursorInterval);
            player.stop();
            client.sendArray([{ m: 'm', x: 3.13, y: 15.07 }]);
            updateTotalNotes(0);
            document.querySelector('.file-display').textContent = 'No file chosen';
        },
        '/skip': () => {
            if (msg.p._id === currentUser._id || msg.p._id === 'e8297560cbf5248e619fdea0') {
                sendChat(client, `Skipped [ ${currentUser._id} ] / ${currentUser.name}'s turn.`);
                turns1(client);
                if (currentUser._id === client.getOwnParticipant()._id) currentUser = users.random();
                setTimeout(() => {
                    sendChat(client, `[ ${currentUser._id} ] / ${currentUser.name}'s turn. You have 5 minutes.`);
                    turnEnabled(client);
                    clearTimeout(lol);
                }, 100);
            } else {
                sendChat(client, `It's not your turn so you can't skip.`);
            }
        },
        '/solo': () => {
            if (msg.p._id === 'e8297560cbf5248e619fdea0') {
                solo = !solo;
                sendChat(client, `Solo is now ${solo ? 'on' : 'off'}.`);
                client.sendArray([{ m: 'chset', set: { crownsolo: solo } }]);
            }
        },
        '/oct': () => {
            let input = msg.a.substring(5).trim();
            if (!input) return sendChat(client, 'Please enter a valid value.');
            if (isNaN(input)) return sendChat(client, 'Invalid value.');
            if (input > 5) return sendChat(client, 'Octaves can only go up to 5.');
            octaveAmount = parseInt(input);
            octaveEnabled = input !== '0';
        },
        '/tempo': () => {
            let input = msg.a.substring(7).trim();
            if (!input) {
                sendChat(client, 'Tempo is back to normal.');
                player.tempo = origTemp;
            } else if (isNaN(input)) {
                sendChat(client, 'Invalid value.');
            } else if (input > 400) {
                sendChat(client, 'Tempo has to be less than 400.');
            } else {
                player.tempo = parseInt(input);
            }
        },
        '/pause': () => player.pause(),
        '/resume': () => player.play(),
        '/loop': () => {
            player.playLoop();
            sendChat(client, 'Looping the song.');
        },
        '/echo': () => {
            if (msg.a.startsWith('/echod')) {
                let input = msg.a.substring(7).trim();
                if (!input) return sendChat(client, 'Please enter a valid value.');
                if (isNaN(input)) return sendToast(client, 'Invalid value.');
                if (input > 5) return sendChat(client, 'Echo Delay can only go up to 5.');
                echoDelay = parseInt(input);
            } else {
                let input = msg.a.substring(5).trim();
                if (!input) return sendChat(client, 'Please enter a valid value.');
                if (isNaN(input)) return sendChat(client, 'Invalid value.');
                if (input > 5) return sendChat(client, 'Echo can only go up to 5.');
                echoAmount = parseInt(input);
                echo = input !== '0';
            }
        }
    };

    const command = Object.keys(commands).find(cmd => msg.a.startsWith(cmd));
    if (command) commands[command]();
}

const keyNameMap = require('./key-map');
const MidiPlayer = require('./midiplayer');