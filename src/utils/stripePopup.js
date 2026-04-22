const STRIPE_POPUP_NAME = "shape-certo-stripe-popup";
const STRIPE_POPUP_MESSAGE = "shape-certo-stripe-popup-result";

export function openPendingStripePopup() {
  const width = 520;
  const height = 760;
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
    "menubar=no",
    "toolbar=no",
    "location=yes",
    "status=no",
    "resizable=yes",
    "scrollbars=yes",
  ].join(",");

  const popup = window.open("", STRIPE_POPUP_NAME, features);

  if (!popup) {
    return null;
  }

  popup.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Shape Certo | Stripe</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #070707;
            color: #fff;
            font-family: Inter, Arial, sans-serif;
          }
          main {
            width: min(360px, calc(100vw - 32px));
            padding: 24px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 8px;
            background: linear-gradient(145deg, rgba(255, 35, 45, 0.2), rgba(255, 255, 255, 0.06));
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
          }
          strong { display: block; font-size: 18px; margin-bottom: 8px; }
          span { color: rgba(255, 255, 255, 0.72); line-height: 1.5; }
        </style>
      </head>
      <body>
        <main>
          <strong>Abrindo ambiente seguro da Stripe...</strong>
          <span>Mantenha esta janela aberta para concluir a operacao.</span>
        </main>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();

  return popup;
}

export function redirectStripePopup(popup, url) {
  if (!popup || popup.closed) {
    return false;
  }

  popup.location.href = url;
  popup.focus();
  return true;
}

export function closeStripePopup(popup) {
  if (popup && !popup.closed) {
    popup.close();
  }
}

export function watchStripePopupClose(popup, onClose) {
  if (!popup) {
    return () => {};
  }

  const timerId = window.setInterval(() => {
    if (popup.closed) {
      window.clearInterval(timerId);
      onClose?.();
    }
  }, 900);

  return () => window.clearInterval(timerId);
}

export function notifyStripePopupResult(payload) {
  if (!window.opener || window.opener.closed) {
    return false;
  }

  window.opener.postMessage(
    {
      type: STRIPE_POPUP_MESSAGE,
      payload,
    },
    window.location.origin
  );
  window.close();
  return true;
}

export function isStripePopupMessage(event) {
  return event.origin === window.location.origin && event.data?.type === STRIPE_POPUP_MESSAGE;
}
