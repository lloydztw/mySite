//const cv = require('../static/js/opencv.js');
//import cv from './opencv.js';
/*
cv.onRuntimeInitialized = ()=>{
    // opencv is loaded and ready !!!
    document.getElementById('status-id').innerHTML = "[opencv] RUNTIME ready!"
}
*/

_TRACE('', 'enter');
let srcFileInputElem = document.getElementById('srcFileInput-id');
let srcImageElem = document.getElementById('srcImage-id');
let outImageElem = document.getElementById('outImage-id');
let outCanvasElem = document.getElementById('outCanvas-id');
let _orgImgObjUrl = null;
let _cloudImgObjUrl = null;
let _isSrcImageReady = false;


function initEzImageUtils(args) {
    _TRACE('', 'init: addEventListener (s)')

    // 加掛 eventListenter (for 輸入檔名改變)
    srcFileInputElem.addEventListener('change', (e) => {
        // e.target 會指向 srcFileInputElem
        displayOrgSrcImageView(URL.createObjectURL(e.target.files[0]));
        enableButtons(true);
        _isSrcImageReady = true;
    }, false);

    // 加掛 eventListenter (for srcImageElem 被載入圖片)
    srcImageElem.onload = function() {
        // RESERVED!
    };
    
    // 加掛 eventListenter (for btnLocalTest click)
    document.getElementById('btnLocalTest-id').onclick = async function() {
        showBusyIcon(true);
        displayOne(srcImageElem);
        processImageLocally('srcImage-id', 'outCanvas-id');
        displayOne(outCanvasElem);
        showBusyIcon(false);
    };
    
    // 加掛 eventListenter (for btnRetrieve click)
    document.getElementById('btnRetrieve-id').onclick = async function() {
        displayOne(srcImageElem);
    };

    // 加掛 eventListenter (for Form submit)    
    document.forms['srcFileForm-id'].addEventListener('submit', (ev) => {
        if(!_isSrcImageReady) {
            return;
        }
        showBusyIcon(true);
        updateStatus("EzImageUtils", "調用雲端程序中 ...");
        submit_upload_request_to_server(ev);
    });

    // 加掛 eventListenter (for body onresize)
    document.body.onresize = function() {
        autoAdjustElemsWidth();
    };

    updateStatus(null,'init: ok.');
}


function initFirstLocalImage() {
    // // Firefox 1.0+
    // var isFirefox = typeof(InstallTrigger) !== 'undefined';
    // if (isFirefox) {
    //     alert('Firefox');

    //     // 還原上一次的檔案選擇 (Safari 無效!)
    //     if (srcFileInputElem.files.length > 0) {
    //         fileObj = srcFileInputElem.files[0];
    //         if( fileObj != null) {
    //             displayOrgSrcImageView(URL.createObjectURL(fileObj));
    //             enableButtons(true);
    //             return;
    //         }
    //     }
    // }
    
    // Disable all major buttons,
    // before openning a new file.
    displayOne(null);
    enableButtons(false);
    autoAdjustElemsWidth();
}


function processStreamingFromServer(stm) {
    // let url = URL.createObjectURL(stm);
    // let outImageElem = document.getElementById('outImage-id');
    // outImageElem.src = url;
    // outImageElem.style.display = 'block';
    // displayOrgSrcImageView(url);
}


function processImageLocally(srcImageId, outCanvasId) {
    let src = cv.imread(srcImageId);
    let dst = new cv.Mat()
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY);    
    if (true) {
        let kernelM = cv.Mat.ones(5, 5, cv.CV_8U);
        cv.morphologyEx(src, dst, cv.MORPH_GRADIENT, kernelM);
        kernelM.delete();
        cv.bitwise_not(dst, dst);
    }
    cv.imshow(outCanvasId, dst);
    src.delete();
    dst.delete();
    // openFullscreen(canvasId);
}


async function submit_upload_request_to_server(ev) {
    //Step 0 : 從 html Form 取得 formData
    // NOTE: ev.target 會指向 the form (getElementById('fileForm-id'))
    ev.preventDefault();
    // const formData = new FormData(ev.target);
    const formData = new FormData();
    formData.append('file', srcFileInputElem.files[0]);
    
    //Step 1 : 準備 url 與 options 參數
    const corsURL = 'https://cors-anywhere.herokuapp.com/';
    const url = corsURL + "https://fathomless-castle-45995.herokuapp.com/upload_file";
    // const url = "/upload_file";

    const options = {
        method: "POST",
        // 【注意】請不要指定 headers 內容, 讓 JS 自動根據 formData 填入 headers !!!
        // headers: {
        // },
        body: formData, // string, FormData, Blob, BufferSource, or URLSearchParams
    };

    // 參考
    // https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams#reading_the_stream
    // Fetch the original image
    fetch(url, options)
        // Retrieve its body as ReadableStream
        .then((response) => {
            const reader = response.body.getReader();
            return new ReadableStream({
                start(controller) {
                    return pump();
                    function pump() {
                    return reader.read().then(({ done, value }) => {
                        // When no more data needs to be consumed, close the stream
                        if (done) {
                            controller.close();
                        return;
                        }
                        // Enqueue the next data chunk into our target stream
                        controller.enqueue(value);
                        return pump();
                    });
                    }
                }
            })
        })
        // Create a new response out of the stream
        .then((stream) => new Response(stream))
        // Create an object URL for the response
        .then((response) => response.blob())
        .then((blob) => URL.createObjectURL(blob))
        // Update image
        .then((url) => {
            // console.log(image.src = url);
            // outImageElem.src = url;
            // displayOne(outImageElem);
            displayCloudImageView(url);
            showBusyIcon(false);
            updateStatus("EzImageUtils", "已收到雲端回傳結果.");    
        })
        .catch((err) => {
            console.error(err);
            alert(err);
            showBusyIcon(false);
            updateStatus("EzImageUtils", "is ready.");    
        });
}


function xxx_renderImage(canvas, blob) {
    const ctx = canvas.getContext('2d')
    switch (blob.type) {
    case "image/jpeg": // Normally, you don't need it (switch), but if you have a special case, then you can consider it.
    case "image/png":
        const img = new Image()
        img.onload = (event) => {
        URL.revokeObjectURL(event.target.src) // Once it loaded the resource, then you can free it at the beginning.
        ctx.drawImage(event.target, 0, 0)
        }
        img.src = URL.createObjectURL(blob)
        break  
    }
}    


function xxx_openFullScreen(elemId) {
    let elem = document.getElementById(elemId);
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
    }
}


function autoAdjustElemsWidth() {
    // 限制寬度 (for PC 大型 Browser)
    if(screen.width > screen.height && window.outerWidth > 500) {
        // document.getElementsById("ez-main-panel").style.width = "500px";
        for(let tagName of ['header', 'section', 'footer']) {
            const elems = document.getElementsByTagName(tagName);
            for(let elem of elems) {
                elem.style.width = "500px";
            }
        }
    }
}


function xxx_toggleFullScreen_xxx() {
    var doc = window.document;
    var docEl = doc.documentElement;
  
    var requestFullScreen =
      docEl.requestFullscreen ||
      docEl.mozRequestFullScreen ||
      docEl.webkitRequestFullScreen ||
      docEl.msRequestFullscreen;
    var cancelFullScreen =
      doc.exitFullscreen ||
      doc.mozCancelFullScreen ||
      doc.webkitExitFullscreen ||
      doc.msExitFullscreen;
  
    if (
      !doc.fullscreenElement &&
      !doc.mozFullScreenElement &&
      !doc.webkitFullscreenElement &&
      !doc.msFullscreenElement
    ) {
      requestFullScreen.call(docEl);
    } else {
      cancelFullScreen.call(doc);
    }
}


function displayOrgSrcImageView(objUrl) {
    if(_orgImgObjUrl!=null && _orgImgObjUrl!=objUrl) {
        _TRACE("org_URL:",_orgImgObjUrl);
        URL.revokeObjectURL(_orgImgObjUrl);
        _orgImgObjUrl = objUrl;
    }
    if(objUrl!=null) {
        _TRACE("new_URL:", objUrl);
        srcImageElem.src = objUrl;
        displayOne(srcImageElem);
    }
}

function displayCloudImageView(objUrl) {
    if(_cloudImgObjUrl!=null && _cloudImgObjUrl!=objUrl) {
        // _TRACE("org_URL:",_orgImgObjUrl);
        URL.revokeObjectURL(_cloudImgObjUrl);
        _cloudImgObjUrl = objUrl;
    }
    if(objUrl!=null) {
        // _TRACE("new_URL:", objUrl);
        outImageElem.src = objUrl;
        displayOne(outImageElem);
    }
}


function displayOne(elemToShow) {
    const elems = [srcImageElem, outCanvasElem, outImageElem];
    for (let elem of elems) { // You can use `let` instead of `const` if you like
        // console.log(element);
        if(elem != elemToShow)
            elem.style.display = 'none';
    }
    if(elemToShow!=null) {
        elemToShow.style.display = 'block';
    }
}

function enableButtons(enabled){
    const ids = ['btnRetrieve-id', 'btnLocalTest-id', 'btnSubmit-id'];
    if(enabled) {
        for(let id of ids) {
            document.getElementById(id).removeAttribute('disabled');
        }
    } else  {
        for(let id of ids) {
            document.getElementById(id).setAttribute('disabled', true);
        }
    } 
}


function xxx_showBusyIcon(show) {
    let elems = document.getElementsByClassName("header-icons");
    if (elems.length==0) {
        return;
    }
    // if(show) {
    //     elems[1].style.display = 'none';
    //     elems[0].style.display = 'inline-block';
    // } else {
    //     elems[0].style.display = 'none';
    //     elems[1].style.display = 'inline-block';
    // }
    let ht = elems[0].innerHTML;
    console.log(ht)
    if(!show) {
        if (ht.includes("w3-spin")){
            elems[0].innerHTML = ht.replace("w3-spin","ez-dummy");
        }
    } else {
        if (ht.includes("ez-dummy")){
            elems[0].innerHTML = ht.replace("ez-dummy","w3-spin");
        }
    }
    console.log(elems[0].innerHTML);
}


function xxx_updateStatus(moduleName, msg) {
    if (!moduleName)
        moduleName = "EzImageUtils";
    _TRACE(moduleName, msg);
    document.getElementById('status-id').innerHTML = 
        moduleName + " " + msg;
}


function xxx_TRACE(moduleName, msg) {
    if (!moduleName)
        moduleName = "EzImageUtils";
    console.log(`[${moduleName}] ${msg}`)
}


function xxx_dump_url_to_file(newUrl, filename) {
    const link = document.createElement('a');
    link.href = newUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    URL.revokeObjectURL(newUrl);
}