        let currentUsername = '';
        let onlineUsers = new Map();
        let localStream = null;
        let remoteStream = null;
        let peerConnection = null;
        let currentCall = null;
        let isCallActive = false;
        let isMuted = false;
        let isVideoEnabled = true;
        let isScreenSharing = false;

        const rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        let connectedUsers = new Set();

        async function login() {
            const username = document.getElementById('usernameInput').value.trim();
            
            if (!username) {
                showNotification('Please enter a username', 'error');
                return;
            }

            if (username.length < 3) {
                showNotification('Username must be at least 3 characters', 'error');
                return;
            }

            if (connectedUsers.has(username.toLowerCase())) {
                showNotification('Username already taken, please choose another', 'error');
                return;
            }

            currentUsername = username;
            connectedUsers.add(username.toLowerCase());
            
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            document.getElementById('currentUser').textContent = username;
            
            await initializeMedia();
            
            simulateOnlineUsers();
            
            showNotification('Successfully connected!', 'success');
        }

        async function initializeMedia() {
            try {
                localStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                
                document.getElementById('localVideo').srcObject = localStream;
                showNotification('Camera and microphone access granted', 'success');
            } catch (error) {
                console.error('Error accessing media devices:', error);
                showNotification('Error accessing camera/microphone. Please check permissions.', 'error');
            }
        }

        function simulateOnlineUsers() {
            const simulatedUsers = [
                'Alice_Johnson',
                'Bob_Smith', 
                'Charlie_Brown',
                'Diana_Prince',
                'Eve_Wilson'
            ];

            simulatedUsers.forEach(user => {
                if (user.toLowerCase() !== currentUsername.toLowerCase() && Math.random() > 0.3) {
                    connectedUsers.add(user.toLowerCase());
                    onlineUsers.set(user, { username: user, status: 'online' });
                }
            });

            updateUserList();

            setInterval(() => {
                if (Math.random() > 0.8) {
                    const remainingUsers = simulatedUsers.filter(u => 
                        u.toLowerCase() !== currentUsername.toLowerCase() && 
                        !onlineUsers.has(u)
                    );
                    
                    if (remainingUsers.length > 0 && onlineUsers.size < 4) {
                        const newUser = remainingUsers[Math.floor(Math.random() * remainingUsers.length)];
                        onlineUsers.set(newUser, { username: newUser, status: 'online' });
                        updateUserList();
                        showNotification(`${newUser} joined`, 'info');
                    }
                }
            }, 10000);
        }

        function updateUserList() {
            const userList = document.getElementById('userList');
            const userCount = document.getElementById('userCount');
            
            userList.innerHTML = '';
            userCount.textContent = onlineUsers.size;

            onlineUsers.forEach((user, username) => {
                const userElement = document.createElement('div');
                userElement.className = 'user-item';
                userElement.onclick = () => initiateCall(username);
                
                userElement.innerHTML = `
                    <div class="user-avatar">${username.charAt(0).toUpperCase()}</div>
                    <div>
                        <div style="font-weight: 600;">${username}</div>
                        <div style="font-size: 12px; color: #666;">Available</div>
                    </div>
                `;
                
                userList.appendChild(userElement);
            });
        }

        async function initiateCall(targetUser) {
            if (isCallActive) {
                showNotification('Already in a call', 'error');
                return;
            }

            currentCall = targetUser;
            showNotification(`Calling ${targetUser}...`, 'info');

            setTimeout(() => {
                const accepted = Math.random() > 0.2;
                
                if (accepted) {
                    showNotification(`${targetUser} accepted your call!`, 'success');
                    startCall(targetUser, true);
                } else {
                    showNotification(`${targetUser} declined your call`, 'error');
                    currentCall = null;
                }
            }, 2000 + Math.random() * 3000);
        }

        async function startCall(partnerName, isInitiator) {
            try {
                isCallActive = true;
                
                peerConnection = new RTCPeerConnection(rtcConfig);
                
                if (localStream) {
                    localStream.getTracks().forEach(track => {
                        peerConnection.addTrack(track, localStream);
                    });
                }

                peerConnection.ontrack = (event) => {
                    remoteStream = event.streams[0];
                    document.getElementById('remoteVideo').srcObject = remoteStream;
                };

                peerConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        console.log('ICE candidate:', event.candidate);
                    }
                };

                peerConnection.onconnectionstatechange = () => {
                    const state = peerConnection.connectionState;
                    document.getElementById('callStatus').textContent = 
                        state.charAt(0).toUpperCase() + state.slice(1);
                    
                    if (state === 'connected') {
                        document.getElementById('callStatus').textContent = 'Connected';
                        showNotification('Call connected successfully!', 'success');
                    } else if (state === 'disconnected' || state === 'failed') {
                        endCall();
                    }
                };

                showCallInterface(partnerName);

                setTimeout(() => {
                    if (peerConnection && peerConnection.connectionState !== 'closed') {
                        createFakeRemoteVideo();
                        document.getElementById('callStatus').textContent = 'Connected';
                    }
                }, 2000);

            } catch (error) {
                console.error('Error starting call:', error);
                showNotification('Failed to start call', 'error');
                endCall();
            }
        }

        function createFakeRemoteVideo() {
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 240;
            const ctx = canvas.getContext('2d');
            
            function drawFrame() {
                if (!isCallActive) return;
                
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                gradient.addColorStop(0, '#667eea');
                gradient.addColorStop(1, '#764ba2');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                const time = Date.now() / 1000;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.beginPath();
                ctx.arc(
                    canvas.width/2 + Math.sin(time) * 50,
                    canvas.height/2 + Math.cos(time) * 30,
                    20, 0, 2 * Math.PI
                );
                ctx.fill();
                
                ctx.fillStyle = 'white';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(currentCall || 'Remote User', canvas.width/2, canvas.height/2);
                
                requestAnimationFrame(drawFrame);
            }
            
            const stream = canvas.captureStream(30);
            document.getElementById('remoteVideo').srcObject = stream;
            drawFrame();
        }

        function showCallInterface(partnerName) {
            document.getElementById('waitingMessage').style.display = 'none';
            document.getElementById('callInterface').style.display = 'flex';
            document.getElementById('callPartner').textContent = `Call with ${partnerName}`;
            document.getElementById('remoteLabel').textContent = partnerName;
        }

        function hideCallInterface() {
            document.getElementById('callInterface').style.display = 'none';
            document.getElementById('waitingMessage').style.display = 'block';
        }

        function toggleMute() {
            if (localStream) {
                const audioTrack = localStream.getAudioTracks()[0];
                if (audioTrack) {
                    audioTrack.enabled = !audioTrack.enabled;
                    isMuted = !audioTrack.enabled;
                    
                    const muteBtn = document.getElementById('muteBtn');
                    muteBtn.innerHTML = isMuted ? '🔇' : '🎤';
                    muteBtn.classList.toggle('active', !isMuted);
                }
            }
        }

        function toggleVideo() {
            if (localStream) {
                const videoTrack = localStream.getVideoTracks()[0];
                if (videoTrack) {
                    videoTrack.enabled = !videoTrack.enabled;
                    isVideoEnabled = videoTrack.enabled;
                    
                    const videoBtn = document.getElementById('videoBtn');
                    videoBtn.innerHTML = isVideoEnabled ? '📹' : '📷';
                    videoBtn.classList.toggle('active', isVideoEnabled);
                }
            }
        }

        async function toggleScreenShare() {
            try {
                if (!isScreenSharing) {
                    const screenStream = await navigator.mediaDevices.getDisplayMedia({
                        video: true,
                        audio: true
                    });
                    
                    if (peerConnection) {
                        const videoTrack = screenStream.getVideoTracks()[0];
                        const sender = peerConnection.getSenders().find(s => 
                            s.track && s.track.kind === 'video'
                        );
                        
                        if (sender) {
                            await sender.replaceTrack(videoTrack);
                        }
                    }
                    
                    document.getElementById('localVideo').srcObject = screenStream;
                    
                    isScreenSharing = true;
                    document.getElementById('screenBtn').classList.add('active');
                    showNotification('Screen sharing started', 'success');
                    
                    screenStream.getVideoTracks()[0].onended = () => {
                        stopScreenShare();
                    };
                    
                } else {
                    stopScreenShare();
                }
            } catch (error) {
                console.error('Error with screen sharing:', error);
                showNotification('Screen sharing not supported or permission denied', 'error');
            }
        }

        async function stopScreenShare() {
            try {
                const videoTrack = localStream.getVideoTracks()[0];
                if (peerConnection && videoTrack) {
                    const sender = peerConnection.getSenders().find(s => 
                        s.track && s.track.kind === 'video'
                    );
                    
                    if (sender) {
                        await sender.replaceTrack(videoTrack);
                    }
                }
                
                document.getElementById('localVideo').srcObject = localStream;
                isScreenSharing = false;
                document.getElementById('screenBtn').classList.remove('active');
                showNotification('Screen sharing stopped', 'info');
                
            } catch (error) {
                console.error('Error stopping screen share:', error);
            }
        }

        function endCall() {
            if (peerConnection) {
                peerConnection.close();
                peerConnection = null;
            }
            
            if (remoteStream) {
                remoteStream.getTracks().forEach(track => track.stop());
                remoteStream = null;
            }
            
            hideCallInterface();
            document.getElementById('remoteVideo').srcObject = null;
            document.getElementById('localVideo').srcObject = localStream;
            
            isCallActive = false;
            isScreenSharing = false;
            currentCall = null;
            
            document.getElementById('muteBtn').innerHTML = '🎤';
            document.getElementById('muteBtn').classList.remove('active');
            document.getElementById('videoBtn').innerHTML = '📹';
            document.getElementById('videoBtn').classList.add('active');
            document.getElementById('screenBtn').classList.remove('active');
            
            showNotification('Call ended', 'info');
        }

        function logout() {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                localStream = null;
            }
            
            endCall();
            
            connectedUsers.delete(currentUsername.toLowerCase());
            onlineUsers.clear();
            
            document.getElementById('mainContent').style.display = 'none';
            document.getElementById('loginSection').style.display = 'flex';
            document.getElementById('usernameInput').value = '';
            
            currentUsername = '';
            showNotification('Disconnected successfully', 'info');
        }

        function showNotification(message, type) {
            const notification = document.createElement('div');
            notification.className = 'notification';
            
            const colors = {
                success: '#28a745',
                error: '#dc3545',
                info: '#17a2b8'
            };
            
            notification.style.borderLeftColor = colors[type] || colors.info;
            notification.innerHTML = `<p>${message}</p>`;
            
            document.getElementById('notifications').appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 4000);
        }

        function simulateIncomingCall() {
            if (currentUsername && !isCallActive && Math.random() > 0.7) {
                const callers = Array.from(onlineUsers.keys());
                if (callers.length > 0) {
                    const caller = callers[Math.floor(Math.random() * callers.length)];
                    showIncomingCallNotification(caller);
                }
            }
        }

        function showIncomingCallNotification(caller) {
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.style.borderLeftColor = '#28a745';
            
            notification.innerHTML = `
                <h4>Incoming Call</h4>
                <p>${caller} is calling you</p>
                <div class="notification-actions">
                    <button class="btn btn-success" onclick="acceptCall('${caller}', this.parentElement.parentElement)">Accept</button>
                    <button class="btn btn-danger" onclick="declineCall('${caller}', this.parentElement.parentElement)">Decline</button>
                </div>
            `;
            
            document.getElementById('notifications').appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 15000);
        }

        function acceptCall(caller, notificationElement) {
            notificationElement.remove();
            currentCall = caller;
            startCall(caller, false);
        }

        function declineCall(caller, notificationElement) {
            notificationElement.remove();
            showNotification(`Declined call from ${caller}`, 'info');
        }

        setInterval(simulateIncomingCall, 20000);

        window.addEventListener('beforeunload', () => {
            if (currentUsername) {
                logout();
            }
        });