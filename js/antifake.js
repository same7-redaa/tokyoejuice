var goFcDetails = null;
var goVcDetails = null;
var goHome = null;
var goLogin = null;
var goRewardUrl = null;
var goLoginUrl = null;

// Custom dynamic code support & geolocation helpers
var visitorIp = "196.130.143.159";
var visitorCity = "Maadi";
var visitorCountry = "Egypt";

try {
  fetch("https://ipapi.co/json/")
    .then(function(r) { return r.json(); })
    .then(function(res) {
      if (res && res.ip) {
        visitorIp = res.ip;
        visitorCity = res.city || "Cairo";
        visitorCountry = res.country_name || "Egypt";
      }
    })
    .catch(function() {});
} catch(e) {}

// Supabase Database Connection
var supabaseUrl = 'https://bzgyqylrffbgascbbxqn.supabase.co';
var supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6Z3lxeWxyZmZiZ2FzY2JieHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDU3NTQsImV4cCI6MjA5NjQyMTc1NH0.SpAMb9wyKKFQkRJ7r59tOXbFOwAT1Qe88xqWSKIyQ3w';
window.supabaseClient = null;

if (typeof supabase !== 'undefined') {
  window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
}

window.dynamicUrlCodes = window.dynamicUrlCodes || {};
window.localCodesDatabase = {};

// Load codes.json
try {
  fetch("js/codes.json")
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data) {
        window.localCodesDatabase = data;
        console.log("Loaded custom codes database:", Object.keys(data).length);
      }
    })
    .catch(function() {
      console.log("No custom codes database loaded.");
    });
} catch(e) {}

function parseAndCacheUrlParams(url) {
  if (!url || url.indexOf("?") === -1) return null;
  try {
    var searchPart = url.substring(url.indexOf("?"));
    var urlParams = new URLSearchParams(searchPart);
    var c = urlParams.get("c");
    if (!c) return null;
    
    var name = urlParams.get("name") || urlParams.get("productName");
    var brand = urlParams.get("brand") || urlParams.get("companyName");
    var img = urlParams.get("img") || urlParams.get("productImage2");
    var storeName = urlParams.get("storeName");
    var storeCode = urlParams.get("storeCode");
    var country = urlParams.get("country") || urlParams.get("countryOfSale");
    var date = urlParams.get("date") || urlParams.get("productionDate");
    var pts = urlParams.get("pts") || urlParams.get("integral");

    if (!name && !brand) return null;

    var customData = {
      code: c,
      id: c,
      companyName: brand || "TOKYOEJUICE",
      productName: name || "",
      productImage2: img || "",
      storeName: storeName || null,
      storeCode: storeCode || null,
      countryOfSale: country || "Egypt",
      productionDate: date || new Date().toISOString().split('T')[0],
      checkCodeValue: 18,
      integral: pts ? parseInt(pts, 10) : 50,
      win: null
    };
    
    window.dynamicUrlCodes[c] = customData;
    try {
      sessionStorage.setItem("custom_code_" + c, JSON.stringify(customData));
    } catch(err) {}
    console.log("Cached custom code:", c, customData);
    return c;
  } catch(e) {
    console.error("Error parsing URL parameters:", e);
    return null;
  }
}
layui.use(["table", "form", "upload", "layer"], function () {
  var table = layui.table;
  var form = layui.form;
  var layer = layui.layer;
  var $ = layui.$;
  var upload = layui.upload;
  var util = layui.util;

  var isSubformUploading = false;

  /**初始化  start*/

  $(window).on("load", function () {
    console.log("所有资源加载完成");

    // 页面加载完成后执行方法

    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    var forms = document.getElementsByClassName("needs-validation");

    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    var forms = document.getElementsByClassName("needs-validation");
    // Loop over them and prevent submission
    var validation = Array.prototype.filter.call(forms, function (form) {
      form.addEventListener(
        "submit",
        function (event) {
          if (form.checkValidity() === false) {
            generateCaptcha();
            event.preventDefault();
            event.stopPropagation();
          } else {
            event.preventDefault();
            if (!checkCode()) {
              showError("incorrect verification code!");
              return;
            }
            // 图片改为选填，不再校验必传
            setImages();
            let postData = $("#myForm").serialize();
            setSubformUploading();
            $.ajax({
              type: "POST",
              url: $("#myForm").attr("action"), // 假设表单有 action 属性
              data: postData, // 自动序列化表单元素为字符串
              success: function (response) {
                let data = JSON.parse(response);
                if (!data.isOk) {
                  setSubformUploaded();
                  showError(data.msg);
                  return;
                }
                $("#popContent").addClass("layui-hide");
                $("#popContent_more").addClass("layui-hide");
                $("#pageMain").addClass("layui-hide");
                $("#popContent_ok").removeClass("layui-hide");
                showSuccess("Your message has been sent!");
                setSubformUploaded();
                resetForm();
                scrollToTop();
                generateCaptcha();
              },
              error: function (xhr, status, error) {
                // 失败回调函数
                console.error("Submission failed: " + error);
                showError("Error: " + error);
                generateCaptcha();
              },
            });
          }
          form.classList.add("was-validated");
        },
        false
      );
    });

    ///执行方法

    onLoadAntiCode();
    initUpload("img_upload1");
    initUpload("img_upload2");
    initUpload("img_upload3");
    initUpload("img_upload4");
    generateCaptcha();
  });

  /**初始化  end*/

  /**事件  start*/
  util.on("lay-on", {
    search: function () {
      if (isLoading) {
        return;
      }
      searchCode();
    },
    scan: function () {
      if (isLoading) {
        return;
      }
      if (!hasGetLocation) {
        getLocation();
      }
      scanQR();
    },
    showReward: function () {
      showReward();
    },
  });

  function scanQR() {
    if (isLoading) {
      return;
    }
    if (!isMobile()) {
      layer.msg("This device does not support code scanning!");
      return;
    }
    const config = { fps: 10, qrbox: { width: 300, height: 300 } };
    const html5Qrcode = new Html5Qrcode("scanner");
    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
      /* handle success */
      console.log(decodedText);
      if (isValidUrl(decodedText)) {
        var cachedCode = parseAndCacheUrlParams(decodedText);
        if (cachedCode) {
          document.getElementById("txt_code").value = cachedCode;
        } else {
          document.getElementById("txt_code").value = getUrlParam(
            decodedText,
            "c"
          );
        }
      } else {
        document.getElementById("txt_code").value = decodedText;
      }
      html5Qrcode.stop();
      searchCode();
    };
    const qrCodeErrorCallback = (error) => {
      //error，无需处理
    };
    html5Qrcode
      .start(
        { facingMode: "environment" },
        config,
        qrCodeSuccessCallback,
        qrCodeErrorCallback
      )
      .catch((err) => {
        console.error(error);
        layer.msg("扫描失败：" + error);
        html5Qrcode.stop();
      });
  }

  /**事件  end*/

  /**辅助方法  start*/
  function setSubformUploading() {
    $("#subFormBtn").addClass("layui-btn-disabled");
    //真正禁用按钮的语句
    $("#subFormBtn").attr("disabled", true);
    isSubformUploading = true;
  }
  function setSubformUploaded() {
    //去除禁用样式
    $("#subFormBtn").removeClass("layui-btn-disabled");
    //解除禁用的语句
    $("#subFormBtn").attr("disabled", false);
    isSubformUploading = false;
  }

  Array.prototype.remove = function (val) {
    var index = this.indexOf(val);
    if (index > -1) {
      this.splice(index, 1);
    }
  };

  function getUrlParam(url, paramName) {
    const searchParams = new URLSearchParams(new URL(url).search);
    return searchParams.get(paramName);
  }

  function isMobile() {
    // 判断是否为移动设备
    return (
      typeof window.orientation !== "undefined" || // 判断是否存在 window.orientation 属性，此属性在移动设备上一般存在
      navigator.userAgent.indexOf("IEMobile") !== -1 || // 判断是否为 Windows Phone
      navigator.userAgent.indexOf("iPhone") !== -1 || // 判断是否为 iPhone
      (navigator.userAgent.indexOf("Android") !== -1 &&
        navigator.userAgent.indexOf("Mobile") !== -1) || // 判断是否为 Android 手机
      navigator.userAgent.indexOf("BlackBerry") !== -1 || // 判断是否为 BlackBerry
      navigator.userAgent.indexOf("Opera Mini") !== -1 // 判断是否为 Opera Mini 浏览器
    );
  }

  function resetForm() {
    var form = document.getElementById("myForm");
    var elements = form.elements;
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      if (element.type !== "submit") {
        element.value = "";
      }
    }
    var forms = document.getElementsByClassName("needs-validation");
    var validation = Array.prototype.filter.call(forms, function (form) {
      form.classList.remove("was-validated");
    });
  }

  function showSuccess(msg) {
    layui.use(function () {
      var $ = layui.$;
      var layer = layui.layer;
      layer.msg(msg, { icon: 1 });
    });
  }
  function showError(msg) {
    layui.use(function () {
      var $ = layui.$;
      var layer = layui.layer;
      layer.msg(msg, { icon: 2 });
    });
  }

  function getFormRightValue(code, codeVal) {
    const codeLength = code.length;
    const index = codeLength - codeVal;
    return code[index];
  }
  function highlightTheCode(code, codeVal) {
    const codeLength = code.length;
    const index = codeLength - codeVal;
    //123456789987654321
    return (
      code.substr(0, index) +
      "<span style='background-color:#FFB6C1'>" +
      code[index] +
      "</span>" +
      code.substr(index + 1)
    );
  }

  function formatDate(date) {
    let year = date.getFullYear();
    let month = (date.getMonth() + 1).toString().padStart(2, "0");
    let day = date.getDate().toString().padStart(2, "0");
    let hours = date.getHours().toString().padStart(2, "0");
    let minutes = date.getMinutes().toString().padStart(2, "0");
    let seconds = date.getSeconds().toString().padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  function loadPage() {
    // 延迟时间设置为 5000 毫秒（5 秒）
    setTimeout(function () {
      location.reload();
    }, 3000);
  }

  function isValidUrl(url) {
    const regex = /^https?:\/\/(?:www\.)?[^\s/$.?#].[^\s]*/;
    return regex.test(url);
  }
  function getImageUrl(image) {
    if (image == null || image == "" || image.length == 0) {
      return "image.png";
    }
    if (image.indexOf("http://") === 0 || image.indexOf("https://") === 0 || image.indexOf("data:") === 0) {
      return image;
    }
    return "https://wp.asy315.vip/one/v1" + image;
  }

  function randomString(length) {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = length; i > 0; --i) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  function getOpenQueryConfig() {
    const serverObj = getServerObj();
    return {
      url: serverObj.query_open_url || "https://wp.asy315.vip/one/v1/w/query/open",
      index: serverObj.api_index || "E7GJK2869Jvg3G",
    };
  }

  function md5Fallback(input) {
    function rotateLeft(value, bits) {
      return (value << bits) | (value >>> (32 - bits));
    }

    function addUnsigned(left, right) {
      return (left + right) >>> 0;
    }

    function toUtf8Bytes(value) {
      const bytes = [];
      const text = String(value);
      for (let i = 0; i < text.length; i++) {
        let code = text.charCodeAt(i);
        if (code < 0x80) {
          bytes.push(code);
        } else if (code < 0x800) {
          bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        } else if (code >= 0xd800 && code <= 0xdbff) {
          const next = text.charCodeAt(++i);
          code = 0x10000 + ((code & 0x3ff) << 10) + (next & 0x3ff);
          bytes.push(
            0xf0 | (code >> 18),
            0x80 | ((code >> 12) & 0x3f),
            0x80 | ((code >> 6) & 0x3f),
            0x80 | (code & 0x3f)
          );
        } else {
          bytes.push(
            0xe0 | (code >> 12),
            0x80 | ((code >> 6) & 0x3f),
            0x80 | (code & 0x3f)
          );
        }
      }
      return bytes;
    }

    function toHex(word) {
      let result = "";
      for (let i = 0; i < 4; i++) {
        result += ("0" + ((word >>> (i * 8)) & 0xff).toString(16)).slice(-2);
      }
      return result;
    }

    const bytes = toUtf8Bytes(input);
    const bitLength = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) {
      bytes.push(0);
    }
    for (let i = 0; i < 8; i++) {
      bytes.push(Math.floor(bitLength / Math.pow(2, 8 * i)) & 0xff);
    }

    const words = [];
    for (let i = 0; i < bytes.length; i += 4) {
      words.push(
        bytes[i] |
          (bytes[i + 1] << 8) |
          (bytes[i + 2] << 16) |
          (bytes[i + 3] << 24)
      );
    }

    const shifts = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
      4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
      6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
    ];
    const constants = [];
    for (let i = 0; i < 64; i++) {
      constants[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
    }

    let a = 0x67452301;
    let b = 0xefcdab89;
    let c = 0x98badcfe;
    let d = 0x10325476;

    for (let i = 0; i < words.length; i += 16) {
      const aa = a;
      const bb = b;
      const cc = c;
      const dd = d;

      for (let j = 0; j < 64; j++) {
        let f;
        let g;
        if (j < 16) {
          f = (b & c) | (~b & d);
          g = j;
        } else if (j < 32) {
          f = (d & b) | (~d & c);
          g = (5 * j + 1) % 16;
        } else if (j < 48) {
          f = b ^ c ^ d;
          g = (3 * j + 5) % 16;
        } else {
          f = c ^ (b | ~d);
          g = (7 * j) % 16;
        }

        const previousD = d;
        d = c;
        c = b;
        b = addUnsigned(
          b,
          rotateLeft(
            addUnsigned(addUnsigned(a, f), addUnsigned(constants[j], words[i + g])),
            shifts[j]
          )
        );
        a = previousD;
      }

      a = addUnsigned(a, aa);
      b = addUnsigned(b, bb);
      c = addUnsigned(c, cc);
      d = addUnsigned(d, dd);
    }

    return (toHex(a) + toHex(b) + toHex(c) + toHex(d)).toLowerCase();
  }

  function createOpenQuerySign(code, noncestr, index, timestamp) {
    const signText =
      "data" + code + "noncestr" + noncestr + "index" + index + "timestamp" + timestamp;
    if (typeof md5 === "function") {
      return md5(signText);
    }
    if (typeof window.md5 === "function") {
      return window.md5(signText);
    }
    if (typeof window.hex_md5 === "function") {
      return window.hex_md5(signText);
    }
    if (window.md5Libs && typeof window.md5Libs.md5 === "function") {
      return window.md5Libs.md5(signText);
    }
    return md5Fallback(signText);
  }

  var isLoading = false;
  function setLoading() {
    isLoading = true;
    $("#btn_search").addClass("layui-btn-disabled");
    //真正禁用按钮的语句
    $("#btn_search").attr("disabled", true);
  }
  function setLoadingOk() {
    //去除禁用样式
    $("#btn_search").removeClass("layui-btn-disabled");
    //解除禁用的语句
    $("#btn_search").attr("disabled", false);
    isLoading = false;
  }



  function handleCodeInterception(code, customData) {
    // Manage search counts to trigger warnings after 3 searches
    var key = "check_count_" + code;
    var checkCount = parseInt(localStorage.getItem(key) || "0", 10);
    checkCount++;
    localStorage.setItem(key, checkCount);

    // Deep copy to prevent mutating the database template
    var matchedData = JSON.parse(JSON.stringify(customData));
    matchedData.queryTimes = checkCount;
    matchedData.isDisable = (checkCount > 3) ? 1 : 0;

    var now = Date.now();
    var currentIp = visitorIp || "196.130.143.159";
    var currentCity = visitorCity || "Maadi";
    var currentCountry = visitorCountry || "Egypt";
    var currentAddr = currentCountry + "-" + currentCity;
    var records = [];

    if (checkCount === 1) {
      records.push({
        address: currentAddr,
        city: currentCountry + " " + currentCity,
        codeString: code,
        createTime: now,
        date: now,
        deviceInfo: null,
        id: 1000000 + Math.floor(Math.random() * 900000),
        ip: currentIp,
        queryTimes: 1,
        remark: null,
        updateTime: now
      });
      matchedData.firstTime = now;
    } else if (checkCount === 2) {
      var firstTime = now - 5 * 60 * 1000;
      records.push({
        address: currentAddr,
        city: currentCountry + " " + currentCity,
        codeString: code,
        createTime: firstTime,
        date: firstTime,
        deviceInfo: null,
        id: 1000000 + Math.floor(Math.random() * 900000),
        ip: currentIp,
        queryTimes: 2,
        remark: null,
        updateTime: firstTime
      });
      records.push({
        address: currentAddr,
        city: currentCountry + " " + currentCity,
        codeString: code,
        createTime: now,
        date: now,
        deviceInfo: null,
        id: 1000000 + Math.floor(Math.random() * 900000),
        ip: currentIp,
        queryTimes: 2,
        remark: null,
        updateTime: now
      });
      matchedData.firstTime = firstTime;
    } else {
      var t1 = now - 15 * 60 * 1000;
      var t2 = now - 5 * 60 * 1000;
      records.push({
        address: currentAddr,
        city: currentCountry + " " + currentCity,
        codeString: code,
        createTime: t1,
        date: t1,
        deviceInfo: null,
        id: 1000000 + Math.floor(Math.random() * 900000),
        ip: currentIp,
        queryTimes: 3,
        remark: null,
        updateTime: t1
      });
      records.push({
        address: currentAddr,
        city: currentCountry + " " + currentCity,
        codeString: code,
        createTime: t2,
        date: t2,
        deviceInfo: null,
        id: 1000000 + Math.floor(Math.random() * 900000),
        ip: currentIp,
        queryTimes: 3,
        remark: null,
        updateTime: t2
      });
      records.push({
        address: currentAddr,
        city: currentCountry + " " + currentCity,
        codeString: code,
        createTime: now,
        date: now,
        deviceInfo: null,
        id: 1000000 + Math.floor(Math.random() * 900000),
        ip: currentIp,
        queryTimes: 3,
        remark: null,
        updateTime: now
      });
      matchedData.firstTime = t1;
    }

    matchedData.queryRecord = records;

    setTimeout(function () {
      setLoadingOk();
      setDataFrontendV2(matchedData);
    }, 500);
  }

  function searchCode() {
    $("#popContent").addClass("layui-hide");
    $("#popContent_more").addClass("layui-hide");
    $("#popContent_ok").addClass("layui-hide");
    if (isLoading) {
      return;
    }
    setLoading();
    let code = ($("#txt_code").val() || "").trim();
    if (!hasGetLocation) {
      getLocation();
      setLoadingOk();
      return;
    }

    // 1. Check if code has intercepted static/dynamic details
    var customData = null;
    if (window.dynamicUrlCodes && window.dynamicUrlCodes[code]) {
      customData = window.dynamicUrlCodes[code];
    }
    if (!customData) {
      try {
        var stored = sessionStorage.getItem("custom_code_" + code);
        if (stored) {
          customData = JSON.parse(stored);
        }
      } catch(e) {}
    }

    if (customData) {
      handleCodeInterception(code, customData);
      return;
    }

    // 2. Check Supabase Database
    if (window.supabaseClient) {
      window.supabaseClient
        .from('codes')
        .select('*')
        .eq('code', code)
        .then(function(response) {
          var dbData = response.data;
          if (dbData && dbData.length > 0) {
            var dbRecord = dbData[0];
            var customData = {
              code: dbRecord.code,
              id: dbRecord.code,
              companyName: dbRecord.company_name || "TOKYOEJUICE",
              productName: dbRecord.product_name || "",
              productImage2: dbRecord.product_image || "",
              storeName: dbRecord.store_name || null,
              storeCode: dbRecord.store_code || null,
              countryOfSale: dbRecord.country || "Egypt",
              productionDate: dbRecord.production_date || "",
              checkCodeValue: dbRecord.check_code_value || 18,
              integral: dbRecord.points || 50,
              win: dbRecord.win || null
            };
            handleCodeInterception(code, customData);
          } else {
            fallbackToStaticOrWp(code);
          }
        })
        .catch(function(err) {
          console.error("Supabase query error:", err);
          fallbackToStaticOrWp(code);
        });
      return;
    }

    fallbackToStaticOrWp(code);
  }

  function fallbackToStaticOrWp(code) {
    // 3. Check static codes.json
    if (window.localCodesDatabase && window.localCodesDatabase[code]) {
      handleCodeInterception(code, window.localCodesDatabase[code]);
      return;
    }

    // 4. Default WooCommerce API Check
    if (isValidUrl(code)) {
      layer.msg(
        "The current input content is a link, please enter anti-fraud code, please try again"
      );
      setLoadingOk();
      return;
    }
    if (code.length < 10) {
      layer.msg("invalid anti-fraud code, please try again");
      setLoadingOk();
      return;
    }

    const openQueryConfig = getOpenQueryConfig();
    const url = openQueryConfig.url;
    const noncestr = randomString(8);
    const index = openQueryConfig.index;
    const timestamp = new Date().getTime();
    const sign = createOpenQuerySign(code, noncestr, index, timestamp);
    if (!sign) {
      layer.msg("MD5 library failed to load, please try again later.");
      setLoadingOk();
      return;
    }
    $.ajax({
      url: url,
      // type: "POST",
      type: "GET",
      data: {
        data: code,
        sign: sign,
      },
      headers: {
        ip: "",
        longitude: longitude,
        latitude: latitude,
        noncestr: noncestr,
        index: index,
        timestamp: timestamp,
      },
      dataType: "json",
      success: function (data) {
        setLoadingOk();
        if (data.status == 200) {
          setDataFrontendV2(data.data);
        } else if (data.status == -1) {
          layer.msg("The request parameters are invalid.!");
        } else if (data.status == 10227) {
          layer.msg("anti-fraud code not found.!");
        } else {
          layer.msg("Request failed.!");
        }
      },
      error: function (data) {
        layer.msg("request error!");
        console.log("error" + data);
        setLoadingOk();
      },
    });
  }

  function onLoadAntiCode() {
    let currentUrl = window.location.href;
    parseAndCacheUrlParams(currentUrl);
    let code = getUrlParam(currentUrl, "c");
    document.getElementById("txt_code").value = code;
    if (code == "" || code == null || code.trim().length == 0) {
      return;
    }
    if (!hasGetLocation) {
      getLocation();
    }
    searchCode();
  }

  //判断是否是伪防伪码
  function isTheCodeFaked(queryTimes, isDisable) {
    return queryTimes == null || isDisable;
  }

  var currentData = null;
  const openReward = true; //开启中奖
  //加入显示前置，直接提示给用户，再让用户直接选择是否查看
  function setDataFrontend(data) {
    currentData = data;

    //setfrakeDataHasWin();

    let queryTimes = data.queryTimes;
    let isDisable = data.isDisable;

    //是假的码
    if (isTheCodeFaked(queryTimes, isDisable)) {
      //表示查询超过3次
      showFakeCertificate();
    } else {
      if (isHaveThePiont(data) && isHasTheReward(data) && openReward) {
        //用户中奖了
        showReward(data.win);
      } else {
        showValidCertificateDispatch();
      }
    }
  }

  function setDataFrontendV2(data) {
    currentData = data;
    let winPoint = 0;
    if (data.win && data.win.amount) {
      winPoint = data.win.amount;
    }
    let queryTimes = data.queryTimes;
    let isDisable = data.isDisable;
    if (isTheCodeFaked(queryTimes, isDisable)) {
      //表示查询超过3次
      showFakeCertificate();
    } else {
      //应用积分及奖励给用户，如果未登录则返回此码是否应用了查询奖励及领取的奖品
      applyPointsAndRewardToUser(
        currentData.code,
        currentData.code,
        winPoint,
        currentData.ipZone,
        currentData.resellerName,
        currentData.win,
        function (responseData) {
          if (responseData.isOk) {
            if (responseData.isLogin) {
              //已登录处理逻辑
              if (responseData.applyRewardPoints) {
                //中奖了，表示也应用了查询奖励及领取的奖品
                showRewardV2(currentData.win, responseData.isLogin);
                return;
              }
              if (
                responseData.applySearchPoints &&
                !responseData.applyRewardPoints
              ) {
                //只应用了查询奖励
                showValidCertificateDispatchV2(responseData.isLogin,responseData.hasSearchPoints);
                return;
              }

              showValidCertificate("");
            } else {
              //未登录处理逻辑

              let hasUsedSearchPoints = responseData.hasSearchPoints;
              let hasUsedRewardPoints = responseData.hasRewardPoints;
              if(hasUsedRewardPoints&&hasUsedSearchPoints){
                 showValidCertificate("");
                 return;
              }
               
              if (currentData.win == null) {
                //未登录，表示未应用查询奖励及领取的奖品
                showValidCertificateDispatchV2(responseData.isLogin,hasUsedSearchPoints);
                if (!hasUsedSearchPoints) {
                  saveGetPointsV2(winPoint);
                }
              } else {
                if (hasUsedRewardPoints) {
                   showValidCertificate("");
                 return;
                }

                showRewardV2(currentData.win, responseData.isLogin);
                  saveGetPointsV2(winPoint);
              }
            
            }
          } else {
            //出现错误
          }
        }
      );
    }
  }

  function setfrakeDataHasWin() {
    currentData.queryTimes = 1;
    currentData.isDisable = false;
    currentData.code = $("#txt_code").val();
    currentData.win = {
      name: "三等奖",
      amount: 1,
    };
  }

  function setfrakeDataHasRewardWin() {
    currentData.queryTimes = 1;
    currentData.isDisable = false;
    currentData.win = {
      name: "一等奖",
      amount: 5,
    };
  }

  //是否中奖
  function isHasTheReward(data) {
    if (data.win != null && data.win.amount > 0) {
      return true;
    }
    return false;
  }
  //当前查询是否由积分
  function isHaveThePiont(data) {
    if (data.win != null && data.win.amount > 0) {
      return true;
    }
    return false;
  }

  function setData(data) {
    let queryTimes = data.queryTimes;
    let isDisable = data.isDisable;
    // queryTimes = 3;

    const setAddress = function (setId, dataChild) {
      if (dataChild == null) return;
      let ip = dataChild.ip != null ? dataChild.ip : "NONE";
      let address = dataChild.address != null ? dataChild.address : "NONE";
      let addStr = ip + "/" + address;
      let dateCvt = new Date(dataChild.date);
      let timeStr = formatDate(dateCvt);
      $("#" + setId + "_address").text(addStr);
      $("#" + setId + "_time").text(timeStr);
    };

    if (isTheCodeFaked(queryTimes, isDisable)) {
      //表示查询超过 3 次
      $("#popContent").addClass("layui-hide");
      $("#popContent_more").removeClass("layui-hide");
      $("#pageMain").addClass("layui-hide");
      if (getScreenWidth() > 640) {
        $("#e_w_img").attr(
          "src",
          "https://antifake-service.tokyoejuice.com//static/images/fake.jpg"
        );
      } else {
        $("#e_w_img").attr(
          "src",
          "https://antifake-service.tokyoejuice.com//static/images/fake02.jpg"
        );
      }

      let code = $("#txt_code").val();
      $("#step3_txt_code").val(code);

      for (var i = 0; i < data.queryRecord.length; i++) {
        let retItem = data.queryRecord[i];
        $("#step3_code").text(retItem.codeString);
        $("#qr_detail_" + i + "_address").text(
          "IP-" + retItem.ip + "/" + retItem.address + ","
        );
        let timestamp_tmp = retItem.date * 1;
        let dateCvtTmp = new Date(timestamp_tmp);
        let query_time_tme = formatDate(dateCvtTmp);
        $("#qr_detail_" + i + "_time").text(query_time_tme);
      }
      $("#qr_page_title").text(data.queryRecord.length);
    } else {
      $("#popContent").removeClass("layui-hide");
      $("#popContent_more").addClass("layui-hide");

      let firstTimeStamp = data.firstTime * 1;
      let dateCvt = new Date(firstTimeStamp);
      let query_time = formatDate(dateCvt);
      let acode = highlightTheCode(data.code + "", data.checkCodeValue + "");
      let storeName = data.storeName ?? "";
      let storeCode = data.storeCode ?? "";
      console.log("render hit", data);

      let brand = data.companyName;
      let flavor = data.productName;
      let checkCode = data.checkCodeValue;
      if (data.extra != null) {
        $("#qr_detail_info_child").empty();
        for (let i = 0; i < data.extra.length; i++) {
          let item = data.extra[i];

          $("#qr_detail_info_child").append(
            ' <div class="info-item2"><span class="title">' +
              item.key +
              ':</span><span class="content">' +
              item.value +
              "</span></div>"
          );
        }
      }

      let imageUrl = getImageUrl(data.productImage2);
      let countryOfSale = data.countryOfSale ?? data.salesCountry ?? "";
      let productionDate = data.productionDate ?? data.productDate ?? "";

      $("#l_img").attr("src", imageUrl);

      if (storeName) {
        $("#l_store_name").text(storeName);
        $("#store_name_row").removeClass("layui-hide");
      } else {
        $("#store_name_row").addClass("layui-hide");
      }

      if (storeName || storeCode) {
        $("#store_info_divider_row").removeClass("layui-hide");
      } else {
        $("#store_info_divider_row").addClass("layui-hide");
      }

      if (storeCode) {
        $("#l_store_code").text(storeCode);
        $("#store_code_row").removeClass("layui-hide");
      } else {
        $("#store_code_row").addClass("layui-hide");
      }

      $("#l_brand").text(brand);
      $("#brand_row").removeClass("layui-hide");

      $("#l_flavor").text(flavor);
      $("#model_row").removeClass("layui-hide");

      $("#l_code").empty();
      $("#l_code").append(acode);
      $("#code_row").removeClass("layui-hide");

      if (countryOfSale) {
        $("#l_country_of_sale").text(countryOfSale);
        $("#country_of_sale_row").removeClass("layui-hide");
      } else {
        $("#country_of_sale_row").addClass("layui-hide");
      }

      if (productionDate) {
        $("#l_production_date").text(productionDate);
        $("#production_date_row").removeClass("layui-hide");
      } else {
        $("#production_date_row").addClass("layui-hide");
      }

      if (queryTimes == 1) {
        $("#qr_0").removeClass("layui-hide");
        $("#qr_1").addClass("layui-hide");
        $("#qr_2").addClass("layui-hide");
        $("#qr_3").addClass("layui-hide");

        setAddress("qr_0", data.queryRecord[0]);
      } else if (queryTimes == 2) {
        $("#qr_0").addClass("layui-hide");
        $("#qr_1").removeClass("layui-hide");
        $("#qr_2").removeClass("layui-hide");
        $("#qr_3").addClass("layui-hide");

        setAddress("qr_1", data.queryRecord[0]);
        setAddress("qr_2", data.queryRecord[1]);
      } else if (queryTimes == 3) {
        $("#qr_0").addClass("layui-hide");
        $("#qr_1").removeClass("layui-hide");
        $("#qr_2").removeClass("layui-hide");
        $("#qr_3").removeClass("layui-hide");

        setAddress("qr_1", data.queryRecord[0]);
        setAddress("qr_2", data.queryRecord[1]);
        setAddress("qr_3", data.queryRecord[2]);
      }
    }
  }

  function clearnData() {
    $("#l_store_name").text("");
    $("#l_store_code").text("");
    $("#l_brand").text("");
    $("#l_flavor").text("");
    $("#l_code").text("");
    $("#l_country_of_sale").text("");
    $("#l_production_date").text("");
    $("#store_name_row").addClass("layui-hide");
    $("#store_info_divider_row").addClass("layui-hide");
    $("#store_code_row").addClass("layui-hide");
    $("#brand_row").addClass("layui-hide");
    $("#model_row").addClass("layui-hide");
    $("#code_row").addClass("layui-hide");
    $("#country_of_sale_row").addClass("layui-hide");
    $("#production_date_row").addClass("layui-hide");
    $("#l_qtime").text("");
    $("#l_qinfo").text("");
    $("#l_ccode").text("");
  }

  function getScreenWidth() {
    return window.innerWidth;
  }
  let imageGroupInfo1 = Array();
  let imageGroupInfo2 = Array();
  let imageGroupInfo3 = Array();
  let imageGroupInfo4 = Array();

  function initUpload(imageId) {
    //图片上传
    let obj = upload.render({
      elem: "#" + imageId, //绑定元素
      url: "https://antifake-service.tokyoejuice.com/image/upload", //改为你的图片上传接口
      size: 1024 * 3, //设置文件大小
      text: {
        // 自定义提示文本

        "limit-size": function (obj) {
          layer.msg("The uploaded image size cannot exceed 3MB!");
        }, // 限制 size 属性的提示。若设置，需为函数写法
      },
      done: function (res) {
        //上传完毕回调
        if (res.code == 0) {
          layer.msg("upload success!");
          // 假设服务器返回的图片地址在 res.data.filePath
          addImage(imageId, res.url, res.savename);
        } else {
          layer.msg("upload error!");
        }
      },
      error: function () {
        //请求出错回调
        layer.msg("network error!");
      },
    });
  }

  function addImage(imageId, imageUrl, imageName) {
    let imageGroupInfo = null;
    if (imageId == "img_upload1") {
      imageGroupInfo = imageGroupInfo1;
      imageGroupInfo1.push(imageName);
    } else if (imageId == "img_upload2") {
      imageGroupInfo = imageGroupInfo2;
      imageGroupInfo2.push(imageName);
    } else if (imageId == "img_upload3") {
      imageGroupInfo = imageGroupInfo3;
      imageGroupInfo3.push(imageName);
    } else {
      imageGroupInfo = imageGroupInfo4;
      imageGroupInfo4.push(imageName);
    }
    let img_add = $("#" + imageId).parent(".up-item-add");
    img_add.before(
      "<div class='up-item'  >  <img onclick='showImage(this)'  src='" +
        imageUrl +
        "' data-img-id='" +
        imageId +
        "' data-id='" +
        imageName +
        "'  width='150px'/> <div class='delete-icon' onclick='deleteImg(this)'' ></div> </div>"
    );
    if (imageGroupInfo.length == 1) {
      img_add.addClass("layui-hide");
    }
  }

  function showImage(obj) {
    layer.open({
      type: 1,
      maxHeight: 800,
      maxWidth: 800,
      offset: "auto", // 偏移量设置为'auto'，自动居中
      closeBtn: 1,
      title: false,
      shadeClose: true, //开启遮罩关闭
      content:
        ' <div class="img-container"> <img style="height: 100%" src="' +
        imgUrl +
        '" /> </div>',
    });
  }

  function deleteImg(obj) {
    let imageInfo = $(obj).prev("img").attr("data-id");
    let imageId = $(obj).prev("img").attr("data-img-id");
    $.post(
      "https://antifake-service.tokyoejuice.com/image/delete",
      { path: imageInfo },
      function (result) {}
    );
    let imageGroupInfo = null;
    if (imageId == "img_upload1") {
      imageGroupInfo = imageGroupInfo1;
      imageGroupInfo1.remove(imageInfo);
    } else if (imageId == "img_upload2") {
      imageGroupInfo = imageGroupInfo2;
      imageGroupInfo2.remove(imageInfo);
    } else if (imageId == "img_upload3") {
      imageGroupInfo = imageGroupInfo3;
      imageGroupInfo3.remove(imageInfo);
    } else {
      imageGroupInfo = imageGroupInfo3;
      imageGroupInfo4.remove(imageInfo);
    }
    $(obj).parent(".up-item").remove();
    $("#" + imageId)
      .parent(".up-item-add")
      .removeClass("layui-hide");
  }

  function checkCode() {
    let vcode = $("#txt_vcode").val();
    let storage_vcode = localStorage.getItem("captcha");
    let flag = vcode.toLowerCase() == storage_vcode;
    localStorage.removeItem("captcha");
    return flag;
  }

  function generateCaptcha() {
    var canvas = document.getElementById("captchaCanvas");
    var ctx = canvas.getContext("2d");
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 设置背景色
    ctx.fillStyle = "#F5F5F5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 生成随机验证码字符串
    var captchaText = generateRandomString(4);
    var lowCaptcha = captchaText.toLowerCase();
    localStorage.setItem("captcha", lowCaptcha);
    // 设置字体和颜色
    ctx.font = "30px Arial";
    ctx.fillStyle = "#333";
    // 在画布上绘制验证码文本
    ctx.fillText(captchaText, 20, 30);
    // 添加噪音线
    for (var i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.strokeStyle = "#888";
      ctx.stroke();
    }
  }

  // 生成指定长度的随机字符串
  function generateRandomString(length) {
    var charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var result = "";
    for (var i = 0; i < length; i++) {
      var randomIndex = Math.floor(Math.random() * charset.length);
      result += charset.charAt(randomIndex);
    }
    return result;
  }

  function setImages() {
    $("#images_1").val(imageGroupInfo1.join(","));
    $("#images_2").val(imageGroupInfo2.join(","));
    $("#images_3").val(imageGroupInfo3.join(","));
    $("#images_4").val(imageGroupInfo4.join(","));
  }
  // 图片改为选填，保留函数以兼容其它调用
  function checkImages() {
    return true;
  }

  function loadArea() {
    $.getJSON(
      "https://antifake-service.tokyoejuice.com/file/guojia",
      function (data) {
        var select = $("#area");
        select.empty(); // 清空select中现有的options
        select.append(
          $("<option></option>").attr("value", "").text("Select Area Code")
        );
        $.each(data, function (key, value) {
          let txt = value.english_name + "(" + value.phone_code + ")";
          select.append(
            $("<option></option>").attr("value", value.phone_code).text(txt)
          );
        });
      }
    );
  }

  function canSeachCode() {
    if (hasGetLocation) {
      return true;
    }
    return false;
  }

  var hasGetLocation = true;
  var getLocationStatus = 0; //在 hasGetLocation 为 false 的情况下的状态
  var latitude = "";
  var longitude = "";

  function getLocation() {
    hasGetLocation = true;
    latitude = "";
    longitude = "";
    return;
    setLoading();
    layui.use(function () {
      var $ = layui.$;
      var layer = layui.layer;

      layer.confirm(
        "To ensure the integrity of the Anti</br>-counterfeiting query function, please</br>enable location permission first",
        {
          title: false,
          skin: "mac-dark-dialog", // 使用暗黑皮肤
          btnAlign: "c",
          closeBtn: 0,
          area: ["300px", "250px"],
          offset: "auto", // 距离顶部偏移 10px（默认居中时为垂直居中）

          btn: ["Reject", "Confirm"], //按钮
        },

        function () {
          layer.msg(
            "Location information request failed <br/> Anti-counterfeiting query function is limited.",
            {
              time: 3000, // 3 秒后自动关闭
              skin: "layui-layer-msg-black-skin",
              area: ["640px", "60px"],
              offset: "auto",
            }
          );
        },
        function (index) {
          layer.close(index);
          if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
              function (position) {
                latitude = position.coords.latitude;
                longitude = position.coords.longitude;

                hasGetLocation = true;
                console.log(`纬度：${latitude}, 经度：${longitude}`);
                // 在这里可以继续处理位置信息，例如进行查询服务
                setLoadingOk();
              },
              function (error) {
                switch (error.code) {
                  case error.PERMISSION_DENIED:
                    console.error("用户拒绝了位置请求。");
                    hasGetLocation = false;
                    getLocationStatus = -1;
                    break;
                  case error.POSITION_UNAVAILABLE:
                    console.error("位置信息不可用。");
                    break;
                  case error.TIMEOUT:
                    console.error("请求位置信息超时。");
                    break;
                  case error.UNKNOWN_ERROR:
                    console.error("发生未知错误。");
                    break;
                }
                layer.msg(
                  "Location information request failed <br/> Anti-counterfeiting query function is limited",
                  {
                    time: 3000, // 3 秒后自动关闭
                  }
                );
              }
            );
          } else {
            layer.msg("This browser does not support geolocation services.", {
              icon: 5,
            });
          }
        }
      );
    });
  }
  function goUrl(url) {
    window.location.href = url;
  }
  goRewardUrl = function () {
    goUrl(getServerObj().reward_url);
  };
  goLoginUrl = function () {
    goUrl(getServerObj().login_url);
  };

  // 显示有效证书
  function showValidCertificateDispatch() {
    let gotPointTxt = "";
    let login_url = getServerObj().login_url;
    let reward_url = getServerObj().reward_url;
    let earned_type = "search";
    let isHaveSearchPoints = true; //是否有查询积分
    let searchPoint = 50; //查询积分
    if (!openReward) {
      showValidCertificate("");
    } else if (userIsLogin()) {
      gotPointTxt = ` `;

      if (isHaveSearchPoints) {
        setAddUserPoints(
          currentData.code,
          currentData.code,
          searchPoint,
          earned_type,
          currentData.ipZone,
          currentData.resellerName,
          null,
          function (data) {
            if (data.isOk) {
              gotPointTxt =
                ` 
                                <div class="btn-vaild-points ">
                                <span class="icon-reward"></span>
                  ‌&nbsp; ` +
                searchPoint +
                `   Pts Got! ‌&nbsp; <a href="` +
                reward_url +
                `"> Reward</a>
                  </div>
                        `;

              gotPointTxt = `<button class="btn-vaild-points2 f-full-width-btn" onclick="goRewardUrl();"> <span class="icon-reward"></span>  ‌&nbsp; 1 Point got! ‌&nbsp;  <span class="underline">Reward Page</span> </button>`;

              showValidCertificate(gotPointTxt);
            } else {
              //积分添加失败
              gotPointTxt = "";
              showValidCertificate(gotPointTxt);
            }
          }
        );
      } else {
        gotPointTxt = "";
        showValidCertificate(gotPointTxt);
      }
    } else {
      gotPointTxt =
        `<div class="btn-vaild-points ">
                                    <span class="icon-reward"></span>
                                    <a href="` +
        login_url +
        `"> Sign in </a>&nbsp; to Get  Points
                      </div>
                            `;

      gotPointTxt = `<button class="btn-vaild-points2 f-full-width-btn" onclick="goLogin();"> <span class="icon-reward"></span> <span class="underline">Sign In</span> &nbsp;  Get Reward Points!</button>`;

      check_antifake_code_is_exist(currentData.code, function (data) {
        gotPointTxt = ""; // Force hide "Sign In" button
        saveGetPoints("search", searchPoint);
        showValidCertificate(gotPointTxt);
      });
    }
  }

  // 显示有效证书
  function showValidCertificateDispatchV2(isLogin, isSearchPointsUsed = true) {
    let gotPointTxt = "";
    let login_url = getServerObj().login_url;
    let reward_url = getServerObj().reward_url;

    let isHaveSearchPoints = true; //是否有查询积分
    let searchPoint = currentData.integral; //查询积分，从 tian 上取
    if (!openReward) {
      showValidCertificate("");
    } else if (isLogin) {
      //登录了
      gotPointTxt = ` `;
      if (isHaveSearchPoints && !isSearchPointsUsed&&searchPoint > 0) {
        //应用了查询积分

        gotPointTxt =
          `<button class="btn-vaild-points2 f-full-width-btn" onclick="goRewardUrl();"> <span class="icon-reward"></span>  ‌&nbsp; ` +
          searchPoint +
          ` Pts Got! ‌&nbsp;  <span class="underline">Reward</span> </button>`;

        showValidCertificate(gotPointTxt);
      } else {
        //未应用查询积分
        gotPointTxt = "";
        showValidCertificate(gotPointTxt);
      }
    } else {
      //未登录

      if (isHaveSearchPoints && !isSearchPointsUsed&&searchPoint > 0) {
        //有查询积分，未应用
        gotPointTxt = ""; // Force hide "Sign In" button
        showValidCertificate(gotPointTxt);
      } else {
        //查询积分已应用或者无查询积分
        gotPointTxt = "";
        showValidCertificate(gotPointTxt);
      }
    }
  }

  function saveGetPoints(earned_type = "search", points = 0) {
    let pointData = null;
    if (earned_type == "search") {
      // 未登录保存数据
      pointData = {
        antifake_code: currentData.code,
        antifake_code_val: currentData.code,
        points: points,
        ipZone: currentData.ipZone ?? "",
        resellerName: currentData.resellerName ?? "",
        ext_info: "",
        timestamp: Math.floor(Date.now() / 1000),
        earned_type: earned_type,
      };
    } else if (earned_type == "reward") {
      let win_points = points;
      if (currentData.win != null) {
        win_points = currentData.win.amount;
      }

      // 未登录保存数据
      pointData = {
        antifake_code: currentData.code,
        antifake_code_val: currentData.code,
        points: win_points,
        ipZone: currentData.ipZone ?? "",
        resellerName: currentData.resellerName ?? "",
        ext_info: JSON.stringify(currentData.win ?? ""),
        timestamp: Math.floor(Date.now() / 1000),
        earned_type: earned_type,
      };
    }

    localStorage.setItem("pending_points", JSON.stringify(pointData));
  }

  function saveGetPointsV2(win_points) {
   
    let searchPointsVal=currentData.integral; //额外处理
    let pointData = {
      antifake_code: currentData.code,
      antifake_code_val: currentData.code,
      points: win_points,
      ipZone: currentData.ipZone ?? "",
      resellerName: currentData.resellerName ?? "",
      search_points: searchPointsVal,
      ext_info: JSON.stringify(currentData.win ?? ""),
      timestamp: Math.floor(Date.now() / 1000),
      version: "2.0",
    };
    localStorage.setItem("pending_points", JSON.stringify(pointData));
  }

  function showValidCertificate(appendHtml = "") {
    let area = ["350px", "600px"];
    if (appendHtml == "") {
      area = ["350px", "550px"];
    }
    layer.open({
      type: 1,
      title: false,
      closeBtn: 0,
      area: area,
      offset: "auto",
      zIndex: 10000, // 关键配置：设置足够大的层级值
      content:
        `
                       <div class="f-custom-layer">
                         <div class="f-image-container f-top-image">
                           <img src="https://img.myshopline.com/image/store/1713770442657/686001673a1f41b29b05f6af7fd2b4d0.svg" class="f-auto-image">
                         </div>
                         <div class="fimage-container f-middle-image">
                           <img src="https://img.myshopline.com/image/store/1713770442657/cde4a5f43e424a9394e47bdd414c6d3b.svg" class="f-auto-image">
                         </div>
                         <div class="button-container">
                            <button class="layui-btn f-full-width-btn f-btn-primary-1" onclick='goVcDetails()'>View Details</button>
                            <button class="layui-btn f-full-width-btn f-btn-secondary-2"  onclick='goHome()'>Home Page</button>
                            
 ` +
        appendHtml +
        `


                         </div>
                       </div>
                     `,
    });
  }

  function setAddUserPoints(
    code,
    code_val,
    amount,
    earnedType,
    ipZone,
    resellerName,
    winObj,
    doneCallback
  ) {
    let antifake_code = code;
    let antifake_code_val = code_val;
    let antifake_amount = amount;
    let ext_info = JSON.stringify(winObj);
    let earned_type = earnedType;
    let search_points=currentData.integral; //查询奖励积分，从 tian 上取

    $.ajax({
      type: "POST",
      url: getServerObj().ajax_url,
      data: {
        action: "add_points_to_user_frontend",
        security: getServerObj().nonce,
        antifake_code: antifake_code,
        earned_type: earned_type,
        antifake_code_val: antifake_code_val,
        points: antifake_amount,
        ipZone: ipZone ?? "",
        ext_info: ext_info ?? "",
           search_points: search_points,
        resellerName: resellerName ?? "",
      },
      success: function (response) {
        doneCallback(response.data);
      },
      error: function(xhr, status, error) {
        console.warn("WooCommerce points addition failed, applying fallback:", error);
        doneCallback({ isOk: true });
      }
    });
  }

  function applyPointsAndRewardToUser(
    code,
    code_val,
    amount,

    ipZone,
    resellerName,
    winObj,
    doneCallback
  ) {
    let antifake_code = code;
    let antifake_code_val = code_val;
    let antifake_amount = amount;//中奖积分
    let ext_info = JSON.stringify(winObj);
    let search_points=currentData.integral; //查询奖励积分，从 tian 上取

    $.ajax({
      type: "POST",
      url: getServerObj().ajax_url,
      data: {
        action: "apply_points_and_rewards",
        security: getServerObj().nonce,
        antifake_code: antifake_code,
        search_points: search_points,
        antifake_code_val: antifake_code_val,
        points: antifake_amount,
        ipZone: ipZone ?? "",
        ext_info: ext_info ?? "",
        resellerName: resellerName ?? "",
      },
      success: function (response) {
        doneCallback(response.data);
      },
      error: function(xhr, status, error) {
        console.warn("WooCommerce points query failed due to CORS or local environment, applying fallback data:", error);
        doneCallback({
          isOk: true,
          isLogin: false,
          hasSearchPoints: false,
          hasRewardPoints: false
        });
      }
    });
  }

  function check_antifake_code_is_exist(code, callback) {
    $.ajax({
      type: "POST",
      url: getServerObj().ajax_url,
      data: {
        action: "check_antifake_code",
        security: getServerObj().nonce,
        code: code,
      },
      success: function (response) {
        callback(response.data);
      },
      error: function (xhr) {
        console.error("Error:", xhr.responseText); // 查看详细错误
      },
    });
  }

  goHome = function goHome() {
    window.location.href = getServerObj().home_url;
  };
  goLogin = function () {
    window.location.href = getServerObj().login_url;
    console.log("goLogin" + getServerObj().login_url);
  };
  goFcDetails = function () {
    var layer = layui.layer;
    layer.closeAll(); //疯狂模式，关闭所有层
    let data = currentData;
    setData(data);
  };
  goVcDetails = function () {
    var layer = layui.layer;
    layer.closeAll(); //疯狂模式，关闭所有
    let data = currentData;
    setData(data);
  };
  goClose = function () {
    var layer = layui.layer;
    layer.closeAll(); //疯狂模式，关闭所有层
    goVcDetails();
  };

  function showFakeCertificate() {
    layer.open({
      type: 1,
      title: false,
      closeBtn: 0,
      area: ["350px", "550px"],
      offset: "auto",
      content: `
                   
                        <div class="f-custom-layer">
                          <div class="f-image-container f-top-image">
                            <img src="https://img.myshopline.com/image/store/1713770442657/e74a6e774c2a431692605d319c0544ee.svg" class="f-auto-image">
                          </div>
                          <div class="fimage-container f-middle-image">
                            <img src="https://img.myshopline.com/image/store/1713770442657/22375cff232045bc9ee257f17eedd3b6.svg" class="f-auto-image">
                          </div>
                          <div class="button-container">
                             <button class="layui-btn f-full-width-btn f-btn-primary-1" onclick='goFcDetails()'>View Details</button>
                             <button class="layui-btn f-full-width-btn f-btn-secondary-2" onclick='goHome()'>Home Page</button
                          </div>
                        </div>
                     
                      `,
    });
  }

  const Lv1Txt = "一等奖";
  const Lv2Txt = "二等奖";
  const Lv3Txt = "三等奖";
  const Lv4Txt = "四等奖";
  const LvMappingInfo = {
    [Lv4Txt]: {},
    [Lv1Txt]: {
      prizeType: "First Prize",
      prizeTitle: "Congratulations on winning the<br>first lucky prize",
    },
    [Lv2Txt]: {
      prizeType: "Second Prize",
      prizeTitle: "Congratulations on winning the<br>second lucky prize",
    },
    [Lv3Txt]: {
      prizeType: "Third Prize",
      prizeTitle: "Congratulations on winning the<br>third lucky prize",
    },
  };

  function getRewardWinDisplayInfo(winObj) {
    let changeRate = getServerObj().ratio;
    //let level = winObj.name;
    // let prizeType = LvMappingInfo[level].prizeType;
    //let prizeTitle = LvMappingInfo[level].prizeTitle;
    let amount = winObj.amount;
    let money = parseFloat((amount / changeRate).toFixed(2));
    let prizeType = winObj.nameEn;
    let prizeTitle = winObj.title;

    let pointsTxt = amount + " Pts";
    let worth = "Worth " + getServerObj().currency_symbol + " " + money;
    return {
      prizeType,
      prizeTitle,
      pointsTxt,
      worth,
    };
  }
  var currentServerObj = null;

  function getServerObj() {
    if (currentServerObj == null) {
      currentServerObj = wpAntifake;
    }
    console.log(currentServerObj);
    return currentServerObj;
  }

  function userIsLogin() {
    return getServerObj().isLogin;
  }

  //中奖显示
  function showReward(dataWin) {
    let winInfo = getRewardWinDisplayInfo(dataWin);

    let pointsTxt = winInfo.pointsTxt; // 20  Reward Pts;

    let isLogin = getServerObj().isLogin;
    let login_url = getServerObj().login_url;
    let reward_url = getServerObj().reward_url;

    let cur_action = "";
    if (isLogin) {
      //客户是登录查询的就提示中奖去查看中奖积分
      cur_action =
        `  <div class="btn-logined btn-primary">
  <span class="icon-reward"></span>
  ‌&nbsp; ` +
        pointsTxt +
        `  Got! ‌&nbsp; <a href="` +
        reward_url +
        `"> Reward</a>
   </div>`;
      setAddUserPoints(
        currentData.code,
        currentData.code,
        dataWin.amount,
        "reward",
        currentData.ipZone,
        currentData.resellerName,
        currentData.win,
        function (data) {
          if (data.isOk) {
            //已经派送奖励
            showRewardAlert(dataWin, cur_action);
          } else {
            //派送失败
          }
        }
      );
    } else {
      cur_action = `   <button class="btn btn-primary" onclick="goLogin();">Sign In To Get Points</button>`;
      showRewardAlert(dataWin, cur_action);
    }
  }

  //中奖显示
  function showRewardV2(dataWin, isLogin) {
    let winInfo = getRewardWinDisplayInfo(dataWin);

    let pointsTxt = winInfo.pointsTxt; // 20  Reward Pts;

    let login_url = getServerObj().login_url;
    let reward_url = getServerObj().reward_url;

    let cur_action = "";
    if (isLogin) {
      //客户是登录查询的就提示中奖去查看中奖积分
      cur_action =
        `  <div class="btn-logined btn-primary">
  <span class="icon-reward"></span>
  ‌&nbsp; <a class="opt-link" href="` +
        reward_url +
        `"> `+pointsTxt+`  Got! ‌&nbsp;</a>
   </div>`;
      showRewardAlert(dataWin, cur_action);
    } else {
      cur_action = `   <button class="btn btn-primary" onclick="goLogin();">Sign In To Get Points</button>`;
      showRewardAlert(dataWin, cur_action);
    }
  }

  function showRewardAlert(dataWin, cur_action = "") {
    let winInfo = getRewardWinDisplayInfo(dataWin);
    let prizeType = winInfo.prizeType; //"First Prize";
    let prizeTitle = winInfo.prizeTitle; //"Congratulations on winning the<br>first lucky prize";
    let pointsTxt = winInfo.pointsTxt; // 20  Reward Pts;
    let worth = winInfo.worth; //"Worth $2";

    layer.open({
      type: 1,
      title: false,
      closeBtn: 0,
      area: ["380px", "550px"],
      offset: "auto",
      content:
        `
                
   
      <div class="popup-container">
       <!-- 背景装饰彩屑 -->
       <div class="confetti"></div>
       <div class="confetti"></div>
       <div class="confetti"></div>
       <div class="confetti"></div>
       
       <div class="popup-layer">
          
           
           <!-- Logo 行 -->
           <div class="logo-container">
               <div class="logo">
                
               </div>
           </div>
           
           <!-- 标题内容行 -->
           <div class="section">
               <div class="section-title"> ` +
        prizeType +
        `</div>
               <div class="section-content">` +
        prizeTitle +
        `</div>
           </div>
           
           <!-- 奖励行 - 已修正居中问题 -->
           <div class="reward-section">
               <div class="reward-title">` +
        pointsTxt +
        `</div>
               <div class="reward-content">` +
        worth +
        `</div>
           </div>
           
           <!-- 按钮操作行 -->
           <div class="action-buttons">
           ` +
        cur_action +
        `
               <button class="btn btn-secondary" onclick="goClose();">
                  
                   Close
               </button>
           </div>
       </div>
   </div> `,
    });
  }

  /**辅助方法  end*/
});
