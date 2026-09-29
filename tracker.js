/* 提马早报 · 访问统计埋点
 * 页面引入方式：<script src="/tracker.js" defer></script>
 * 上报内容：随机访客标识、SHA-256 哈希后的 IP（不存明文）、地区、设备、来源页。
 * 任何一步失败都静默跳过，不影响读者浏览。
 */
  'use strict';
  var SB_URL = 'https://qujgzxqglluqjchssmyw.supabase.co';
  var SB_KEY = 'sb_publishable_rb1Cy-_zWKsTQtoFMeKLNA_3bby10Rr';
  try {
    // 访客标识：本地随机 UUID，仅用于区分"不同访客"，不是个人信息
    var vid = localStorage.getItem('tmb_vid');
    if (!vid) {
      vid = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'v-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem('tmb_vid', vid); } catch (e) {}
    }

    var ua = navigator.userAgent;
    var os =
      /Windows/.test(ua) ? 'Windows' :
      /Android/.test(ua) ? 'Android' :
      /iPhone|iPad|iPod/.test(ua) ? 'iOS' :
      /Mac OS X/.test(ua) ? 'macOS' :
      /Linux/.test(ua) ? 'Linux' : '其他';
    var browser =
      /MicroMessenger/i.test(ua) ? '微信内置' :
      /Edg(e|A|iOS)\//.test(ua) ? 'Edge' :
      /QQBrowser/.test(ua) ? 'QQ浏览器' :
      /UCBrowser/.test(ua) ? 'UC浏览器' :
      /Opera|OPR\//.test(ua) ? 'Opera' :
      /Firefox\/|FxiOS/.test(ua) ? 'Firefox' :
      /Chrome\/|CriOS/.test(ua) ? 'Chrome' :
      /Safari\//.test(ua) ? 'Safari' : '其他';
    var device =
      /iPad|Tablet/.test(ua) ? 'tablet' :
      /Mobi|iPhone|Android/.test(ua) ? 'mobile' : 'desktop';
    var m = (document.title || '').match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
    var issue = m ? (m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2)) : '';

    var payload = {
      vid: vid,
      os: os,
      browser: browser,
      device: device,
      screen: screen.width + 'x' + screen.height,
      page: location.pathname,
      issue: issue,
      referer: document.referrer || ''
    };

    function send(extra) {
      var body = Object.assign({}, payload, extra || {});
      fetch(SB_URL + '/rest/v1/visits', {
        method: 'POST',
        keepalive: true,
        headers: {
          'apikey': SB_KEY,
          'Authorization': 'Bearer ' + SB_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify([body])
      }).catch(function () {});
    }

    function sha256Hex(s) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ('0' + b.toString(16)).slice(-2);
        }).join('');
      });
    }

    // 地区解析：ipwho.is 免费接口，带 2.5 秒超时；成功则连同 IP 哈希一起上报
    var finished = false;
    function finish(geo) {
      if (finished) return;
      finished = true;
      if (geo && geo.ip && window.crypto && crypto.subtle) {
        sha256Hex(geo.ip).then(function (h) {
          send({
            ip_hash: h,
            country: geo.country || '',
            province: geo.region || '',
            city: geo.city || ''
          });
        }).catch(function () { send(); });
      } else {
        send();
      }
    }
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    if (ctrl) setTimeout(function () { ctrl.abort(); }, 2500);
    setTimeout(function () { finish(null); }, 4000); // 兜底：无论如何 4 秒内必上报
    fetch('https://ipwho.is/', ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { return r.json(); })
      .then(finish)
      .catch(function () { finish(null); });
  } catch (e) {}
})();
