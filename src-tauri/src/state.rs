use std::{
    collections::HashMap,
    sync::{atomic::AtomicU16, Arc, Mutex as StdMutex},
};
use tokio::sync::{oneshot, Mutex};
use tokio_util::sync::CancellationToken;

use crate::{library::FileEntry, server::ServerHandle};

pub type Pending = Arc<Mutex<HashMap<String, oneshot::Sender<bool>>>>;

#[derive(Default)]
pub struct AppState {
    /// Every file the app knows about. The server can ONLY serve files found here.
    pub index: StdMutex<Vec<FileEntry>>,
    pub server: Mutex<Option<ServerHandle>>,
    pub discovery: Mutex<Option<CancellationToken>>,
    pub downloads: Mutex<HashMap<String, CancellationToken>>,
    pub pending: Pending,
    /// Port advertised in the beacon (0 = not sending).
    pub beacon_port: Arc<AtomicU16>,
    pub awake: StdMutex<Option<keepawake::KeepAwake>>,
}
