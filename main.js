let APP_ID = "b927a28b108e409ba4ee6e3b891f80aa";
let token = null;
let uid = String(Math.floor(Math.random() * 10000))

let queryString = window.location.search
let urlParams = new URLSearchParams(queryString)

let roomId = urlParams.get('room')

if(!roomId){
    window.location = 'lobby.html';
}

let client;
let channel;

let localStream;
let remoteStream;
// 
/**
 * Initializes the local media stream and calls the createOffer function.
 */
let init = async () => {
    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({uid, token})

    channel = client.createChannel(roomId)
    await channel.join()

    channel.on("MemberJoined", handleUserJoined)
    channel.on('MemberLeft', handleUserLeft)

    client.on('MessageFromPeer', handleMessageFromPeer)

    try {
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        document.getElementById('user-1').srcObject = localStream;
    } catch (error) {
        console.error('Error initializing local media stream:', error);
    }
}

let constraints = {
    video: {
        width:{min:640, ideal:1920, max:1920},
        width:{min:480, ideal:1080, max:1080},
    },
    audio: true

}

let handleUserLeft = (MemberID) => {
    document.getElementById('user-2').style.display = 'none';
    document.getElementById('user-1').classList.remove('smallFrame')

}

let handleMessageFromPeer = async (message, MemberID) => {
    message = JSON.parse(message.text)

    if(message.type === 'offer'){
        createAnswer(MemberID, message.offer)
    }

    if(message.type === 'answer'){
        addAnswer(message.answer)
    }

    if(message.type === 'candidate'){
        if(peerConnection){
            peerConnection.addIceCandidate(message.candidate)
        }
    }
}

let handleUserJoined = async (MemberID) => {
    console.log("A new user joined the channel:", MemberID)
    createOffer(MemberID);
}

const servers = {
    iceServers : [
        {
            urls :['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
} 

let createPeerConnection = async(MemberID) => {
    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream()
    document.getElementById('user-2').srcObject = remoteStream
    document.getElementById('user-2').style.display = 'block';
    document.getElementById('user-1').classList.add('smallFrame')

    if(!localStream){
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        document.getElementById('user-1').srcObject = localStream
    }
    
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
    })

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }

    peerConnection.onicecandidate = async (event) => {
        if(event.candidate){
            client.sendMessageToPeer({text: JSON.stringify({'type': 'candidate', 'candidate': event.candidate})}, MemberID)
        }
    }
}

let createOffer = async (MemberID) =>{
    await createPeerConnection(MemberID)
    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    client.sendMessageToPeer({text: JSON.stringify({'type': 'offer', 'offer': offer})}, MemberID)

}

let createAnswer = async (MemberID, offer) => {
    await createPeerConnection(MemberID)

    await peerConnection.setRemoteDescription(offer)

    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({text: JSON.stringify({'type': 'answer', 'answer': answer})}, MemberID)

}

let addAnswer = async (answer) => {
    if(!peerConnection.currentRemoteDecription){
        peerConnection.setRemoteDescription(answer)
    }
}

let leaveChannel = async () => {
    await channel.leave()
    await client.logout()
}

let toggleCamera = async () =>{
    let videoTracks = localStream.getTracks().find(track => track.kind === 'video')

    if(videoTracks.enabled) {
        videoTracks.enabled = false
        document.getElementById('camera-btn').style.backgroundColor = `rgb(255, 80, 80)`
    } else{
        videoTracks.enabled = true
        document.getElementById('camera-btn').style.backgroundColor = `rgb(179, 102, 249, .9)`

    }
}
let toggleMic = async () =>{
    let audioTracks = localStream.getTracks().find(track => track.kind === 'audio')

    if(audioTracks.enabled) {
        audioTracks.enabled = false
        document.getElementById('mic-btn').style.backgroundColor = `rgb(255, 80, 80)`
    } else{
        audioTracks.enabled = true
        document.getElementById('mic-btn').style.backgroundColor = `rgb(179, 102, 249, .9)`

    }
}
window.addEventListener('beforeunload', leaveChannel)

document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleMic)


init()