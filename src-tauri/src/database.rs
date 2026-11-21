use crate::models::*;
use rusqlite::{params, Connection, OptionalExtension};
use std::path::{Path, PathBuf};

pub fn connect(path: &Path) -> AppResult<Connection> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let connection = Connection::open(path)?;
    connection.busy_timeout(std::time::Duration::from_secs(5))?;
    connection.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL, icon TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS documents(path TEXT PRIMARY KEY, title TEXT NOT NULL, project_id TEXT REFERENCES projects(id) ON DELETE SET NULL, updated_at INTEGER NOT NULL DEFAULT (unixepoch()));
        CREATE TABLE IF NOT EXISTS preferences(key TEXT PRIMARY KEY, value TEXT NOT NULL);
        PRAGMA user_version=1;")?;
    Ok(connection)
}

pub fn library(path: &Path) -> AppResult<Library> {
    let connection = connect(path)?;
    let mut projects = connection
        .prepare("SELECT id,name,color,icon,position FROM projects ORDER BY position,name")?;
    let projects = projects
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                icon: row.get(3)?,
                position: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    let documents = documents(&connection)?;
    let settings: Option<String> = connection
        .query_row(
            "SELECT value FROM preferences WHERE key='settings'",
            [],
            |row| row.get(0),
        )
        .optional()?;
    let preferences = settings
        .and_then(|value| serde_json::from_str(&value).ok())
        .unwrap_or(serde_json::json!({}));
    Ok(Library {
        projects,
        documents,
        preferences,
    })
}

fn documents(connection: &Connection) -> AppResult<Vec<RegisteredDocument>> {
    let mut query = connection.prepare(
        "SELECT path,title,project_id,updated_at FROM documents ORDER BY updated_at DESC,title",
    )?;
    let rows = query
        .query_map([], |row| {
            Ok(RegisteredDocument {
                path: row.get(0)?,
                title: row.get(1)?,
                project_id: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn preferences(path: &Path, value: serde_json::Value) -> AppResult<()> {
    // Apenas opções conhecidas podem entrar no banco; nunca recebemos abas ou texto.
    let allowed = [
        "language",
        "languageChosen",
        "theme",
        "themeChosen",
        "onboardingCompleted",
        "cursor",
        "autoImmersive",
        "askBeforeDiscard",
        "defaultFormat",
        "fontFamily",
        "fontSize",
        "lineHeight",
        "zoom",
        "editorWidth",
        "sidebarSide",
        "sidebarWidth",
        "sidebarVisible",
        "tabsPosition",
        "spellcheck",
        "selectionTools",
        "shortcuts",
    ];
    let Some(object) = value.as_object() else {
        return Err(AppError::new("invalid", "Preferências inválidas."));
    };
    let mut clean = serde_json::Map::new();
    for key in allowed {
        if let Some(value) = object.get(key) {
            clean.insert(key.into(), value.clone());
        }
    }
    let serialized = serde_json::Value::Object(clean).to_string();
    if serialized.len() > 8192 {
        return Err(AppError::new("invalid", "Preferências muito grandes."));
    }
    connect(path)?.execute("INSERT INTO preferences(key,value) VALUES('settings',?1) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [serialized])?;
    Ok(())
}

pub fn upsert_project(path: &Path, project: Project) -> AppResult<()> {
    if project.name.trim().is_empty()
        || project.name.chars().count() > 120
        || project.id.len() > 100
        || project.icon.chars().count() > 4
        || project.color.len() != 7
        || !project.color.starts_with('#')
        || !project.color[1..].chars().all(|c| c.is_ascii_hexdigit())
    {
        return Err(AppError::new(
            "invalid",
            "Nome, ícone ou cor do projeto inválidos.",
        ));
    }
    connect(path)?.execute("INSERT INTO projects(id,name,color,icon,position) VALUES(?1,?2,?3,?4,?5) ON CONFLICT(id) DO UPDATE SET name=excluded.name,color=excluded.color,icon=excluded.icon,position=excluded.position", params![project.id, project.name.trim(), project.color, project.icon, project.position])?;
    Ok(())
}

pub fn delete_project(path: &Path, id: &str) -> AppResult<()> {
    connect(path)?.execute("DELETE FROM projects WHERE id=?1", [id])?;
    Ok(())
}

pub fn register(
    path: &Path,
    document: &Path,
    project_id: Option<&str>,
    replace_project: bool,
) -> AppResult<()> {
    let canonical = document.canonicalize()?;
    if !canonical.is_file() {
        return Err(AppError::new("invalid", "O documento não é um arquivo."));
    }
    let title = canonical.file_name().unwrap_or_default().to_string_lossy();
    let connection = connect(path)?;
    connection.execute("INSERT INTO documents(path,title,project_id) VALUES(?1,?2,?3) ON CONFLICT(path) DO UPDATE SET title=excluded.title,updated_at=unixepoch(),project_id=CASE WHEN ?4 THEN excluded.project_id ELSE documents.project_id END", params![canonical.to_string_lossy(), title, project_id, replace_project])?;
    Ok(())
}

pub fn associate(path: &Path, document: &str, project_id: Option<&str>) -> AppResult<()> {
    let changed = connect(path)?.execute(
        "UPDATE documents SET project_id=?1 WHERE path=?2",
        params![project_id, document],
    )?;
    if changed == 0 {
        return Err(AppError::new(
            "missing",
            "Salve o documento antes de associá-lo.",
        ));
    }
    Ok(())
}

pub fn forget(path: &Path, document: &str) -> AppResult<()> {
    connect(path)?.execute("DELETE FROM documents WHERE path=?1", [document])?;
    Ok(())
}

pub fn relocate(path: &Path, old_path: &str, new_path: &str) -> AppResult<()> {
    let new_path = PathBuf::from(new_path).canonicalize()?;
    let mut connection = connect(path)?;
    let transaction = connection.transaction()?;
    let duplicate: bool = transaction.query_row(
        "SELECT EXISTS(SELECT 1 FROM documents WHERE path=?1)",
        [new_path.to_string_lossy()],
        |row| row.get(0),
    )?;
    if duplicate {
        return Err(AppError::new(
            "duplicate",
            "Este caminho já está registrado. Remova a associação antiga ou escolha outro arquivo.",
        ));
    }
    let changed = transaction.execute(
        "UPDATE documents SET path=?1,title=?2 WHERE path=?3",
        params![
            new_path.to_string_lossy(),
            new_path.file_name().unwrap_or_default().to_string_lossy(),
            old_path
        ],
    )?;
    if changed == 0 {
        return Err(AppError::new(
            "missing",
            "Esta referência não está mais na biblioteca. Abra o arquivo pelo seu novo local.",
        ));
    }
    transaction.commit()?;
    Ok(())
}

pub fn reorder(path: &Path, ids: Vec<String>) -> AppResult<()> {
    let mut connection = connect(path)?;
    let transaction = connection.transaction()?;
    for (index, id) in ids.iter().enumerate() {
        transaction.execute(
            "UPDATE projects SET position=?1 WHERE id=?2",
            params![index as i64, id],
        )?;
    }
    transaction.commit()?;
    Ok(())
}

pub fn search(path: &Path, query: &str) -> AppResult<Vec<SearchResult>> {
    let connection = connect(path)?;
    let query = query.trim().to_lowercase();
    let mut results = Vec::new();
    for document in documents(&connection)? {
        let title_match = document.title.to_lowercase().contains(&query);
        match crate::files::read_document(&document.path) {
            Ok(read) => {
                let lower = read.content.to_lowercase();
                if title_match || lower.contains(&query) {
                    let excerpt = read
                        .content
                        .lines()
                        .find(|line| line.to_lowercase().contains(&query))
                        .unwrap_or("")
                        .chars()
                        .take(180)
                        .collect();
                    results.push(SearchResult {
                        path: document.path,
                        title: document.title,
                        excerpt,
                        missing: false,
                        error: None,
                    });
                }
            }
            Err(error) if title_match => results.push(SearchResult {
                path: document.path,
                title: document.title,
                excerpt: String::new(),
                missing: error.code == "missing",
                error: Some(error.message),
            }),
            Err(_) => {}
        }
        if results.len() >= 100 {
            break;
        }
    }
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn projects_keep_external_files_and_no_drafts() {
        let directory = tempfile::tempdir().unwrap();
        let db = directory.path().join("xdg/library.sqlite3");
        let downloads = directory.path().join("Downloads");
        std::fs::create_dir(&downloads).unwrap();
        let note = downloads.join("alemão e 日本語.md");
        std::fs::write(&note, "# Olá").unwrap();
        upsert_project(
            &db,
            Project {
                id: "escola".into(),
                name: "Escola".into(),
                color: "#61755b".into(),
                icon: "📖".into(),
                position: 0,
            },
        )
        .unwrap();
        register(&db, &note, Some("escola"), true).unwrap();
        preferences(
            &db,
            serde_json::json!({"theme":"sepia","themeChosen":true,"onboardingCompleted":false,"draft":"NUNCA SALVAR ESTE TEXTO"}),
        )
        .unwrap();
        let reopened = library(&db).unwrap();
        assert_eq!(reopened.projects.len(), 1);
        assert_eq!(
            reopened.documents[0].path,
            note.canonicalize().unwrap().to_string_lossy()
        );
        assert_eq!(reopened.documents[0].project_id.as_deref(), Some("escola"));
        assert_eq!(reopened.preferences["theme"], "sepia");
        assert_eq!(reopened.preferences["themeChosen"], true);
        assert_eq!(reopened.preferences["onboardingCompleted"], false);
        assert!(reopened.preferences.get("draft").is_none());
        delete_project(&db, "escola").unwrap();
        assert!(note.exists());
        assert!(library(&db).unwrap().documents[0].project_id.is_none());
        forget(&db, &reopened.documents[0].path).unwrap();
        assert!(note.exists());
        assert!(library(&db).unwrap().documents.is_empty());
    }
    #[test]
    fn relocation_and_search_use_real_files() {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("library.sqlite3");
        let old = dir.path().join("antigo.md");
        let new = dir.path().join("novo.md");
        std::fs::write(&old, "uma palavra rara: jabuticaba").unwrap();
        register(&db, &old, None, false).unwrap();
        let registered = library(&db).unwrap().documents[0].path.clone();
        std::fs::rename(&old, &new).unwrap();
        assert!(search(&db, "antigo").unwrap()[0].missing);
        relocate(&db, &registered, &new.to_string_lossy()).unwrap();
        assert_eq!(search(&db, "jabuticaba").unwrap().len(), 1);
        assert!(new.exists());
    }

    #[test]
    fn relocating_a_stale_reference_does_not_report_success() {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("library.sqlite3");
        let new = dir.path().join("novo.md");
        std::fs::write(&new, "preservado").unwrap();
        assert_eq!(
            relocate(&db, "referência ausente.md", &new.to_string_lossy())
                .unwrap_err()
                .code,
            "missing"
        );
        assert!(library(&db).unwrap().documents.is_empty());
        assert_eq!(std::fs::read_to_string(&new).unwrap(), "preservado");
    }
}
