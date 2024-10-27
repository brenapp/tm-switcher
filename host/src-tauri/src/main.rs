// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod process;

use anyhow::Result;
use portable_pty::{CommandBuilder, PtySize};
use process::{ProcessEvent, ProcessOptions};
use std::io::Write;
use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::{ipc::Channel, AppHandle, Listener};
use tauri_plugin_shell::ShellExt;
use unescape::unescape;

#[tauri::command]
fn begin(app: AppHandle, process: Channel<ProcessEvent>, size: PtySize) -> () {
    let command = app.shell().sidecar("tm-switcher").unwrap();
    let command: Command = command.into();
    let command = CommandBuilder::new(command.get_program());

    let process = Arc::new(Mutex::new(
        crate::process::Process::new(command, ProcessOptions { size, web: process }).unwrap(),
    ));

    let data_process = Arc::clone(&process);
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
            process.write(output.as_bytes()).unwrap();
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
