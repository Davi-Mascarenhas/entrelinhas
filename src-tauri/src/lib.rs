mod database;
mod files;
mod launch;
mod models;
mod rename;
mod system_integration;
mod updates;

use models::*;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager};

struct AppState {
    database: PathBuf,
    write_lock: Arc<Mutex<()>>,
}
#[tauri::command]
fn take_open_requests(
    state: tauri::State<'_, launch::IncomingFiles>,
) -> AppResult<Vec<launch::OpenRequest>> {
    state.take()
}
#[tauri::command]
async fn default_app_status() -> AppResult<system_integration::DefaultAppStatus> {
    blocking(system_integration::status).await
}
#[tauri::command]
async fn set_default_app() -> AppResult<system_integration::DefaultAppStatus> {
    blocking(system_integration::set_default).await
}
async fn blocking<T: Send + 'static>(
    operation: impl FnOnce() -> AppResult<T> + Send + 'static,
) -> AppResult<T> {
    tauri::async_runtime::spawn_blocking(operation)
        .await
        .map_err(|error| AppError::new("worker", error.to_string()))?
}
#[tauri::command]
async fn load_library(state: tauri::State<'_, AppState>) -> AppResult<Library> {
    let path = state.database.clone();
    blocking(move || database::library(&path)).await
}
#[tauri::command]
async fn save_preferences(
    state: tauri::State<'_, AppState>,
    preferences: serde_json::Value,
) -> AppResult<()> {
    let path = state.database.clone();
    blocking(move || database::preferences(&path, preferences)).await
}
#[tauri::command]
async fn read_document(state: tauri::State<'_, AppState>, path: String) -> AppResult<ReadResult> {
    let db = state.database.clone();
    blocking(move || {
        let read = files::read_document(&path)?;
        database::register(&db, std::path::Path::new(&read.path), None, false)?;
        Ok(read)
    })
    .await
}
#[tauri::command]
async fn save_document(
    state: tauri::State<'_, AppState>,
    request: SaveRequest,
) -> AppResult<SaveResult> {
    let db = state.database.clone();
    let lock = state.write_lock.clone();
    blocking(move || {
        let _guard = lock
            .lock()
            .map_err(|_| AppError::new("busy", "A gravação anterior não terminou corretamente."))?;
        let project = request.project_id.clone();
        let mut result = files::save_document(request)?;
        if let Err(error) = database::register(
            &db,
            std::path::Path::new(&result.path),
            project.as_deref(),
            true,
        ) {
            result.warning = Some(format!(
                "O arquivo foi salvo, mas não foi possível atualizar a biblioteca: {}",
                error.message
            ));
        }
        Ok(result)
    })
    .await
}
#[tauri::command]
async fn rename_document(
    state: tauri::State<'_, AppState>,
    path: String,
    title: String,
) -> AppResult<RenameResult> {
    let db = state.database.clone();
    let lock = state.write_lock.clone();
    blocking(move || {
        let _guard = lock
            .lock()
            .map_err(|_| AppError::new("busy", "A gravação anterior ainda não terminou."))?;
        rename::document(&db, &path, &title)
    })
    .await
}
#[tauri::command]
async fn read_image(document: String, source: String) -> AppResult<String> {
    blocking(move || files::read_image(&document, &source)).await
}
#[tauri::command]
async fn import_image(path: String) -> AppResult<String> {
    blocking(move || files::image_file(std::path::Path::new(&path))).await
}
#[tauri::command]
async fn upsert_project(state: tauri::State<'_, AppState>, project: Project) -> AppResult<()> {
    let db = state.database.clone();
    blocking(move || database::upsert_project(&db, project)).await
}
#[tauri::command]
async fn delete_project(state: tauri::State<'_, AppState>, id: String) -> AppResult<()> {
    let db = state.database.clone();
    blocking(move || database::delete_project(&db, &id)).await
}
#[tauri::command]
async fn associate_document(
    state: tauri::State<'_, AppState>,
    path: String,
    project_id: Option<String>,
) -> AppResult<()> {
    let db = state.database.clone();
    blocking(move || database::associate(&db, &path, project_id.as_deref())).await
}
#[tauri::command]
async fn forget_document(state: tauri::State<'_, AppState>, path: String) -> AppResult<()> {
    let db = state.database.clone();
    blocking(move || database::forget(&db, &path)).await
}
#[tauri::command]
async fn relocate_document(
    state: tauri::State<'_, AppState>,
    old_path: String,
    new_path: String,
) -> AppResult<()> {
    let db = state.database.clone();
    blocking(move || database::relocate(&db, &old_path, &new_path)).await
}
#[tauri::command]
async fn reorder_projects(state: tauri::State<'_, AppState>, ids: Vec<String>) -> AppResult<()> {
    let db = state.database.clone();
    blocking(move || database::reorder(&db, ids)).await
}
#[tauri::command]
async fn search_documents(
    state: tauri::State<'_, AppState>,
    query: String,
) -> AppResult<Vec<SearchResult>> {
    let db = state.database.clone();
    if query.chars().count() > 512 {
        return Err(AppError::new("invalid", "Pesquisa muito longa."));
    }
    blocking(move || database::search(&db, &query)).await
}

pub fn run() {
    let incoming = launch::IncomingFiles::default();
    incoming.enqueue(
        std::env::args_os().skip(1),
        &std::env::current_dir().unwrap_or_default(),
    );
    let sender = incoming.clone();
    let single_instance =
        tauri_plugin_single_instance::Builder::new().callback(move |app, arguments, cwd| {
            sender.enqueue(
                arguments.into_iter().skip(1).map(Into::into),
                std::path::Path::new(&cwd),
            );
            let _ = app.emit("entrelinhas://open-files", ());
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        });
    #[cfg(target_os = "linux")]
    let single_instance = single_instance.dbus_id(launch::instance_id());
    tauri::Builder::default()
        .manage(incoming)
        .manage(updates::UpdateState::default())
        .plugin(single_instance.build())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::SIZE
                        | tauri_plugin_window_state::StateFlags::MAXIMIZED
                        | tauri_plugin_window_state::StateFlags::VISIBLE,
                )
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let data = app.path().app_data_dir()?;
            app.manage(AppState {
                database: data.join("library.sqlite3"),
                write_lock: Arc::new(Mutex::new(())),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_library,
            take_open_requests,
            default_app_status,
            set_default_app,
            updates::check_update,
            updates::download_update,
            updates::install_update,
            save_preferences,
            read_document,
            save_document,
            rename_document,
            read_image,
            import_image,
            upsert_project,
            delete_project,
            associate_document,
            forget_document,
            relocate_document,
            reorder_projects,
            search_documents
        ])
        .run(tauri::generate_context!())
        .expect("Não foi possível iniciar o Entrelinhas");
}
