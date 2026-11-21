use crate::{database, models::*};
use rusqlite::{params, TransactionBehavior};
use std::path::{Path, PathBuf};

fn destination(source: &Path, title: &str) -> AppResult<PathBuf> {
    let title = title.trim();
    if title.is_empty()
        || [".", ".."].contains(&title)
        || title.len() > 240
        || title
            .chars()
            .any(|c| c.is_control() || c == '/' || c == '\\')
    {
        return Err(AppError::new(
            "invalid",
            "Escolha um título válido, sem barras e com um nome mais curto.",
        ));
    }
    let extension = source
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or_default();
    if !["md", "markdown", "txt"].contains(&extension.to_ascii_lowercase().as_str()) {
        return Err(AppError::new(
            "format",
            "O documento deve ser Markdown ou TXT.",
        ));
    }
    Ok(source.with_file_name(format!("{title}.{extension}")))
}

fn move_without_overwrite(source: &Path, target: &Path) -> AppResult<()> {
    #[cfg(target_os = "linux")]
    let result = rustix::fs::renameat_with(
        rustix::fs::CWD,
        source,
        rustix::fs::CWD,
        target,
        rustix::fs::RenameFlags::NOREPLACE,
    )
    .map_err(std::io::Error::from);
    #[cfg(windows)]
    let result = {
        use std::os::windows::ffi::OsStrExt;
        let source: Vec<u16> = source.as_os_str().encode_wide().chain(Some(0)).collect();
        let target: Vec<u16> = target.as_os_str().encode_wide().chain(Some(0)).collect();
        // Sem MOVEFILE_REPLACE_EXISTING: preserva outro arquivo e funciona sem hard links.
        if unsafe {
            windows_sys::Win32::Storage::FileSystem::MoveFileExW(
                source.as_ptr(),
                target.as_ptr(),
                0,
            )
        } == 0
        {
            Err(std::io::Error::last_os_error())
        } else {
            Ok(())
        }
    };
    #[cfg(not(any(target_os = "linux", windows)))]
    let result = std::fs::hard_link(source, target).and_then(|()| {
        std::fs::remove_file(source).inspect_err(|_| {
            let _ = std::fs::remove_file(target);
        })
    });
    result.map_err(|error| {
        if error.kind() == std::io::ErrorKind::AlreadyExists {
            AppError::new(
                "duplicate",
                "Já existe um arquivo com esse título nesta pasta.",
            )
        } else {
            error.into()
        }
    })
}

pub fn document(database: &Path, value: &str, title: &str) -> AppResult<RenameResult> {
    let source = PathBuf::from(value);
    if !source.is_absolute() || !std::fs::symlink_metadata(&source)?.is_file() {
        return Err(AppError::new(
            "invalid",
            "Reabra o documento antes de renomear esse caminho.",
        ));
    }
    let source = source.canonicalize()?;
    let target = destination(&source, title)?;
    let result = RenameResult {
        path: target.to_string_lossy().into_owned(),
        title: target
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned(),
    };
    if source == target {
        return Ok(result);
    }
    let mut connection = database::connect(database)?;
    let transaction = connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let duplicate: bool = transaction.query_row(
        "SELECT EXISTS(SELECT 1 FROM documents WHERE path=?1)",
        [target.to_string_lossy()],
        |row| row.get(0),
    )?;
    if duplicate {
        return Err(AppError::new(
            "duplicate",
            "Já existe uma referência a esse nome na biblioteca. Escolha outro título.",
        ));
    }
    move_without_overwrite(&source, &target)?;
    let update = (|| -> AppResult<()> {
        let changed = transaction.execute(
            "UPDATE documents SET path=?1,title=?2,updated_at=unixepoch() WHERE path=?3",
            params![result.path, result.title, source.to_string_lossy()],
        )?;
        if changed != 1 {
            return Err(AppError::new(
                "missing",
                "Salve o documento para registrar seu caminho antes de renomear.",
            ));
        }
        transaction.commit()?;
        Ok(())
    })();
    if let Err(error) = update {
        if let Err(rollback) = move_without_overwrite(&target, &source) {
            return Err(AppError::new("rename", format!("O arquivo está em {}. Não foi possível atualizar a biblioteca nem voltar ao nome anterior: {} / {}", target.display(), error.message, rollback.message)));
        }
        return Err(error);
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn renames_without_changing_saved_content_images_or_project() {
        let directory = tempfile::tempdir().unwrap();
        let db = directory.path().join("library.sqlite3");
        let source = directory.path().join("Nota.markdown");
        let assets = directory.path().join("Nota.assets");
        fs::create_dir(&assets).unwrap();
        fs::write(assets.join("imagem.png"), b"imagem").unwrap();
        let content = "Ideia 日本語\n![foto](Nota.assets/imagem.png)";
        fs::write(&source, content).unwrap();
        database::upsert_project(
            &db,
            Project {
                id: "p".into(),
                name: "Ideias".into(),
                color: "#61755b".into(),
                icon: "".into(),
                position: 0,
            },
        )
        .unwrap();
        database::register(&db, &source, Some("p"), true).unwrap();
        let result = document(&db, source.to_str().unwrap(), "Título novo 日本語").unwrap();
        assert!(!source.exists());
        assert_eq!(fs::read_to_string(&result.path).unwrap(), content);
        assert!(assets.join("imagem.png").exists());
        let docs = database::library(&db).unwrap().documents;
        assert_eq!(docs.len(), 1);
        assert_eq!(docs[0].path, result.path);
        assert_eq!(docs[0].project_id.as_deref(), Some("p"));
        assert_eq!(result.title, "Título novo 日本語.markdown");
    }

    #[test]
    fn rejects_invalid_names_and_existing_files_without_overwriting() {
        let directory = tempfile::tempdir().unwrap();
        let db = directory.path().join("library.sqlite3");
        let source = directory.path().join("Nota.txt");
        fs::write(&source, "original").unwrap();
        database::register(&db, &source, None, false).unwrap();
        let target = directory.path().join("Ocupado.txt");
        fs::write(&target, "preservado").unwrap();
        assert!(document(&db, source.to_str().unwrap(), "Ocupado").is_err());
        for title in [
            "",
            "..",
            "../outra pasta",
            "a/b",
            "a\\b",
            "nome\0inválido",
            &"日".repeat(81),
        ] {
            assert!(document(&db, source.to_str().unwrap(), title).is_err());
        }
        assert_eq!(fs::read_to_string(source).unwrap(), "original");
        assert_eq!(fs::read_to_string(target).unwrap(), "preservado");
    }

    #[test]
    fn rolls_back_if_the_document_is_not_registered() {
        let directory = tempfile::tempdir().unwrap();
        let db = directory.path().join("library.sqlite3");
        let source = directory.path().join("Original.md");
        fs::write(&source, "conteúdo").unwrap();
        assert!(document(&db, source.to_str().unwrap(), "Novo").is_err());
        assert_eq!(fs::read_to_string(source).unwrap(), "conteúdo");
        assert!(!directory.path().join("Novo.md").exists());
    }
}
