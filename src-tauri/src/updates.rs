use crate::models::{AppError, AppResult};
use semver::Version;
use serde::Serialize;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};
use std::time::Duration;
use tauri::Emitter;
#[cfg(windows)]
use tauri::Manager;
use tauri_plugin_updater::{Update, UpdaterExt};

const FEED: &str = "https://raw.githubusercontent.com/Davi-Mascarenhas/entrelinhas/main/updates";

#[derive(Default)]
pub struct UpdateState {
    busy: AtomicBool,
    pending: Mutex<Option<Pending>>,
}
struct Pending {
    update: Update,
    #[cfg(windows)]
    bytes: Option<Vec<u8>>,
}
struct Operation<'a>(&'a AtomicBool);
impl Drop for Operation<'_> {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}
impl UpdateState {
    fn begin(&self) -> AppResult<Operation<'_>> {
        self.busy
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .map_err(|_| AppError::new("busy", "Já existe uma atualização em andamento."))?;
        Ok(Operation(&self.busy))
    }
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    version: String,
    notes: String,
    mode: &'static str,
    prerelease: bool,
}
#[derive(Clone, Serialize)]
pub struct Progress {
    received: u64,
    total: Option<u64>,
}

fn eligible(current: &Version, remote: &Version, stable_only: bool) -> bool {
    remote > current && (!stable_only || remote.pre.is_empty())
}
fn failure(error: impl std::fmt::Display) -> AppError {
    AppError::new(
        "update",
        format!("Não foi possível concluir a atualização: {error}"),
    )
}

#[tauri::command]
pub async fn check_update(
    app: tauri::AppHandle,
    state: tauri::State<'_, UpdateState>,
) -> AppResult<Option<UpdateInfo>> {
    let _operation = state.begin()?;
    *state.pending.lock().map_err(failure)? = None;
    let endpoints = vec![
        (format!("{FEED}/stable.json"), true),
        (format!("{FEED}/preview.json"), false),
    ];
    // Overrides existem somente no executável de testes, não no distribuído.
    #[cfg(any(debug_assertions, feature = "updater-test"))]
    let endpoints = if let Ok(endpoint) = std::env::var("ENTRELINHAS_UPDATER_TEST_ENDPOINT") {
        std::env::var("ENTRELINHAS_UPDATER_TEST_STABLE_ENDPOINT")
            .ok()
            .map(|stable| vec![(stable, true), (endpoint.clone(), false)])
            .unwrap_or_else(|| vec![(endpoint, false)])
    } else {
        endpoints
    };
    for (endpoint, stable_only) in endpoints {
        let builder = app
            .updater_builder()
            .timeout(Duration::from_secs(25))
            .version_comparator(move |current, remote| {
                eligible(&current, &remote.version, stable_only)
            });
        #[cfg(any(debug_assertions, feature = "updater-test"))]
        let builder = if std::env::var("ENTRELINHAS_UPDATER_TEST_ENDPOINT").is_ok() {
            builder.pubkey(std::env::var("ENTRELINHAS_UPDATER_TEST_PUBKEY").map_err(failure)?)
        } else {
            builder
        };
        let updater = builder
            .endpoints(vec![endpoint.parse().map_err(failure)?])
            .map_err(failure)?
            .target(if cfg!(windows) {
                "windows-x86_64"
            } else {
                "linux-x86_64"
            })
            .build()
            .map_err(failure)?;
        let Some(mut update) = updater.check().await.map_err(failure)? else {
            continue;
        };
        update.timeout = Some(Duration::from_secs(180));
        if update.download_url.scheme() != "https" {
            #[cfg(not(any(debug_assertions, feature = "updater-test")))]
            return Err(AppError::new(
                "update",
                "O pacote precisa usar uma conexão HTTPS.",
            ));
        }
        let info = UpdateInfo {
            prerelease: !Version::parse(&update.version)
                .map_err(failure)?
                .pre
                .is_empty(),
            version: update.version.clone(),
            notes: update.body.clone().unwrap_or_default(),
            mode: if cfg!(windows) { "install" } else { "package" },
        };
        *state.pending.lock().map_err(failure)? = Some(Pending {
            update,
            #[cfg(windows)]
            bytes: None,
        });
        return Ok(Some(info));
    }
    Ok(None)
}

#[tauri::command]
pub fn dismiss_update(state: tauri::State<'_, UpdateState>) -> AppResult<()> {
    let _operation = state.begin()?;
    *state.pending.lock().map_err(failure)? = None;
    Ok(())
}

#[tauri::command]
pub async fn download_update(
    app: tauri::AppHandle,
    state: tauri::State<'_, UpdateState>,
    path: Option<String>,
) -> AppResult<Option<String>> {
    let _operation = state.begin()?;
    let update = state
        .pending
        .lock()
        .map_err(failure)?
        .as_ref()
        .ok_or_else(|| AppError::new("update", "Procure uma atualização antes de baixar."))?
        .update
        .clone();
    #[cfg(not(windows))]
    let path = {
        let path = std::path::PathBuf::from(
            path.ok_or_else(|| AppError::new("update", "Escolha onde salvar o pacote."))?,
        );
        if path.extension().is_none_or(|extension| extension != "deb") || !path.is_absolute() {
            return Err(AppError::new(
                "update",
                "Escolha um caminho completo terminado em .deb.",
            ));
        }
        path
    };
    #[cfg(windows)]
    let _ = path;
    let mut received = 0;
    let bytes = update
        .download(
            |chunk, total| {
                received += chunk as u64;
                let _ = app.emit(
                    "entrelinhas://update-progress",
                    Progress { received, total },
                );
            },
            || {},
        )
        .await
        .map_err(failure)?;
    #[cfg(windows)]
    {
        state
            .pending
            .lock()
            .map_err(failure)?
            .as_mut()
            .unwrap()
            .bytes = Some(bytes);
        Ok(None)
    }
    #[cfg(not(windows))]
    {
        use std::io::Write;
        let result = tauri::async_runtime::spawn_blocking(move || -> AppResult<String> {
            let parent = path
                .parent()
                .ok_or_else(|| AppError::new("update", "Pasta inválida."))?;
            let mut temporary = tempfile::NamedTempFile::new_in(parent)?;
            temporary.write_all(&bytes)?;
            temporary.as_file().sync_all()?;
            temporary
                .persist(&path)
                .map_err(|error| AppError::from(error.error))?;
            Ok(path.to_string_lossy().into_owned())
        })
        .await
        .map_err(failure)??;
        Ok(Some(result))
    }
}

#[tauri::command]
pub fn install_update(
    app: tauri::AppHandle,
    state: tauri::State<'_, UpdateState>,
) -> AppResult<()> {
    let _operation = state.begin()?;
    #[cfg(windows)]
    {
        use tauri_plugin_window_state::{AppHandleExt, StateFlags};
        let data = app.state::<crate::AppState>();
        let _write_guard = data.write_lock.lock().map_err(failure)?;
        let pending = state.pending.lock().map_err(failure)?;
        let pending = pending
            .as_ref()
            .ok_or_else(|| AppError::new("update", "Procure uma atualização antes de instalar."))?;
        let bytes = pending
            .bytes
            .as_ref()
            .ok_or_else(|| AppError::new("update", "Baixe a atualização antes de instalar."))?;
        app.save_window_state(StateFlags::SIZE | StateFlags::MAXIMIZED | StateFlags::VISIBLE)
            .map_err(failure)?;
        pending.update.install(bytes).map_err(failure)
    }
    #[cfg(not(windows))]
    {
        let _ = app;
        Err(AppError::new(
            "update",
            "No Linux, instale o pacote .deb pelo sistema.",
        ))
    }
}

// Os arquivos reais são capturados em launch antes de construir o aplicativo.
// Reinícios abrem uma nota vazia. Não repassar argumentos de documentos ao NSIS,
// que faz outra interpretação de aspas e espaços na linha de comando.
#[cfg(any(windows, test))]
pub(crate) fn restart_environment(mut environment: tauri::Env) -> tauri::Env {
    environment.args_os.truncate(1);
    environment
}

#[cfg(test)]
mod tests {
    use super::*;
    fn v(value: &str) -> Version {
        Version::parse(value).unwrap()
    }
    #[test]
    fn versions_never_downgrade_and_stable_source_rejects_previews() {
        for stable_only in [false, true] {
            assert!(!eligible(&v("1.2.0"), &v("1.2.0"), stable_only));
            assert!(!eligible(&v("1.2.0"), &v("1.1.2"), stable_only));
            assert!(eligible(&v("1.2.0-rc.2"), &v("1.2.0"), stable_only));
        }
        assert!(!eligible(&v("1.2.0"), &v("1.3.0-rc.1"), true));
        assert!(eligible(&v("1.2.0"), &v("1.3.0-rc.1"), false));
        assert!(eligible(&v("1.2.0-rc.2"), &v("1.2.0-rc.3"), false));
    }
    #[test]
    fn operations_are_exclusive_and_release_after_errors() {
        let state = UpdateState::default();
        let first = state.begin().unwrap();
        assert!(state.begin().is_err());
        drop(first);
        assert!(state.begin().is_ok());
    }

    #[test]
    fn restart_does_not_replay_document_arguments() {
        let mut environment = tauri::Env::default();
        environment.args_os = [
            "entrelinhas.exe",
            "C:\\Textos\\Atualização com ação.md",
            "C:\\Textos\\日本語.txt",
        ]
        .into_iter()
        .map(Into::into)
        .collect();
        assert_eq!(
            restart_environment(environment).args_os,
            vec![std::ffi::OsString::from("entrelinhas.exe")]
        );
    }
}
