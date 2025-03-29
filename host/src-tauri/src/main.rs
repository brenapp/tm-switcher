// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod process;

use anyhow::Result;
use portable_pty::{CommandBuilder, PtySize};
use process::{ProcessEvent, ProcessOptions};
use tauri::{TitleBarStyle, WebviewUrl, WebviewWindowBuilder};
use std::io::Write;
use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::{ipc::Channel, AppHandle, Listener};
use tauri_plugin_shell::ShellExt;
use unescape::unescape;

#[tauri::command]
fn begin(app: AppHandle, process: Channel<ProcessEvent>, size: PtySize) -> () {

    let sidecar = app.shell().sidecar("tm-switcher");
    let command: Command = match sidecar {
        Ok(command) => command.into(),
        Err(_) => {
            app.exit(0);
            return;
        }
    };
    let mut command = CommandBuilder::new(command.get_program());

    // Advertise terminal information to the child process
    command.env("COLOR", "1");
    command.env("TERM", "xterm-256color");
    command.env("TERM_PROGRAM", "tm-switcher-host");

    let process = Arc::new(Mutex::new(
        crate::process::Process::new(command, ProcessOptions { size, web: process }).unwrap(),
    ));

    let data_process = Arc::clone(&process);
    let app_clone = app.clone();
    app.listen("data", move |event| {
        let payload = event.payload().as_bytes();
        let payload: Result<serde_json::Value, _> = serde_json::from_slice(payload);

        if let Ok(serde_json::Value::String(data)) = payload {
            let output = String::from_utf8(
                unescape(data.as_str())
                    .unwrap()
                    .chars()
                    .map(|c| c as u8)
                    .collect(),
            )
            .unwrap();
            let mut process = data_process.lock().unwrap();
            if let Err(_) = process.write(output.as_bytes()) {
                app_clone.exit(0);
            }
        }
    });

    let resize_process = Arc::clone(&process);
    app.listen("resize", move |event| {
        let payload = event.payload().as_bytes();
        let payload: Result<PtySize, _> = serde_json::from_slice(payload);

        if let Ok(size) = payload {
            let process = resize_process.lock().unwrap();
            process.resize(size).unwrap();
        }
    });
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![begin])
        .setup(|app| {
            let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("TM Switcher")
                .inner_size(950.0, 600.0);
            
            // Transparent title bar on Mac OS
            #[cfg(target_os = "macos")]
            let win_builder = win_builder.title_bar_style(TitleBarStyle::Transparent);
            let window = win_builder.build().unwrap();

            #[cfg(target_os = "macos")]
            {
                use cocoa::appkit::{NSColor, NSWindow};
                use cocoa::base::{id, nil};

                let ns_window = window.ns_window().unwrap() as id;
                unsafe {
                    let bg_color = NSColor::colorWithRed_green_blue_alpha_(
                        nil,
                        22.0 / 255.0,
                        22.0 / 255.0,
                        22.5 / 255.0,
                        1.0,
                    );
                    ns_window.setBackgroundColor_(bg_color);
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
