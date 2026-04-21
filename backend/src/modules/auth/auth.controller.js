import {
  getCurrentUser,
  signInWithEmail,
  signInWithGoogleProfile,
  signUpWithEmail,
} from "./auth.service.js";

const googleScopes = ["openid", "email", "profile"];

function getGoogleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3333/auth/google/callback",
    appOrigin: process.env.APP_ORIGIN || "http://localhost:5173",
  };
}

function redirectWithError(res, message) {
  const { appOrigin } = getGoogleConfig();
  const url = new URL("/#auth_error", appOrigin);
  url.hash = new URLSearchParams({ auth_error: message }).toString();
  return res.redirect(url.toString());
}

function isAllowedAppOrigin(origin) {
  return ["http://localhost:5173", "http://127.0.0.1:5173"].includes(origin);
}

function sanitizeReturnTo(value) {
  const fallback = "/dashboard";
  const returnTo = String(value || fallback);

  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return fallback;
  }

  return returnTo;
}

function encodeState(state) {
  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

function decodeState(value) {
  try {
    return JSON.parse(Buffer.from(String(value || ""), "base64url").toString("utf8"));
  } catch (error) {
    return {};
  }
}

export async function handleSignUp(req, res, next) {
  try {
    const data = await signUpWithEmail(req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
}

export async function handleSignIn(req, res, next) {
  try {
    const data = await signInWithEmail(req.body);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function handleMe(req, res, next) {
  try {
    const data = await getCurrentUser(req.auth.sub);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function handleSignOut(req, res) {
  res.json({ ok: true });
}

export async function handleGoogleStart(req, res, next) {
  try {
    const { clientId, redirectUri } = getGoogleConfig();
    const requestedOrigin = String(req.query.app_origin || "");
    const appOrigin = isAllowedAppOrigin(requestedOrigin)
      ? requestedOrigin
      : getGoogleConfig().appOrigin;
    const returnTo = sanitizeReturnTo(req.query.return_to);

    if (!clientId) {
      return redirectWithError(res, "Google Client ID nao configurado.");
    }

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", googleScopes.join(" "));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "select_account");
    url.searchParams.set("state", encodeState({ appOrigin, returnTo }));

    return res.redirect(url.toString());
  } catch (error) {
    return next(error);
  }
}

export async function handleGoogleCallback(req, res, next) {
  try {
    const { code, error: googleError } = req.query;
    const { clientId, clientSecret, redirectUri, appOrigin: defaultAppOrigin } = getGoogleConfig();
    const state = decodeState(req.query.state);
    const appOrigin = isAllowedAppOrigin(state.appOrigin) ? state.appOrigin : defaultAppOrigin;
    const returnTo = sanitizeReturnTo(state.returnTo);

    if (googleError) {
      return redirectWithError(res, `Google: ${googleError}`);
    }

    if (!code || !clientId || !clientSecret) {
      return redirectWithError(res, "Configuracao do Google incompleta.");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return redirectWithError(res, tokenData.error_description || "Falha ao autenticar com Google.");
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    const profile = await profileResponse.json();

    if (!profileResponse.ok) {
      return redirectWithError(res, "Falha ao buscar perfil do Google.");
    }

    const data = await signInWithGoogleProfile(profile);
    const redirectUrl = new URL(returnTo, appOrigin);
    redirectUrl.hash = new URLSearchParams({
      local_session: JSON.stringify(data),
    }).toString();

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    return next(error);
  }
}
