/*
Module         : ez-post.js
@Author        : LeTian Chang
@Email         : lloydz.tw@gmail.com
@Creation      : 2022/10/05
*/

// 使用 cors-anywhere proxy 暫時避掉 CORS 的問題.
const CorsURL = 'https://cors-anywhere.herokuapp.com/';
const ServerURL = CorsURL + 'https://fathomless-castle-45995.herokuapp.com';
// const ServerURL2 = 'http://127.0.0.1:8000';


const EzCloud = {
    
    pingServer : async function() {
        const url = ServerURL + "/version";
        const options = {
            method: "GET",
        };
        fetch(url, options)
        .then((response) => {
            return response.json();
        })
        .then((json) => {
            console.log(json);
        })
        .catch((err) => {
            console.error(err);
            alert(err);
            showBusyIcon(false);
            updateStatus("get/version", "failed.");
        });    
    },

    postCvMatThenCallbackImgURL : async function(mat, callback, fmt='jpg') {
        // Not completed yet !
        const url = ServerURL + "/upload_file";
        const frmData = new FormData();
        const blob = cvtMatToBlob(mat, `image/${fmt}`);
        frmData.append('file', blob, `pseudo.${fmt}`);
        postFormDataThenCallbackImgURL(url, frmData, callback);
    },

    postCanvasThenCallbackImgURL : async function(canvas, callback, fmt='jpg') {
        const url = ServerURL + "/upload_file";
        // const frmData = new FormData();
        // const blob = cvtCanvasToBlob(canvas);
        // frmData.append('file', blob, 'pseudo.png');
        // postFormDataThenCallbackImgURL(url, frmData, function(newUrl){
        //     callback(newUrl);
        // });
        canvas.toBlob(function(blob){
            const frmData = new FormData();
            frmData.append('file', blob, `pseudo.${fmt}`);
            postFormDataThenCallbackImgURL(url, frmData, callback);
        }, `image/${fmt}`);
    },

    postCanvasThenRender : async function(canvas, canvasOut, callback) {
        const imgElem = this._prepareImgElem();
        this.postCanvasThenCallbackImgURL(canvas, 
            function(newUrl) {
                // console.log("DEBUG: " + newUrl);
                imgElem.onload = function() {
                    const ctx = canvasOut.getContext('2d');
                    ctx.drawImage(imgElem, 0, 0);
                    URL.revokeObjectURL(newUrl);
                    callback();
                }
                imgElem.src = newUrl;
            }
        );
    },

    _prepareImgElem: function() {
        let imgBuf = document.getElementById('_ezImgBuf_');
        if (imgBuf==null) {
            imgBuf = document.createElement('img');
            imgBuf.id = '_ezImgBuf_';
            imgBuf.style.display = 'none';
            // DEBUG
            // imgBuf.style.display = 'block';
            document.body.appendChild(imgBuf);
        }
        return imgBuf;
    },

    _testPostViaFileInput : function(fileInputElemId) {
        const url = ServerURL + "/upload_file";
        const frmData = new FormData();        
        let fileObj = document.getElementById(fileInputElemId).files[0];
        frmData.append('file', fileObj);

        const imgElem = this._prepareImgElem();
        const canvasOut = document.getElementById("canvasDisp");

        postFormDataThenCallbackImgURL(url, frmData, 
            function(newUrl) {
                console.log("DEBUG @ _testPostViaFileInput:")
                console.log("  url = " + newUrl);
                imgElem.onload = function() {
                    const ctx = canvasOut.getContext('2d');
                    ctx.drawImage(imgElem, 0, 0);
                    URL.revokeObjectURL(newUrl);
                    _showVideoOrCanvas(canvasOut);
                    _showAnchorBoxes(false);
                    _changeState("Cloud_Result");
                }
                imgElem.src = newUrl;
            }
        );
    }
}


async function postFormDataThenCallbackImgURL(url, formData, callback) {
    //Step 1 : 準備 options 參數
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
    .then((objUrl) => {
        // imageElem.src = objUrl;
        callback(objUrl);
    })
    .catch((err) => {
        console.error(err);
        alert(err);
        showBusyIcon(false);
        updateStatus("Post", "failed.");
    });
}


const EzCvt = {
    matToBlob: function(mat, imgType = 'image/png') {
        // not completed yet !!!
        alert('matToBlob is not completed !');
        const arrU8 = new Uint8Array(mat.getData())
        return new Blob(arrU8, {type: imgType});
    },

    matToDataUrl: function(mat, imgType = 'image/png') {
        // 注意: caller 用完需要 URL.revokeObjectURL
        return URL.createObjectURL(this.matToBlob(mat, imgType));
    },

    canvasToBlob: function(canvas) {
        // SLOW !!!
        // Convert canvas image to Base64
        let img = canvas.toDataURL();
        // Convert Base64 image to binary
        let blob = this.dataUriToBlob(img);
        return blob;
    },

    dataUriToBlob: function(dataURI) {
        // SLOW !!!
        // convert base64/URLEncoded data component to raw binary data held in a string
        let byteString;
        if (dataURI.split(',')[0].indexOf('base64') >= 0)
            byteString = atob(dataURI.split(',')[1]);
        else
            byteString = unescape(dataURI.split(',')[1]);
        // separate out the mime component
        let mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
        // write the bytes of the string to a typed array
        let ia = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ia], {type:mimeString});
    }
}


// 先激活 server
EzCloud.pingServer();