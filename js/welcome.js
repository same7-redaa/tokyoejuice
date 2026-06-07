jQuery(document).ready(function ($) {
  function urlHasString(target, caseSensitive = true, part = "href") {
    // 参数验证：确保目标字符串有效
    if (typeof target !== "string" || target.trim() === "") {
      console.warn("目标字符串必须为非空字符串");
      return false;
    }

    // 获取URL的指定部分
    let urlPart = "";
    switch (part) {
      case "href":
        urlPart = window.location.href; // 完整URL（如：https://example.com/path?name=test#hash）
        break;
      case "path":
        urlPart = window.location.pathname; // 路径部分（如：/path）
        break;
      case "search":
        urlPart = window.location.search; // 查询参数（如：?name=test）
        break;
      case "hash":
        urlPart = window.location.hash; // 哈希部分（如：#hash）
        break;
      default:
        console.warn("无效的URL部分，默认检测完整URL");
        urlPart = window.location.href;
    }

    // 处理大小写
    if (!caseSensitive) {
      urlPart = urlPart.toLowerCase();
      target = target.toLowerCase();
    }

    // 检测是否包含目标字符串
    return urlPart.includes(target);
  }
  // 尝试领取暂存积分的函数
  function claimPendingPoints() {
    const serObj = woo_points_mgr;
    if (!serObj.isLoggedIn) return;
    const pendingPoints = localStorage.getItem("pending_points");
    if (!pendingPoints) return;

    const data = JSON.parse(pendingPoints);
    if (!data || data.antifake_code == null) {
      console.error("Invalid pending points data:", data);
      return;
    }
    $.ajax({
      type: "POST",
      url: serObj.ajax_url + "?rank=" + Math.random(),
      cache: false, // 关键设置
      headers: {
        "cache-control": "no-cache",
      },
      data: {
        action: "apply_points_and_rewards",
        nonce: serObj.nonce,
        antifake_code: data.antifake_code,
        antifake_code_val: data.antifake_code_val,
        ipZone: data.ipZone,
        resellerName: data.resellerName,
        points: data.points,
        search_points: data.search_points,
        ext_info: data.ext_info,
        timestamp: data.timestamp,
        earned_type: data.earned_type,
      },
      success: function (response) {
        if (response.success) {
          if (response.data.isOk) {
            localStorage.removeItem("pending_points");
            console.log("积分领取成功!");
            console.log("准备跳转页面：" + serObj.rewards_url);
            if (!urlHasString("reward",true,"path")) {
              window.location.href = serObj.rewards_url;
            }
          } else {
            console.error("领取失败:", response.data);
          }
        }
      },
    });
  }

  claimPendingPoints();
});
