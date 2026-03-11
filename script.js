// Background Matrix Animation
const canvas = document.getElementById('matrix-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+~|}{[]:;?><,./-='.split('');
const fontSize = 16;
const columns = canvas.width / fontSize;
const drops = Array.from({ length: columns }).fill(1);

function drawMatrix() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#0f0';
    ctx.font = fontSize + 'px monospace';
    
    for ( let i = 0; i < drops.length; i++ ) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        
        if ( drops[i] * fontSize > canvas.height && Math.random() > 0.975 ) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}
setInterval(drawMatrix, 33);

// Window resize handling
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// SKYNET Logic
let peer = null;
let conn = null;
const MY_ID_LEN = 12; // Length of generated hash for ID
let myIpLikeFormat = 
    Math.floor(Math.random()*255) + '.' + 
    Math.floor(Math.random()*255) + '.' + 
    Math.floor(Math.random()*255) + '.' + 
    Math.floor(Math.random()*255);

// DOM Elements
const myIpDisplay = document.getElementById('my-ip-display');
const targetIpInput = document.getElementById('target-ip');
const connectBtn = document.getElementById('connect-btn');
const statusSpan = document.querySelector('#connection-status span');
const sysLog = document.getElementById('system-log');
const chatMessages = document.getElementById('chat-messages');
const msgInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

function appendLog(msg, type = 'sys') {
    const div = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString('en-US', {hour12: false}) + '.' + Math.floor(Math.random() * 999).toString().padStart(3, '0');
    div.className = `log-entry log-${type}`;
    div.innerText = `[${timestamp}] ${msg}`;
    sysLog.appendChild(div);
    sysLog.scrollTop = sysLog.scrollHeight;
}

function appendMessage(sender, msg, isSelf = false) {
    const div = document.createElement('div');
    div.className = 'chat-msg';
    
    const senderSpan = document.createElement('span');
    senderSpan.className = 'chat-sender';
    senderSpan.innerText = `<${sender}>`;
    if(isSelf) senderSpan.style.color = '#00ff9c';
    else senderSpan.style.color = '#ff0055'; // Hacker red/pink
    
    const textNode = document.createTextNode(` ${msg}`);
    
    div.appendChild(senderSpan);
    div.appendChild(textNode);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function initPeer() {
    appendLog("INITIALIZING NODE BOOT SEQUENCE...");
    // Create random alphanumeric ID for robust connection but map it to our IP visually
    const randomId = 'NODE-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    peer = new Peer(randomId, {
        debug: 0
    });

    peer.on('open', (id) => {
        // Display IP mapped ID
        myIpDisplay.innerText = id;
        appendLog(`NODE ASSIGNED IP: ${id}`, 'info');
        appendLog(`AWAITING INCOMING CONNECTIONS...`, 'info');
    });

    peer.on('connection', (c) => {
        if(conn && conn.open) {
            c.on('open', function() {
                c.send("NODE BUSY. INCOMING CONNECTION REJECTED.");
                setTimeout(function() { c.close(); }, 500);
            });
            return;
        }
        appendLog(`INCOMING CONNECTION DETECTED FROM [${c.peer}]...`, 'warn');
        setupConnection(c);
    });

    peer.on('error', (err) => {
        appendLog(`PROTOCOL ERROR: ${err.message}`, 'err');
        statusSpan.className = 'offline';
        statusSpan.innerText = 'OFFLINE';
    });
}

function setupConnection(connection) {
    conn = connection;
    
    conn.on('open', () => {
        appendLog(`SECURE HANDSHAKE COMPLETED WITH [${conn.peer}]`, 'info');
        statusSpan.className = 'online';
        statusSpan.innerText = 'ONLINE';
        
        targetIpInput.value = conn.peer;
        targetIpInput.disabled = true;
        connectBtn.disabled = true;
        connectBtn.innerText = '[ CONNECTED ]';
        
        msgInput.disabled = false;
        sendBtn.disabled = false;
        msgInput.focus();
        
        appendMessage('SYSTEM', `ENCRYPTED CHANNEL ESTABLISHED WITH ${conn.peer}`);
    });

    conn.on('data', (data) => {
        appendMessage(conn.peer, data, false);
    });

    conn.on('close', () => {
        appendLog(`CONNECTION LOST WITH [${conn.peer}]`, 'err');
        resetConnectionUI();
    });

    conn.on('error', (err) => {
        appendLog(`CONNECTION ERROR: ${err.message}`, 'err');
        resetConnectionUI();
    });
}

function resetConnectionUI() {
    conn = null;
    statusSpan.className = 'offline';
    statusSpan.innerText = 'OFFLINE';
    
    targetIpInput.disabled = false;
    connectBtn.disabled = false;
    connectBtn.innerText = '[ CONNECT ]';
    targetIpInput.value = '';
    
    msgInput.disabled = true;
    sendBtn.disabled = true;
    
    appendMessage('SYSTEM', 'ENCRYPTED CHANNEL TERMINATED.');
}

connectBtn.addEventListener('click', () => {
    const targetId = targetIpInput.value.trim();
    if(!targetId) {
        appendLog("INVALID TARGET IP VECTOR.", "err");
        return;
    }
    if(targetId === peer.id) {
        appendLog("LOOPBACK ROUTING NOT ALLOWED.", "warn");
        return;
    }

    appendLog(`INITIATING HANDSHAKE WITH [${targetId}]...`);
    const c = peer.connect(targetId, {
        reliable: true
    });
    
    setupConnection(c);
});

targetIpInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') connectBtn.click();
});

function sendMessage() {
    if(!conn || !conn.open) return;
    const msg = msgInput.value.trim();
    if(!msg) return;
    
    conn.send(msg);
    appendMessage(peer.id, msg, true);
    msgInput.value = '';
    msgInput.focus();
}

sendBtn.addEventListener('click', sendMessage);

msgInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') sendMessage();
});

// Boot up
window.onload = initPeer;
