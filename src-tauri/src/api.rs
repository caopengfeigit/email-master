use serde::{Serialize};
use serde_json::Value;
use tauri::State;
use reqwest::{Client, Method};
use reqwest::header::{HeaderMap, HeaderValue, HeaderName};
use std::collections::HashMap;
use crate::AppState;
use log::{info, error};

// 定义通用请求的成功和失败响应结构
#[derive(Serialize)]
pub struct SResult<T> {
    error: Option<String>,
    message: Option<String>,
    data: Option<T>,
}

#[derive(Serialize)]
pub struct Fail {
    error: Option<String>,
    message: Option<String>,
}

// 定义通用 API 请求方法
#[tauri::command]
pub async fn api_request(
    _state: State<'_, AppState>,
    method_str: String,
    url: String,
    payload: Option<HashMap<String, String>>, 
    headers: Option<HashMap<String, String>>, 
) -> Result<SResult<Value>, Fail> {
    info!("Request Method: {}", method_str);
    info!("Request URL: {}", url);
    if let Some(headers) = &headers {
        info!("Request Headers: {:?}", headers);
    }
    if let Some(payload) = &payload {
        info!("Request Payload: {:?}", payload);
    }

    // 创建请求客户端
    let client = Client::new();

    // 将字符串转换为对应的 HTTP 方法
    let method = match method_str.to_uppercase().as_str() {
        "GET" => Method::GET,
        "POST" => Method::POST,
        "PUT" => Method::PUT,
        "DELETE" => Method::DELETE,
        _ => {
            return Err(Fail {
                error: Some(format!("Unsupported HTTP method: {}", method_str)),
                message: None,
            });
        }
    };

    // 构建请求
    let mut request = client.request(method.clone(), &url);

    // 添加请求头（如果有）
    if let Some(headers_map) = headers {
        let mut req_headers = HeaderMap::new();
        for (key, value) in headers_map {
            if let (Ok(header_name), Ok(header_value)) = (
                HeaderName::from_bytes(key.as_bytes()),
                HeaderValue::from_str(&value),
            ) {
                req_headers.insert(header_name, header_value);
            } else {
                error!("Invalid header detected: {}: {}", key, value);
            }
        }
        request = request.headers(req_headers);
    }

    // 添加请求体（仅针对 POST 和 PUT 方法）
    if matches!(method, Method::POST | Method::PUT) {
        if let Some(payload_data) = &payload {
            match serde_urlencoded::to_string(payload_data) {
                Ok(form_data) => {
                    info!("Form Data: {}", form_data);
                    request = request.header("Content-Type", "application/x-www-form-urlencoded")
                                     .body(form_data);
                }
                Err(err) => {
                    error!("Failed to encode payload to x-www-form-urlencoded: {}", err);
                    return Err(Fail {
                        error: Some("Failed to encode payload".to_string()),
                        message: None,
                    });
                }
            }
        }
    }

    // 发送请求并处理响应
    match request.send().await {
        Ok(response) => {
            let status_code = response.status();
            let body = response.text().await.unwrap_or_else(|_| "No response body".to_string());

            // 分类处理响应状态码
            match status_code.as_u16() {
                200..=299 => {
                    match serde_json::from_str::<Value>(&body) {
                        Ok(data) => {
                            info!("Request successful with data: {:?}", data);
                            Ok(SResult {
                                error: None,
                                message: Some("Request successful".to_string()),
                                data: Some(data),
                            })
                        }
                        Err(_) => {
                            error!("Failed to parse response body as JSON: {}", body);
                            Err(Fail {
                                error: Some("Failed to parse response".to_string()),
                                message: None,
                            })
                        }
                    }
                }
                401 => {
                    error!("Authentication failed (401). Response body: {}", body);
                    Err(Fail {
                        error: Some(status_code.to_string()),
                        message: Some(format!("Status code: {} - {}", status_code, body)),
                    })
                }
                _ => {
                    error!(
                        "API request failed with status code: {}, body: {}",
                        status_code, body
                    );
                    Err(Fail {
                        error: Some("API request failed".to_string()),
                        message: Some(format!("Status code: {} - {}", status_code, body)),
                    })
                }
            }
        }
        Err(err) => {
            let error_message = format!("Request failed: {}", err);
            error!("{}", error_message);
            Err(Fail {
                error: Some(error_message),
                message: None,
            })
        }
    }
}
