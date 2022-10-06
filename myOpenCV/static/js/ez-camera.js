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

const OPT_SIM = false;

const FPS = 30;
const selectElem = document.getElementById('availableCameras');
const video = document.getElementById("videoInput");
const canvasDisp = document.getElementById("canvasDisp");
const canvasDispId = "canvasDisp";
const buttonIds = ["availableCameras", "btnLiveCamera", "btnLocalFilter", "btnPostToCloud"];

let _currentState = 'unknown';
let _currentStream = null;         
let _filterRunFlag = false;
let _width = 640*2;
let _height = 480*2;
let _vidCap = null;             //new cv.VideoCapture(video);
let _vidSrc32 = null;           //new cv.Mat(height, width, cv.CV_8UC4);
let _dst8;
let _filter = {
    applyFilter : function(src)  { return src; },
    dispose : function() {}
}


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
            enableElem(buttonIds, true);
            enableElem('btnLiveCamera', false);
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
            // enableElem("btnLiveCamera", true);
            break;
        case "Cloud_Result":
            showBusyIcon(false);
            updateStatus("Result", "雲端已回傳結果.");
            enableElem("btnLiveCamera", true);
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
    navigator.mediaDevices.enumerateDevices()
        .then(_gotDevices)
        .then(function(){
            showBusyIcon(false);
            updateStatus('mediaDevices', 'got!');
            _changeState("Devices_OK");
            _initEventHandlers();
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

    video.onloadeddata = function() {
        // alert("video.onloaddata");
        _adjustCanvasGuiSize(video);
    }

    // return;
    
    // select default camera
    try {
        const c = selectElem.lastChild;
        if(c!=null && c.value!=null) {
            selectElem.value = c.value;
            openCamera();
        }
    } catch(err) {
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
    if (OPT_SIM) {
        _openCamera_sim();
        return;
    }

    if(_currentState == "Camera_Live")
        return;

    _closeCamera();    

    const videoConstraints = {};
    if (selectElem.value === '') {
        videoConstraints.facingMode = 'environment';
    } else {
        videoConstraints.deviceId = { exact: selectElem.value };
    }
    videoConstraints.width = { ideal: _width };    
    videoConstraints.height = { ideal: _height };

    const constraints = {
        video: videoConstraints,
        audio: false
    };
    // console.log(videoConstraints);

    navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream) {
        let settings = stream.getVideoTracks()[0].getSettings();
        _width = settings.width;
        _height = settings.height;
        _currentStream = stream;
        video.srcObject = stream;
        video.width = _width;
        video.height = _height;
        _adjustCanvasGuiSize(video);
        _changeState("Camera_Live");
        _showVideoOrCanvas(video);
        video.play();
    })
    .then(function() {
        // 再抓一次.
        return navigator.mediaDevices.enumerateDevices();
    })
    .then(_gotDevices)
    .catch(function(err) {
        // console.log("An error occurred! " + err);
        const errMsg = "openCamera 異常: " + err;
        console.error(errMsg);
        alert(errMsg);
    });
}

function _openCamera_sim() {
    if(_currentState == "Camera_Live")
        return;

    try{    
        _closeCamera();  
        _width = 320;
        _height = 240;
        video.width = _width;
        video.height = _height;
        video.innerHTML = `<source src="../static/img/_tmp_movie.mp4" type="video/mp4">`
        _currentStream = "sim";
        _adjustCanvasGuiSize(video);
        _changeState("Camera_Live");
        _showVideoOrCanvas(video);
    } catch(err) {
        // console.log("An error occurred! " + err);
        const errMsg = "openCamera 異常: " + err;
        console.error(errMsg);
        alert(errMsg);
    }
}


function _closeCamera() {
    function _stopMediaTracks(stream) {
        if(stream==="sim")
            return;
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
    const img = _snapshot();
    if(img) {
        _changeState("Cloud_Posting");
        _filterRunFlag = false;
        cv.imshow(canvasDispId, img);
        _showVideoOrCanvas(canvasDispId);
        _postImageToCloud(img);
    } else {
        // _changeState("Camera_Live");
        openCamera();
    }
}


function _snapshot() {
    let err = null;
    const oldState = _currentState;
    try {
        if(_currentState == "Camera_Live") {
            _changeState("Camera_Snapshot");
            _prepareCvCaptureBufs(_width, _height, _currentStream);
            _vidCap.read(_vidSrc32);
            return _vidSrc32;
        }
        if(_currentState == "Local_Filtering") {
            _changeState("Camera_Snapshot");
            _filterRunFlag = false;
            _vidCap.read(_vidSrc32);
            return _vidSrc32;
        }
    } catch(ex) {
        err = ex;
    }
    if (err==null)
        err = "無法取像!";
    const errMsg = "_snapshot 異常 : " + err;
    console.error(errMsg);
    alert(errMsg);
    _currentState = oldState;
    return null;
}


function _postImageToCloud(img) {
    function _simCloud() {
        if(_vidSrc32) {
            let dst = _filter.applyFilter(_vidSrc32);
            cv.bitwise_not(dst, dst);
            cv.imshow(canvasDispId, dst);
            _showVideoOrCanvas(canvasDispId);
            _showAnchorBoxes(false);
        }
        _changeState("Cloud_Result");
    }
    setTimeout(_simCloud, 3000);
}


function toggleLocalFiltering() {
    if(_currentState == "Camera_Live") {
        startLocalFiltering();
        return;
    }
    if (_currentState == "Local_Filtering") {        
        stopLocalFiltering();
        return;
    }
}


function startLocalFiltering() {
    if(!_currentStream)
        return;
    if(_filterRunFlag)
        return;
    try {    
        _prepareCvCaptureBufs(_width, _height);
        // hide video and show canvas
        // video.style.display = 'none';
        // document.getElementById(canvasDispId).style.display = 'block';
        _showVideoOrCanvas(canvasDispId);
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


function stopLocalFiltering() {
    // flag
    _filterRunFlag = false;
    // show video and hide canvas
    // document.getElementById(canvasDispId).style.display = 'none';
    // video.style.display = 'block';
    _showVideoOrCanvas(video);
}


function _processVideo() {
    try {
        if (!_filterRunFlag) {
            if(_currentState == "Local_Filtering")
                _changeState("Camera_Live");
            return;
        }
        // TIMER: timestamp
        let begin = Date.now();
        // get image frame via cv.VideoCapture
        _vidCap.read(_vidSrc32);
        // or get image via context
        const img = _filter != null ? 
            _filter.applyFilter(_vidSrc32) : 
            _vidSrc32;
        // render to canvas
        cv.imshow(canvasDispId, img);
        // TIMER: schedule the next one.
        let delay = 1000/FPS - (Date.now() - begin);
        setTimeout(_processVideo, delay);
    } catch (err) {
        const errMsg = "_processVideo 異常: " + err;
        console.error(errMsg);
        updateStatus(_currentState, "影像異常!");
        _filterRunFlag = false;
        alert(errMsg);
        stopLocalFiltering();
        _changeState("Camera_Live");
    }
}


function _disposeCvBufs(){
    try {
        if(_filter) {
            _filter.dispose();
            _filter = null;
        }
        if(_vidSrc32) {
            delete _vidSrc32;
            _vidSrc32 = null;
        }
        if(_vidCap) {
            // _cap.release();
            delete _vidCap;
            _vidCap = null;
        }
        return true;
    } catch (err) {
        const errMsg = "disposeCvBufs 異常: " + err;
        console.error(errMsg);
        alert(errMsg);
        return false;
    }
}


function _prepareCvCaptureBufs(width, height) {
    if (!_disposeCvBufs())
        return;

    _vidSrc32 = new cv.Mat(height, width, cv.CV_8UC4);
    _vidCap = new cv.VideoCapture(video);

    // create filter object
    _filter = _createMorphFilter(width, height);
}


function _createMorphFilter(width, height) {
    // DEMO
    let filter = {
        name : "MORPH_GRADIENT",
        buf : new cv.Mat(height,width, cv.CV_8UC3),
        dst : new cv.Mat(height,width, cv.CV_8UC3),
        kernel : cv.Mat.ones(5, 5, cv.CV_8U),

        dispose : function() {
            if (this.dst) 
                delete this.dst;
                this.dst = null;
            if (this.buf) 
                delete this.buf;
                this.buf = null;
            if (this.kernel) 
                delete this.kernel;
                this.kernel = null;
        },

        applyFilter : function(src32) {
            cv.cvtColor(src32, this.buf, cv.COLOR_RGBA2RGB);
            cv.morphologyEx(this.buf, this.dst, cv.MORPH_GRADIENT, this.kernel);
            return this.dst;
        },
    };
    return filter;
}


function _adjustCanvasGuiSize(videoElem) {
    // video 與 canvasDisp 由 css 控制
    _updateAnchorBoxesPos();
}


function _updateAnchorBoxesPos() {
    const anchor1 = document.getElementById("anchorBox-1");
    const anchor2 = document.getElementById("anchorBox-2");    
    // zIndex
    video.style.zIndex = 1;
    canvasDisp.style.zIndex = 9;
    anchor1.style.zIndex = 19;
    anchor2.style.zIndex = 19;
    // anchors
    const owner = video;
    const px = owner.offsetLeft;
    const py = owner.offsetTop;
    const pw = owner.offsetWidth;
    const ph = owner.offsetHeight;
    
    console.log(`video offsetWidth=${pw} offsetHeight=${ph}`);
    // const tgt = document.getElementById("ez-log");
    // tgt.innerHTML += (`<p>video offsetWidth=${pw} offsetHeight=${ph}</p>`);
    canvasDisp.style.height = ph + "px";
    canvasDisp.parentElement.style.height = ph + "px";

    // coordinates in video frame.
    let aw = parseInt(Math.min(_width, _height) * 0.1);
    const ax_gap = aw * 1;
    const ay_gap = aw * 1.5;
    let ax = _width - aw - ax_gap;
    let ay = ay_gap;
    let ay2 = _height - aw - ay;
    // to html coordinates
    const xratio = pw / _width;
    const yratio = ph / _height;
    aw = aw * xratio;
    ax = ax * xratio + px;
    ay = ay * yratio + py;
    ay2 = ay2 * yratio + py;    
    // style
    // anchor1.style.position = "absolute";
    anchor1.style.left = ax + "px";
    anchor1.style.top = ay + "px";
    anchor1.style.width = aw + "px";
    anchor1.style.height = aw + "px";
    // style
    // anchor2.style.position = "absolute";
    anchor2.style.left = ax + "px";
    anchor2.style.top = ay2 + "px";
    anchor2.style.width = aw + "px";
    anchor2.style.height = aw + "px";
    //
    _showAnchorBoxes(true);

    // bigWaitIcon
    const bi = document.getElementById("bigWaitIcon");
    if(bi) {
        bi.style.position = "absolute";
        bi.style.zIndex = 29;
        const bw = bi.offsetWidth;
        const bx = (pw - bw) / 2;
        const by = (ay + ay2 - bw) / 2;
        bi.style.left = bx + "px";
        bi.style.top = by + "px";       
    }
}


function _showAnchorBoxes(visible) {
    showElem("anchorBox-1", visible);
    showElem("anchorBox-2", visible);
}


function _showVideoOrCanvas(target) {
    if(target === video) {
        canvasDisp.style.display = 'none';
        // video.style.display = 'block';    
    } else {
        // video.style.display = 'none';
        canvasDisp.style.display = 'block';
    }
}


// function showElem(id, visible, display = null) {
//     const elem = document.getElementById(id);
//     if(elem) {
//         elem.style.visibility = visible ? "visible" : "hidden";
//         if(display != null) {
//             elem.style.display = display;
//         }
//     }
// }
