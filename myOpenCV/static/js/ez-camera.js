// 參考
// WebRTC 
//  https://webrtc.org/getting-started/media-devices
//
// OpenCV
//  https://docs.opencv.org/3.4/dd/d00/tutorial_js_video_display.html
//
// http 安全問題：
//  in mozilla developer go to 
//      about:config 
//      set to true 
//          media.devices.insecure.enabled 
//      and 
//          media.getusermedia.insecure.enabled
//


const FPS = 30;
const selectElem = document.getElementById('availableCameras');
const video = document.getElementById("videoInput");
const canvasFrame = document.getElementById("canvasFrame");
const canvasDispId = "canvasDisplay";
const buttonIds = ["availableCameras", "btnLiveCamera", "btnLocalFilter", "btnPostToCloud"];

let _currentState = 'unknown';
let _currentStream = null;         
let _filterRunFlag = false;
let _width = 640;
let _height = 480;
let _cap = null;            //new cv.VideoCapture(video);
let _src = null;            //new cv.Mat(height, width, cv.CV_8UC4);
let _dst = null;            //new cv.Mat(height, width, cv.CV_8UC1);


function _changeState(state) {
    if(_currentState === state)
        return;
    _currentState = state;
    switch(state) {
        case "Devices_OK":
            showBusyIcon(false);
            updateStatus('mediaDevices', 'are ready.');
            enableElem(buttonIds, false);
            enableElem('availableCameras', true);
            break;
        case "Camera_Live":
            showBusyIcon(false);
            updateStatus(state, `${_width}x${_height}`);
            enableElem(buttonIds, false);
            enableElem('btnLocalFilter', true);
            enableElem('btnPostToCloud', true);
            if(_currentStream == null)
                _changeState("Devices_OK");
            break;
        case "Local_Filtering":
            showBusyIcon(false);
            updateStatus("Camera_Live", "本機濾波演示");
            enableElem(buttonIds, false);
            enableElem('btnLocalFilter', true);
            enableElem('btnPostToCloud', true);
            break;
        case "Cloud_Posting":
            showBusyIcon(true);
            updateStatus("Posting", "上傳雲端中...");
            enableElem(buttonIds, false);
            break;
        default:
            break;
    }
}


function initCamera() {
    // video.setAttribute('autoplay', '');
    // video.setAttribute('muted', '');
    // video.setAttribute('playsinline', '');
    enableElem(buttonIds, false);
    await navigator.mediaDevices.enumerateDevices()
        .then(_gotDevices)
        .then(function(){
            showBusyIcon(false);
            updateStatus('mediaDevices', 'got!');
            _initEventHandlers();
            _changeState("Devices_OK");
        });
}


function _initEventHandlers() {
    selectElem.onchange = function() {
        openCamera();
    }
    document.getElementById('btnLiveCamera').onclick = function() {
        openCamera();
    }
    document.getElementById('btnLocalFilter').onclick = function() {
        toggleLocalFiltering();
    }
    document.getElementById('btnPostToCloud').onclick = function() {
        snapshotAndPostToCloud();
    }
}


function _gotDevices(mediaDeviceInfos) {
    selectElem.innerHTML = '';
    selectElem.appendChild(document.createElement('option'));
    let count = 1;
    mediaDeviceInfos.forEach(mediaDevice => {
        if (mediaDevice.kind === 'videoinput') {
            const option = document.createElement('option');
            option.value = mediaDevice.deviceId;
            const label = mediaDevice.label || `Camera ${count++}`;
            const textNode = document.createTextNode(label);
            option.appendChild(textNode);
            selectElem.appendChild(option);
        }
    });
}


function openCamera() {
    if(_currentState == "Camera_Live")
        return;

    _closeCamera();
    const videoConstraints = {};
    if (selectElem.value === '') {
        videoConstraints.facingMode = 'environment';
    } else {
        videoConstraints.deviceId = { exact: selectElem.value };
    }    
    const constraints = {
        video: videoConstraints,
        audio: false
    };
    // console.log(videoConstraints);

    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
            video.srcObject = stream;
            _currentStream = stream;
            _updateCanvasSize(_currentStream);
            _changeState("Camera_Live");
        })
        .catch(function(err) {
            // console.log("An error occurred! " + err);
            const errMsg = "openCamera 異常: " + err;
            console.error(errMsg);
            alert(errMsg);
        });
}


function _closeCamera() {
    function _stopMediaTracks(stream) {
        if(stream) {
            stream.getTracks().forEach(track => {
                track.stop();
            });
        }
    }    
    _filterRunFlag = false;
    _stopMediaTracks(_currentStream);
    _currentStream = null;
    _disposeCvBufs();
    // 內部調用, 不改變 state
    //_changeState("Devices_OK");
}


function snapshotAndPostToCloud() {
    alert("Not implemented yet!")
}


function toggleLocalFiltering() {
    if(_currentState == "Camera_Live") {
        startVideoProcessing();
        return;
    }
    if (_changeState == "Local_Filtering") {        
        stopVideoProcessing();
        return;
    }
}


function startVideoProcessing() {
    if(!_currentStream)
        return;
    if(_filterRunFlag)
        return;
    try {    
        _prepareCvCaptureBufs(_width, _height, _currentStream);
        // hide video and show canvas
        video.style.display = 'none';
        document.getElementById(canvasDispId).style.display = 'block';
        // change state
        _filterRunFlag = true;
        _changeState("Local_Filtering");
        // schedule first one.
        setTimeout(_processVideo, 0);
    } catch(err) {
        const errMsg = "啟動本機濾波 異常: " + err;
        console.error(errMsg);
        alert(errMsg);
    }
}


function stopVideoProcessing() {
    // flag
    _filterRunFlag = false;
    // show video and hide canvas
    document.getElementById(canvasDispId).style.display = 'none';
    video.style.display = 'block';
}


function _processVideo() {
    try {
        if (!_filterRunFlag) {
            _changeState("Camera_Live");
            return;
        }
        // TIMER: timestamp
        let begin = Date.now();
        // get image frame via cv.VideoCapture
        cap.read(src);
        // or get image via context
        dst = _applyLocalFilter(src);
        // render to canvas
        cv.imshow(canvasDispId, dst);
        // TIMER: schedule the next one.
        let delay = 1000/FPS - (Date.now() - begin);
        setTimeout(processVideo, delay);
    } catch (err) {
        const errMsg = "_processVideo 異常: " + err;
        console.error(errMsg);
        updateStatus(_currentState, "影像異常!");
    }
}


function _disposeCvBufs(){
    try {
        if(_src) {
            delete _src;
            _src = null;
        }
        if(_dst) {
            delete _dst;
            _dst = null;
        }
        if(_cap) {
            _cap.release();
            delete _cap;
            _cap = null;
        }
        return true;
    } catch (err) {
        const errMsg = "disposeCvBufs 異常: " + err;
        console.error(errMsg);
        alert(errMsg);
        return false;
    }
}


function _prepareCvCaptureBufs(width, height, stream) {
    if (!_disposeCvBufs())
        return;
    _src = new cv.Mat(height, width, cv.CV_8UC4);
    _dst = new cv.Mat(height, width, cv.CV_8UC1);
    _cap = new cv.VideoCapture(video);    
}


function _applyLocalFilter(src){
    // DEMO
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
    // MorphologyEx
    let kernelM = cv.Mat.ones(5, 5, cv.CV_8U);
    cv.morphologyEx(src, dst, cv.MORPH_GRADIENT, kernelM);
    kernelM.delete();
    cv.bitwise_not(dst, dst);
    return dst;
}


function _updateCanvasSize(steam) {
    const settings = stream.getVideoTracks()[0].getSettings();
    _width = settings.width;
    _height = settings.height;
    const canvasDisplay = document.getElementById(canvasDispId);
    const elems = [canvasFrame, canvasDisplay];
    for (let elem of elems) {
        elem.style.width = _width + "px";
        elem.style.height = _height + "px";
    }
    _updateAnchorBoxesPos(_width, _height);
}


function _updateAnchorBoxesPos(cWidth, cHeight) {
    const anchor1 = document.getElementById("anchorBox-1");
    const anchor2 = document.getElementById("anchorBox-2");
    //anchor1.style.position;
}


function _showAnchorBoxes(show) {
    const anchor1 = document.getElementById("anchorBox-1");
    const anchor2 = document.getElementById("anchorBox-2");
    if(show) {
        anchor1.style.visibility = 'visible';
        anchor2.style.visibility = 'visible';
    } else {
        anchor1.style.visibility = 'hidden';
        anchor2.style.visibility = 'hidden';
    }
}


