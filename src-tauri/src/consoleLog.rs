use log::{info, warn, error}; // 你可以根据需要使用不同级别的日志

#[tauri::command]
pub fn log_message(level: String, message: String) {
    match level.as_str() {
        "info" => info!("{}", message),
        "warn" => warn!("{}", message),
        "error" => error!("{}", message),
        _ => info!("{}", message), // 默认是 info 级别
    }
}
