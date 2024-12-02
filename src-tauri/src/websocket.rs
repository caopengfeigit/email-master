use tauri::State;
use tokio::net::TcpStream;
use tokio_tungstenite::{accept_async, tungstenite::protocol::Message};
use futures_util::SinkExt;
use log::{info, error};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashMap;
use reqwest::header::{HeaderMap, HeaderValue, HeaderName};

// WebSocket State Struct for managing the WebSocket connection.
#[derive(Default)]
pub struct WebSocketState {
    socket: Option<tokio_tungstenite::WebSocketStream<TcpStream>>,
    headers: Option<HeaderMap>,
}

#[tauri::command]
pub async fn start_websocket_connection(
    state: State<'_, Arc<Mutex<WebSocketState>>>,
    url: String,
    headers: HashMap<String, String>,
    initial_message: String, // 新增参数，初始消息
) -> Result<String, String> {
    info!("Starting WebSocket connection with URL: {}", url);
    info!("Headers: {:?}", headers);
    info!("Initial message: {}", initial_message);

    // Set headers from provided values
    let mut req_headers = HeaderMap::new();
    for (key, value) in headers {
        if let Ok(header_name) = HeaderName::from_bytes(key.as_bytes()) {
            if let Ok(header_value) = HeaderValue::from_str(&value) {
                req_headers.insert(header_name, header_value);
            }
        }
    }

    let addr = url;
    let stream = TcpStream::connect(&addr).await.map_err(|e| format!("Failed to connect: {}", e))?;
    let mut ws_stream = accept_async(stream).await.map_err(|e| format!("Error during WebSocket handshake: {}", e))?;

    // 在连接建立后发送初始消息
    let send_result = ws_stream.send(Message::Text(initial_message.clone())).await;

    // 打印发送初始消息的结果
    if let Err(e) = &send_result {
        error!("Failed to send initial message: {}", e);
    } else {
        info!("Successfully sent initial message: {}", initial_message);
    }
    send_result.map_err(|e| format!("Failed to send initial message: {}", e))?;

    let mut ws_state = state.lock().await;
    ws_state.socket = Some(ws_stream);
    ws_state.headers = Some(req_headers);

    info!("WebSocket connection established and initial message sent.");
    Ok("WebSocket connection established.".into())
}

#[tauri::command]
pub async fn send_websocket_message(
    state: State<'_, Arc<Mutex<WebSocketState>>>,
    message: String,
) -> Result<String, String> {
    // 打印请求参数
    info!("Sending WebSocket message: {}", message);

    let mut ws_state = state.lock().await;

    if let Some(socket) = ws_state.socket.as_mut() {
        // 发送消息
        let send_result = socket.send(Message::Text(message.clone())).await;

        // 打印发送消息的结果
        if let Err(e) = &send_result {
            error!("Failed to send message: {}", e);
        }
        send_result.map_err(|e| format!("Failed to send message: {}", e))?;

        info!("Message sent: {}", message);
        Ok("Message sent.".into())
    } else {
        let error_message = "WebSocket is not connected.";
        error!("{}", error_message);
        Err(error_message.into())
    }
}

#[tauri::command]
pub async fn close_websocket_connection(
    state: State<'_, Arc<Mutex<WebSocketState>>>,
) -> Result<String, String> {
    info!("Attempting to close WebSocket connection...");

    let mut ws_state = state.lock().await;

    if let Some(mut socket) = ws_state.socket.take() {
        let close_result = socket.close(None).await;

        // 打印关闭 WebSocket 连接的结果
        if let Err(e) = &close_result {
            error!("Failed to close WebSocket connection: {}", e);
        }
        close_result.map_err(|e| format!("Failed to close WebSocket connection: {}", e))?;

        info!("WebSocket connection closed.");
        Ok("WebSocket connection closed.".into())
    } else {
        let error_message = "WebSocket is not connected.";
        error!("{}", error_message);
        Err(error_message.into())
    }
}
