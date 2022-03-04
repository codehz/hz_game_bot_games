const eventHandlers = {};
const initParams = urlParseHashParams(location?.hash ?? "");
const isIframe = window.self !== window.top;

function urlParseHashParams(locationHash) {
  return Object.fromEntries([
    ...new URLSearchParams(locationHash.replace(/^#/, "")),
  ]);
}

function postEvent(eventType, callback = () => {}, eventData = "") {
  if (window.TelegramWebviewProxy !== undefined) {
    TelegramWebviewProxy.postEvent(eventType, JSON.stringify(eventData));
    callback();
  } else if (window.external && "notify" in window.external) {
    window.external.notify(
      JSON.stringify({ eventType: eventType, eventData: eventData })
    );
    callback();
  } else if (isIframe) {
    try {
      let trustedTarget = "https://web.telegram.org";
      // For now we don't restrict target, for testing purposes
      trustedTarget = "*";
      window.parent.postMessage(
        JSON.stringify({ eventType: eventType, eventData: eventData }),
        trustedTarget
      );
    } catch (e) {
      callback(e);
    }
  } else {
    callback({ notAvailable: true });
  }
}

function receiveEvent(eventType, eventData) {
  const curEventHandlers = eventHandlers[eventType];
  if (curEventHandlers === undefined || !curEventHandlers.length) {
    return;
  }
  for (var i = 0; i < curEventHandlers.length; i++) {
    try {
      curEventHandlers[i](eventType, eventData);
    } catch (e) {}
  }
}

function onEvent(eventType, callback) {
  if (eventHandlers[eventType] === undefined) {
    eventHandlers[eventType] = [];
  }
  const index = eventHandlers[eventType].indexOf(callback);
  if (index === -1) {
    eventHandlers[eventType].push(callback);
  }
}

function offEvent(eventType, callback) {
  if (eventHandlers[eventType] === undefined) {
    return;
  }
  const index = eventHandlers[eventType].indexOf(callback);
  if (index === -1) {
    return;
  }
  eventHandlers[eventType].splice(index, 1);
}

function openProtoUrl(url) {
  if (!url.match(/^(web\+)?tgb?:\/\/./)) {
    return false;
  }
  const useIframe = !!navigator.userAgent.match(
    /iOS|iPhone OS|iPhone|iPod|iPad/i
  );
  if (useIframe) {
    const iframeContEl =
      document.getElementById("tgme_frame_cont") || document.body;
    const iframeEl = document.createElement("iframe");
    iframeContEl.appendChild(iframeEl);
    let pageHidden = false;
    const enableHidden = function () {
      pageHidden = true;
    };
    window.addEventListener("pagehide", enableHidden, false);
    window.addEventListener("blur", enableHidden, false);
    if (iframeEl !== null) {
      iframeEl.src = url;
    }
    setTimeout(function () {
      if (!pageHidden) {
        window.location = url;
      }
      window.removeEventListener("pagehide", enableHidden, false);
      window.removeEventListener("blur", enableHidden, false);
    }, 2000);
  } else {
    window.location = url;
  }
  return true;
}

window.TelegramGameProxy ??= {
  initParams: initParams,
  receiveEvent: receiveEvent,
  onEvent: onEvent,
  shareScore() {
    postEvent("share_score", function (error) {
      if (error) {
        const shareScoreUrl = initParams.tgShareScoreUrl;
        if (shareScoreUrl) {
          openProtoUrl(shareScoreUrl);
        }
      }
    });
  },
  paymentFormSubmit(formData = {}) {
    const { credentials: { type, token } = {}, title } = formData;
    if (
      type != "card" ||
      !token.match(/^[A-Za-z0-9\/=_\-]{4,512}$/) ||
      !title
    ) {
      console.error("[TgProxy] Invalid form data submitted", formData);
      throw Error("PaymentFormDataInvalid");
    }
    postEvent("payment_form_submit", false, formData);
  },
};
