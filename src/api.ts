import { invoke } from "@tauri-apps/api/tauri";
import CryptoJS from "crypto-js";
import { API_BASE_URL } from "@/utils/config"; // 引入公共配置

// AES 配置，包含密钥和 IV
const key = CryptoJS.enc.Utf8.parse("YEY3NKU5CgVoqxDu"); // 替换为 16 字节的密钥
const iv = CryptoJS.enc.Utf8.parse("YEY3NKU5CgVoqxDu"); // 替换为 16 字节的 IV

// Base64标准转WebSafe编码
function base64ToWebSafe(base64: string) {
  return base64.replace(/\+/g, "-").replace(/\//g, "_");
}

// AES 加密函数
function aesEncrypt(message: string | CryptoJS.lib.WordArray) {
  const encrypted = CryptoJS.AES.encrypt(message, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return base64ToWebSafe(encrypted.toString());
}

// 生成签名函数
function generateSignature(params: { [key: string]: any }) {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return aesEncrypt(sortedParams);
}

// 生成包含 ts 和 sn 的请求数据
function prepareRequestData(payload: { [key: string]: any }) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signPayload = { ...payload, ts: timestamp };
  const sn = generateSignature(signPayload);
  return { ...payload, ts: timestamp, sn: sn };
}

// 刷新令牌的函数
// 刷新令牌的函数
async function refreshAuthToken(): Promise<string> {
  const userVal = localStorage.getItem("user");
  const user = userVal ? JSON.parse(userVal) : null;

  if (!user || !user.token) {
    throw new Error("Token not found");
  }

  const token = user.token; // 使用 token 而不是 refresh_token
  const refreshToken = user.refresh_token;

  if (!refreshToken) {
    throw new Error("Refresh token not found");
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = { ts: timestamp, refresh_token: refreshToken };
  const sn = generateSignature(payload);
  const requestData: any = { ...payload, sn };

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const formBody = Object.keys(requestData)
    .map(
      (key) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(requestData[key])}`
    )
    .join("&");

  // 使用 invoke 进行请求
  return invoke("api_request", {
    methodStr: "POST",
    url: `${API_BASE_URL}/ums/user/refresh-token`,
    headers,
    payload: requestData, // 将 requestData 作为 payload 传递
  })
    .then((result: any) => {
      // 成功请求后，更新 localStorage 中的 user 信息
      if (result.data && result.data.token) {
        user.token = result.data.token; // 更新 token
        localStorage.setItem("user", JSON.stringify(user));
        return result.data.token;
      } else {
        throw new Error("Failed to refresh token");
      }
    })
    .catch((error) => {
      throw error;
    });
}

// 发送 API 请求函数
export function sendApiRequest(
  method: string,
  endpoint: string,
  payload: { [key: string]: any } = {}
) {
  const url = `${API_BASE_URL}${endpoint}`;
  const requestData: any = prepareRequestData(payload);
  const userVal = localStorage.getItem("user");
  const user = userVal ? JSON.parse(userVal) : null;
  const headers = {
    Authorization: `Bearer ${user?.token || ""}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  let options: {
    methodStr: string;
    url: string;
    headers: { [key: string]: string };
    payload?: { [key: string]: any };
  };

  if (method === "POST" || method === "PUT") {
    options = {
      methodStr: method,
      url,
      headers,
      payload: requestData,
    };
  } else if (method === "GET") {
    const queryParams = Object.keys(requestData)
      .map((key) => `${key}=${encodeURIComponent(requestData[key])}`)
      .join("&");
    options = {
      methodStr: method,
      url: `${url}?${queryParams}`,
      headers,
    };
  } else {
    throw new Error("Unsupported HTTP method: " + method);
  }

  // 使用 invoke 调用后端
  return invoke("api_request", options)
    .then((result) => {
      return result;
    })
    .catch(async (error) => {
      // 如果遇到 401 错误，尝试刷新令牌
      // 如果遇到 401 错误，尝试刷新令牌
      if (
        typeof error === "object" &&
        error.message &&
        error.message.includes("401 Unauthorized")
      ) {
        console.warn("Token expired, attempting to refresh token...");
        // eslint-disable-next-line no-useless-catch
        try {
          const newToken = await refreshAuthToken();
          headers.Authorization = `Bearer ${newToken}`;
          // 重新尝试发送请求
          return invoke("api_request", options);
        } catch (refreshError) {
          throw refreshError;
        }
      } else if (
        typeof error === "string" &&
        error.includes("401 Unauthorized")
      ) {
        console.warn("Token expired, attempting to refresh token...");
        // eslint-disable-next-line no-useless-catch
        try {
          const newToken = await refreshAuthToken();
          headers.Authorization = `Bearer ${newToken}`;
          // 重新尝试发送请求
          return invoke("api_request", options);
        } catch (refreshError) {
          throw refreshError;
        }
      } else {
        throw error;
      }
    });
}
