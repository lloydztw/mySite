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

let width = 640;
let height = 480;
let src = null;             //new cv.Mat(height, width, cv.CV_8UC4);
let dst = null;             //new cv.Mat(height, width, cv.CV_8UC1);
let cap = null;             //new cv.VideoCapture(video);
let _streaming = false;


function initCamera() {
    // video.setAttribute('autoplay', '');
    // video.setAttribute('muted', '');
    // video.setAttribute('playsinline', '');
    // video.width = width;
    // video.height = height;
    // cap = new cv.VideoCapture(video);

    navigator.mediaDevices.enumerateDevices()
        .then(gotDevices)
        .then(function(){
            showBusyIcon(false);
            updateStatus('devices', 'got!');
            selectElem.onchange = function() {
                openCamera();
            }
        });
}


function gotDevices(mediaDeviceInfos) {
    selectElem.innerHTML = '';
    selectElem.appendChild(document.createElement('option'));
    let count = 1;
    mediaDeviceInfos.forEach(mediaDevice => {
        if (mediaDevice.kind === 'videoinput') {
            const option = document.createElement('option');
            option.value = mediaDevice.deviceId;
            // console.log(`deviceId = ${option.value}`);
            const label = mediaDevice.label || `Camera ${count++}`;
            const textNode = document.createTextNode(label);
            option.appendChild(textNode);
            selectElem.appendChild(option);
        }
    });
}


function stopMediaTracks(stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
}


function openCamera() {
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
    console.log(videoConstraints);

    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
            video.srcObject = stream;
            // html has autoplay attribute
            // video.play();    
            _streaming = true;
            // const w = video.width;
            // const h = video.height;
            // console.log(`video size = ${w}x${h}`); 
            // adjustBufAndDisplaySize();
            // startPreview();
            // updateStatus('camera', `${w}x${h}`);
            updateStatus('camera', `streaming.`);
            showBusyIcon(false);
        })
        .catch(function(err) {
            // console.log("An error occurred! " + err);
            const errMsg = "openCamera Error: " + err;
            console.error(errMsg);
            alert(errMsg);
        });
}


function startVideoProcessing() {
    if (_streaming)
        return;
    // schedule first one.
    // _streaming = true;
    // setTimeout(processVideo, 0);
}


function processVideo() {
    // try {
    //     if (!_streaming) {
    //         // clean and stop.
    //         src.delete();
    //         dst.delete();
    //         return;
    //     }
    //     // TIMER: timestamp
    //     let begin = Date.now();
    //     // get image frame via cv.VideoCapture
    //     cap.read(src);
    //     // or get image via context
    //     // context.drawImage(video, 0, 0, width, height);
    //     // src.data.set(context.getImageData(0, 0, width, height).data);
    //     // image processing
    //     cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
    //     // render to canvas
    //     cv.imshow(canvasDispId, dst);
    //     // TIMER: schedule the next one.
    //     let delay = 1000/FPS - (Date.now() - begin);
    //     setTimeout(processVideo, delay);
    // } catch (err) {
    //     // utils.printError(err);
    //     console.error(err);
    // }
}



function adjustBufAndDisplaySize() {
    // let dispElem = document.getElementById(canvasDispId);
    // width = video.width;
    // height = video.height;
    // dispElem.style.width = width + "px";
    // dispElem.style.height = height + "px";
    // // dispElem.style.border = 'solid';
    // // dispElem.style.borderWidth = "1px";
    // if (src)
    //     delete src;
    // if (dst)
    //     delete dst;
    // src = new cv.Mat(height, width, cv.CV_8UC4);
    // dst = new cv.Mat(height, width, cv.CV_8UC1);
}

