use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;
use reqwest::Client;

use crate::AppState;

// Define the login request payload
#[derive(Serialize)]
struct LoginRequest {
    username: String,
    password: String,
}

// Define the login response structure
#[derive(Deserialize)]
struct LoginResponse {
    token: Option<String>,
    error: Option<String>,
    message: Option<String>,
}

// Define the success and failure response wrappers
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

// The login command
#[tauri::command]
pub async fn login_by_username(
    state: State<'_, AppState>,
    username: String,
    password: String,
) -> SResult<Value> {
    let client = Client::new();
    
    // Create the login request payload
    let login_request = LoginRequest { username, password };
    
    // Make the API request
    match client
        .post("https://your-backend-url.com/api/ums/user/login-by-username")
        .json(&login_request)
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                // Parse the JSON response
                let res: LoginResponse = response.json().await.unwrap_or_else(|_| LoginResponse {
                    token: None,
                    error: Some("Failed to parse response".to_string()),
                    message: None,
                });
                
                if let Some(token) = res.token {
                    Ok(SResult {
                        error: None,
                        message: Some("Login successful".to_string()),
                        data: Some(Value::String(token)),
                    })
                } else {
                    Err(Fail {
                        error: res.error.or(Some("Unknown error occurred".to_string())),
                        message: res.message,
                    })
                }
            } else {
                Err(Fail {
                    error: Some("Failed to login".to_string()),
                    message: None,
                })
            }
        }
        Err(err) => Err(Fail {
            error: Some(err.to_string()),
            message: None,
        }),
    }
}
