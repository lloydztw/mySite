//===========================================================================
// 參考
// WebRTC 
//  https://webrtc.org/getting-started/media-devices
//
// Firefox 瀏覽器設定:
//  開啟 about:config 頁面
//      media.devices.insecure.enabled = true
//      media.getusermedia.insecure.enabled = true
//

//===========================================================================
// HTML 必須有的 elems
//   select#availableCameras
function initAvailableCameras(args) {
    // security 
    // let webConfiguration = WKWebViewConfiguration()
    // webConfiguration.allowsInlineMediaPlayback = true

    // Get the initial set of cameras connected
    const videoCameras = getConnectedDevices('videoinput');
    updateCameraList(videoCameras);    
    // Listen for changes to media devices and update the list accordingly
    try {
        navigator.mediaDevices.addEventListener('devicechange', event => {
            const newCameraList = getConnectedDevices('video');
            updateCameraList(newCameraList);
        });
    } catch(error) {
        console.error(error);
        alert('無法取得 navigator.mediaDevices !');
    }
}

//===========================================================================
// 查詢媒體裝置
// Fetch an array of devices of a certain type
async function getConnectedDevices(type) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === type)
}

//===========================================================================
// 監聽裝置變更
// Updates the select element with the provided set of cameras
function updateCameraList(cameras) {
    const listElement = document.querySelector('select#availableCameras');
    if (listElement==null) {
        alert("html 找不到 'sect#availableCameras");
        return;
    }
    listElement.innerHTML = '';
    try {
        cameras.map(camera => {
            const cameraOption = document.createElement('option');
            cameraOption.label = camera.label;
            cameraOption.value = camera.deviceId;
        }).forEach(cameraOption => listElement.add(cameraOption));
    } catch(error) {
        console.error(error);
        alert('沒有 camera!');
    }
}


//===========================================================================
// 媒體限制條件
// Open camera with at least minWidth and minHeight capabilities
async function openCamera(cameraId, minWidth, minHeight) {
    const constraints = {
        'audio': {'echoCancellation': true},
        'video': {
            'deviceId': cameraId,
            'width': {'min': minWidth},
            'height': {'min': minHeight}
            }
        }

    return await navigator.mediaDevices.getUserMedia(constraints);
}

//===========================================================================
// 本機播放
async function playVideoFromCamera() {
    try {
        const constraints = {'video': true, 'audio': true};
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const videoElement = document.querySelector('video#localVideo');
        videoElement.srcObject = stream;
    } catch(error) {
        console.error('Error opening video camera.', error);
    }
}


/*
<html>
<head><title>Local video playback</video></head>
<body>
    <video id="localVideo" autoplay playsinline controls="false"/>
</body>
</html>
*/