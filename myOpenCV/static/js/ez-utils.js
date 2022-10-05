


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


function openFullScreen(elemId) {
    let elem = document.getElementById(elemId);
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
    }
}


function toggleFullScreen() {
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


function showBusyIcon(show) {
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
    // console.log(ht)
    if(!show) {
        if (ht.includes("w3-spin")){
            elems[0].innerHTML = ht.replace("w3-spin","ez-dummy");
        }
    } else {
        if (ht.includes("ez-dummy")){
            elems[0].innerHTML = ht.replace("ez-dummy","w3-spin");
        }
    }
    // console.log(elems[0].innerHTML);
}


function updateStatus(moduleName, msg) {
    if (!moduleName)
        moduleName = "EzImageUtils";
    _TRACE(moduleName, msg);
    document.getElementById('status-id').innerHTML = 
        moduleName + " " + msg;
}


function _TRACE(moduleName, msg) {
    if (!moduleName)
        moduleName = "EzImageUtils";
    console.log(`[${moduleName}] ${msg}`)
}


function _dump_url_to_file(newUrl, filename) {
    const link = document.createElement('a');
    link.href = newUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    URL.revokeObjectURL(newUrl);
}
