use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;
use tauri::Emitter;

const DISCORD_CLIENT_ID: &str = "1506189937664462848";
const DISCORD_CLIENT_SECRET: &str = "5xYISdWU240_yMvwimhIrR69Fkc_LTT4";
const DISCORD_REDIRECT_URI: &str = "http://localhost:17921/callback";
const CALLBACK_PORT: u16 = 17921;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DiscordUser {
    id: String,
    username: String,
    avatar: Option<String>,
    email: Option<String>,
    global_name: Option<String>,
}

#[derive(Serialize, Clone)]
struct AuthResult {
    success: bool,
    user: Option<DiscordUser>,
    error: Option<String>,
}

/// Starts a one-shot HTTP server, waits for Discord's callback,
/// exchanges the code for a token, fetches user info, and emits an event.
#[tauri::command]
async fn discord_login(app: tauri::AppHandle) -> Result<(), String> {
    // Spawn the listener in a background thread so it doesn't block
    std::thread::spawn(move || {
        let listener = match TcpListener::bind(format!("127.0.0.1:{}", CALLBACK_PORT)) {
            Ok(l) => l,
            Err(e) => {
                let _ = app.emit(
                    "discord-auth",
                    AuthResult {
                        success: false,
                        user: None,
                        error: Some(format!("Could not start callback server: {}", e)),
                    },
                );
                return;
            }
        };

        // Wait for exactly one connection (blocking)
        if let Ok((mut stream, _)) = listener.accept() {
            let mut reader = BufReader::new(stream.try_clone().unwrap());
            let mut request_line = String::new();
            let _ = reader.read_line(&mut request_line);

            // Extract code from: GET /callback?code=XXXX HTTP/1.1
            let code = request_line
                .split_whitespace()
                .nth(1)
                .and_then(|path| {
                    path.split('?')
                        .nth(1)
                        .and_then(|qs| {
                            qs.split('&')
                                .find(|p| p.starts_with("code="))
                                .map(|p| p.trim_start_matches("code=").to_string())
                        })
                });

            // Send a nice response to the browser
            let html = if code.is_some() {
                r##"<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rivox</title>
                <style>
                  body { font-family: 'Inter', system-ui, sans-serif; background: #0a0a0a; color: #fafafa;
                         display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                  .card { text-align: center; }
                  .check { width: 48px; height: 48px; background: #5b5bd6; border-radius: 12px;
                           display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
                  h1 { font-size: 20px; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.025em; }
                  p { font-size: 14px; color: #a1a1aa; margin: 0; }
                </style></head><body>
                <div class="card">
                  <div class="check"><svg width="24" height="24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>
                  <h1>Signed in to Rivox</h1>
                  <p>You can close this tab and return to the app.</p>
                </div></body></html>"##
            } else {
                r##"<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rivox</title>
                <style>
                  body { font-family: 'Inter', system-ui, sans-serif; background: #0a0a0a; color: #fafafa;
                         display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                  h1 { font-size: 20px; font-weight: 600; }
                  p { font-size: 14px; color: #a1a1aa; }
                </style></head><body>
                <div style="text-align:center"><h1>Authentication failed</h1><p>Please try again from Rivox.</p></div>
                </body></html>"##
            };

            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                html.len(),
                html
            );
            let _ = stream.write_all(response.as_bytes());
            let _ = stream.flush();

            // Drop the listener (frees the port)
            drop(listener);

            // Now exchange the code
            if let Some(code) = code {
                let rt = tokio::runtime::Runtime::new().unwrap();
                rt.block_on(async {
                    match exchange_code(&code).await {
                        Ok(user) => {
                            let _ = app.emit(
                                "discord-auth",
                                AuthResult {
                                    success: true,
                                    user: Some(user),
                                    error: None,
                                },
                            );
                        }
                        Err(e) => {
                            let _ = app.emit(
                                "discord-auth",
                                AuthResult {
                                    success: false,
                                    user: None,
                                    error: Some(e),
                                },
                            );
                        }
                    }
                });
            } else {
                let _ = app.emit(
                    "discord-auth",
                    AuthResult {
                        success: false,
                        user: None,
                        error: Some("No authorization code received".to_string()),
                    },
                );
            }
        }
    });

    Ok(())
}

async fn exchange_code(code: &str) -> Result<DiscordUser, String> {
    let client = reqwest::Client::new();

    let mut params = HashMap::new();
    params.insert("client_id", DISCORD_CLIENT_ID);
    params.insert("client_secret", DISCORD_CLIENT_SECRET);
    params.insert("grant_type", "authorization_code");
    params.insert("redirect_uri", DISCORD_REDIRECT_URI);
    params.insert("code", code);

    #[derive(Deserialize)]
    struct TokenResponse {
        access_token: String,
        token_type: String,
    }

    let token_res = client
        .post("https://discord.com/api/oauth2/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token request failed: {}", e))?;

    if !token_res.status().is_success() {
        let err = token_res.text().await.unwrap_or_default();
        return Err(format!("Token exchange failed: {}", err));
    }

    let token: TokenResponse = token_res
        .json()
        .await
        .map_err(|e| format!("Failed to parse token: {}", e))?;

    let user_res = client
        .get("https://discord.com/api/users/@me")
        .header(
            "Authorization",
            format!("{} {}", token.token_type, token.access_token),
        )
        .send()
        .await
        .map_err(|e| format!("User request failed: {}", e))?;

    if !user_res.status().is_success() {
        let err = user_res.text().await.unwrap_or_default();
        return Err(format!("User fetch failed: {}", err));
    }

    user_res
        .json()
        .await
        .map_err(|e| format!("Failed to parse user: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![discord_login])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
