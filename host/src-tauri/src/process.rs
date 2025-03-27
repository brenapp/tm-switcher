use std::io::Write;

use anyhow::Result;
use portable_pty::{native_pty_system, Child, CommandBuilder, PtyPair, PtySize};
use serde::Serialize;
use tauri::async_runtime::JoinHandle;
use tauri::ipc::Channel;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum ProcessEvent {
    // Output to write to the terminal
    #[serde(rename_all = "camelCase")]
    Output(Vec<u8>),

    // Underlying process ends
    #[serde(rename_all = "camelCase")]
    Terminated,
}

pub(crate) struct Process {
    pty: PtyPair,

    handle: JoinHandle<()>,

    process: Box<dyn Child + Send + Sync>,
    writer: Box<dyn Write + Send>,
    web: Channel<ProcessEvent>,
}

pub struct ProcessOptions {
    pub size: PtySize,
    pub web: Channel<ProcessEvent>,
}

impl Process {
    // Create a new process
    pub fn new(command: CommandBuilder, options: ProcessOptions) -> Result<Self> {
        let pty_system = native_pty_system();
        let pair = pty_system.openpty(options.size)?;

        let child = pair.slave.spawn_command(command)?;

        let web = options.web.clone();
        let mut reader = pair.master.try_clone_reader()?;
        let write_handle = tauri::async_runtime::spawn(async move {
            let mut buffer: [u8; 1024] = [0; 1024];
            loop {
                if let Ok(n) = reader.read(&mut buffer) {
                    if n == 0 {
                        break;
                    }
                    let data = buffer[..n].to_vec();
                    if let Err(_) = web.send(ProcessEvent::Output(data)) {
                        break;
                    }
                }
            }

            let _ = web.send(ProcessEvent::Terminated);
        });

        let writer = pair.master.take_writer()?;

        Ok(Self {
            pty: pair,
            handle: write_handle,
            writer,
            process: child,
            web: options.web,
        })
    }

    pub fn resize(&self, size: PtySize) -> Result<()> {
        self.pty.master.resize(size)
    }
}

impl Write for Process {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        self.writer.write(buf)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        self.writer.flush()
    }
}