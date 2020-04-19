
var myAvailableVideos = {
    //'機器' : 'pZg17sDkHT8',
    '枋山' : '8JQG9bCZZjs',
    '台東' : 'FuYPQOzAe3A',
    '挪威' : 'ftlvreFtA2A',
    '太空-0' : 'W0LHTWG-UmQ',   // NASA default Earth 
    '太空-1' : 'AUprhMBRZ7Q',   // NASA Moon Phases 
    '太空-2' : '8HW9gYGMiwo',   // NASA Earch 2 (no sound)
    '太空-3' : 'cFC71rFejvo',   // NASA Moon
    //'太空-x' : '8u7sM8SKrz0',   // 失效
};

// youtube player members
var myPlayer;
var myNasaSpaceVideoIdx = 0;
var myNasaSpaceVideoTotal = 1;
var myVideoID = myAvailableVideos['太空'] + 'xxx';
var myPlayerDivID = 'myTitleVideoPlayer';
var myMute = true;


// local video members
var myLocalVideoDivID = '';
var myLocalVideoHtmlContext = '';

function initLocalVideo(localVideoDivID) {
    myLocalVideoDivID = localVideoDivID;
    myLocalVideoHtmlContext = document.getElementById(myLocalVideoDivID).innerHTML;
}

function showLocalVideo() {
    document.getElementById(myLocalVideoDivID).innerHTML = myLocalVideoHtmlContext;
}

function hideLocalVideo() {
    document.getElementById(myLocalVideoDivID).innerHTML = '';
}



// 2.0 This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
function initYoutubeApi(targetDivID) {
    console.log("initYoutubeApi");
    
    myPlayerDivID = targetDivID;

    myNasaSpaceVideoIdx = 0;
    myNasaSpaceVideoTotal = 0;
    for (var key in myAvailableVideos) {
        if (myAvailableVideos.hasOwnProperty(key)) {  
            if (key.startsWith('太空'))
                myNasaSpaceVideoTotal += 1;
        }
    }

    var tag = document.createElement('script');    
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}



// 2.1 當檔案讀到這個 <script src=”https://www.youtube.com/player_api"></script> 的時候，
//     就會執行onYouTubeIframeAPIReady方法
function onYouTubeIframeAPIReady() {
    console.log("youtube.onReady");
        
    myPlayer = new YT.Player(myPlayerDivID, {

        videoId: myVideoID,

        fitToBackground: true,
        height: '100%',
        width: '100%',
                                                
        playerVars: { //自訂參數
            //'playlist' : myVideoID,
            //'loop' : 1,					
            'mute': 1,              // 一開始必須要 mute() 不然無法自動撥放!
            'controls': 0,          //控制列，0:隱藏，1:顯示(默認)
            'fs': 0,                //全屏按鈕，0:隱藏，1:顯示(默認)
            'iv_load_policy': 3,    //影片註釋，1:顯示(默認)，3:不顯示
            'rel': 0,               //顯示相關視頻，0:不顯示，1:顯示(默認)
            'modestbranding': 1,    //YouTube標籤，0:顯示(默認)，1:不顯示    
            'playsinline': 1        //在iOS的播放器中全屏播放，0:全屏(默認)，1:內嵌
        },

        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError' : onPlayerError,
        }
    });

    // 一開始必須要 mute() 不然無法自動撥放!
    // mute() function 有的瀏覽器會有問題!
    //> player.mute();            
    //> setLoop 沒有用, 直接在 onPlayerStateChange 重啟撥放
    //> player.cuePlaylist( {listType : 'playlist', list : myVideoID });                    
    //> player.setLoop(true);  
    
    hideLocalVideo();
    myMute = true;
}



// 2.2 The API will call this function when the video player is ready.
function onPlayerReady(event) {
    event.target.playVideo();
    // 在此調用 unMute() 會造成瀏覽器無法自動播放!!!
    // event.target.unMute();
}



// 2.3 The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
// var done = false;
function onPlayerStateChange(event) {
    
    //> 延遲顯示 youtube player <div> 區塊, 防止閃爍.
    if (event.data == YT.PlayerState.PLAYING) {
        console.log('onPlayerStateChange (PLAYING) ' + event.data);
        
        if (!isVideoIframeVisible()) {
            showVideoIframe();
            //event.target.unMute();
        }                
    }

    //> setLoop 沒有用, 直接在 onPlayerStateChange 重啟撥放
    if (event.data == YT.PlayerState.ENDED) {
        console.log('onPlayerStateChange (END)' + event.data);
        event.target.seekTo(0);
        event.target.playVideo();
    }
}



// 2.4 Handling The API calls failure.
function onPlayerError(event) {
    event.target.stopVideo();
    hideVideoIframe();
    
    var str = "<h4> 無法連線 到 Youtube </h4>"
    console.log(str);
    //alert(str);		

    showLocalVideo();
}



function changeYoutubeVideo(viedioID) {
    var usingYoutubeVideoID = false;
    try {
        hideLocalVideo();

        if (viedioID == '太空') {
            viedioID = viedioID + '-' + myNasaSpaceVideoIdx.toString();
            if (myNasaSpaceVideoTotal > 0)
                myNasaSpaceVideoIdx = (myNasaSpaceVideoIdx + 1) % myNasaSpaceVideoTotal;
        }

        var videoName = usingYoutubeVideoID ? viedioID : myAvailableVideos[viedioID];
        myPlayer.loadVideoById(videoName);

        if(isVideoMuted())
            muteVideo();
        else
            unMuteVideo();

        if(!isVideoIframeVisible()) {
          showVideoIframe();
        }    
    }
    catch(e) {
        stopYoutubeVideo();
        showLocalVideo();
    }
}



function stopYoutubeVideo() {
  hideVideoIframe();
  myPlayer.stopVideo();
  showLocalVideo();
}



function isVideoMuted() {
    return myMute;
}

function muteVideo() {
    myMute = true;
    try {
        myPlayer.mute();
    }
    catch(e) {

    }
}

function unMuteVideo() {
    myMute = false;
    try {
        myPlayer.unMute();
    }
    catch(e) {

    }
}


function hideVideoIframe() {
    jQuery('#myVideoForeground').hide();
}

function showVideoIframe() {
    jQuery('#myVideoForeground').show();
}
    
function isVideoIframeVisible() {
    return jQuery('#myVideoForeground').is(":visible");
} 




// 沒有效
function getLocalIPAddress() {
  var obj = null;
  var rslt = "";
  try
  {
      obj = new ActiveXObject("rcbdyctl.Setting");
      rslt = obj.GetIPAddress;
      obj = null;
  }
  catch(e)
  {
      //異常發生
      return e.message;
  }
  return rslt;
}

// 沒有效
function getCpuID() {
  var cpu_id = "";
  try {
      var wmi = GetObject("winmgmts:{impersonationLevel=impersonate}");
      e = new Enumerator(wmi.InstancesOf("Win32_Processor"));
      for(; !e.atEnd(); e.moveNext()) {
          var s = e.item();
          cpu_id += s.ProcessorID;
          //return cpu_id;
      }
  }
  catch(e) {
      //return e.message;
  }
  return cpu_id;
}		

// 只有 IE 才能使用 ActiveX
function getMac() {
  try {
      var locator = new ActiveXObject ("WbemScripting.SWbemLocator");
      var service = locator.ConnectServer(".");
      var properties = service.ExecQuery("Select * from Win32_NetworkAdapterConfiguration Where IPEnabled =True");
      var e = new Enumerator (properties);
      {
          var p = e.item();
          var mac = p.MACAddress;
          return mac
      }
  }
  catch(e) {
      return e.message;
  }
}

// 非同步取得 json
function displayClientInfo(targetDivID) {

  var str = "";
  var item = "";
                  
  try
  {
      //var cpuID = getCpuID();
      //var macStr = getMac();
      //var ipStr = GetLocalIPAddress();
      //str += "<p>CPU = " + getCpuID() + "</p>";
      //str += "MAC = " + getMac() + "<br>";
      //str += "<p>IP = " + getLocalIPAddress() + "</p>";

      // 非同步取得 json
      $.getJSON("https://json.geoiplookup.io/", function (json) {
      
          //> alert(json.ip); // alerts the ip address
          //> str += "<p>ip = " + json.ip + "</p>";
          //> var keys = Object.keys(json);
          
          /*							
          for (var key of Object.keys(json)) {
              item = key + " : " + json[key];
              str += item + "<br>"
              console.log(item);
          }
          */

          var keys = ['ip','isp','hostname','country_name'];
          keys.forEach(function (key, index) {
              item = key + " : " + json[key];
              str += item + "<br>"
              console.log(item);
          });
          
          //str += "MAC = " + getMac() + "<br>";

          str = "<h4>" + str + "</h4>"

          document.getElementById(targetDivID).innerHTML = str;      
      });
  }
  catch (ex) 
  {
      str = ex.message;
      alert(str);
      return "Error";
  }            
}


