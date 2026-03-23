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
    Math.floor(Math.random()*255);

let localStream = null;
let currentCall = null;

// DOM Elements
const myIpDisplay = document.getElementById('my-ip-display');
const targetIpInput = document.getElementById('target-ip');
const connectBtn = document.getElementById('connect-btn');
const statusSpan = document.querySelector('#connection-status span');
const sysLog = document.getElementById('system-log');
const chatMessages = document.getElementById('chat-messages');
const msgInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const attachBtn = document.getElementById('attach-btn');
const audioCallBtn = document.getElementById('audio-call-btn');
const videoCallBtn = document.getElementById('video-call-btn');
const fileInput = document.getElementById('file-input');

const callUi = document.getElementById('call-ui');
const callTitle = document.getElementById('call-title');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const acceptCallBtn = document.getElementById('accept-call-btn');
const endCallBtn = document.getElementById('end-call-btn');

function appendLog(msg, type = 'sys') {
    const div = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString('en-US', {hour12: false}) + '.' + Math.floor(Math.random() * 999).toString().padStart(3, '0');
    div.className = `log-entry log-${type}`;
    div.innerText = `[${timestamp}] ${msg}`;
    sysLog.appendChild(div);
    sysLog.scrollTop = sysLog.scrollHeight;
}

function appendFileMessage(sender, filename, filetype, dataBuffer, isSelf = false) {
    const div = document.createElement('div');
    div.className = 'chat-msg';
    
    const senderSpan = document.createElement('span');
    senderSpan.className = 'chat-sender';
    senderSpan.innerText = `<${sender}>`;
    if(isSelf) senderSpan.style.color = '#00ff9c';
    else senderSpan.style.color = '#ff0055'; 
    
    div.appendChild(senderSpan);
    
    const textNode = document.createTextNode(` FILE TRANSFER COMPLETED: `);
    div.appendChild(textNode);
    
    const blob = new Blob([dataBuffer], { type: filetype });
    const url = URL.createObjectURL(blob);
    
    if (filetype.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = url;
        img.className = 'chat-img';
        const br = document.createElement('br');
        div.appendChild(br);
        div.appendChild(img);
    } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.innerText = `[DOWNLOAD ${filename}]`;
        link.className = 'chat-file';
        div.appendChild(link);
    }
    
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
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

    peer.on('call', (call) => {
        appendLog(`INCOMING CALL FROM [${call.peer}]...`, 'warn');
        handleIncomingCall(call);
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
        attachBtn.disabled = false;
        audioCallBtn.disabled = false;
        videoCallBtn.disabled = false;
        fileInput.disabled = false;
        msgInput.focus();
        
        appendMessage('SYSTEM', `ENCRYPTED CHANNEL ESTABLISHED WITH ${conn.peer}`);
    });

    conn.on('data', (data) => {
        if (data && typeof data === 'object' && data.type === 'file') {
            appendFileMessage(conn.peer, data.filename, data.filetype, data.data, false);
        } else {
            appendMessage(conn.peer, data, false);
        }
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
    attachBtn.disabled = true;
    audioCallBtn.disabled = true;
    videoCallBtn.disabled = true;
    fileInput.disabled = true;
    
    if(currentCall) endCall();
    
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

attachBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !conn || !conn.open) return;
    
    appendLog(`ENCRYPTING FILE [${file.name}] FOR SECURE TRANSFER...`, 'info');
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const arrayBuffer = event.target.result;
        
        const payload = {
            type: 'file',
            filename: file.name,
            filetype: file.type,
            data: arrayBuffer
        };
        
        conn.send(payload);
        appendFileMessage(peer.id, file.name, file.type, arrayBuffer, true);
        appendLog(`FILE ALGORITHM EXECUTED. TRANSFER COMPLETE.`, 'sys');
    };
    reader.readAsArrayBuffer(file);
    
    // reset input
    fileInput.value = '';
});

// Call Handling Logic
async function startCall(isCamera) {
    if(!conn || !conn.open) return;
    
    appendLog(`INITIATING ${isCamera ? 'VIDEO' : 'AUDIO'} HANDSHAKE...`, 'info');
    
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: isCamera,
            audio: true
        });
        
        localVideo.srcObject = localStream;
        callUi.style.display = 'flex';
        callTitle.innerText = `[ OUTGOING ${isCamera ? 'VIDEO' : 'AUDIO'} CALL ]`;
        acceptCallBtn.style.display = 'none';
        
        const call = peer.call(conn.peer, localStream);
        setupCallListeners(call);
        currentCall = call;
        
    } catch (err) {
        appendLog(`MEDIA ACCESS DENIED: ${err.message}`, 'err');
    }
}

function handleIncomingCall(call) {
    currentCall = call;
    callUi.style.display = 'flex';
    callTitle.innerText = `[ INCOMING CALL: ${call.peer} ]`;
    acceptCallBtn.style.display = 'inline-block';
    
    // Auto-setup remote stream when call is accepted
    call.on('stream', (remoteStream) => {
        remoteVideo.srcObject = remoteStream;
    });
}

async function answerCall() {
    try {
        const isVideo = !!currentCall.options?._payload?.video; 
        // Note: PeerJS doesn't explicitly pass type in options usually without meta
        // But we can just default to what we have or ask for both.
        
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true, // Default to video if available
            audio: true
        });
        
        localVideo.srcObject = localStream;
        currentCall.answer(localStream);
        setupCallListeners(currentCall);
        
        callTitle.innerText = `[ ACTIVE CALL: ${currentCall.peer} ]`;
        acceptCallBtn.style.display = 'none';
        
    } catch (err) {
        appendLog(`MEDIA ERROR: ${err.message}`, 'err');
        endCall();
    }
}

function setupCallListeners(call) {
    call.on('stream', (remoteStream) => {
        remoteVideo.srcObject = remoteStream;
        callTitle.innerText = `[ ACTIVE CALL: ${call.peer} ]`;
    });
    
    call.on('close', () => {
        endCall();
    });
    
    call.on('error', (err) => {
        appendLog(`CALL ERROR: ${err.message}`, 'err');
        endCall();
    });
}

function endCall() {
    if(currentCall) {
        currentCall.close();
        currentCall = null;
    }
    
    if(localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    callUi.style.display = 'none';
    appendLog('COMMUNICATION LINK SEVERED.', 'warn');
}

audioCallBtn.addEventListener('click', () => startCall(false));
videoCallBtn.addEventListener('click', () => startCall(true));
acceptCallBtn.addEventListener('click', answerCall);
endCallBtn.addEventListener('click', endCall);

// Boot up
window.onload = initPeer;
