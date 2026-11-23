use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LanguageBootstrap {
    platform: &'static str,
    installer_language: Option<&'static str>,
}

#[cfg(any(windows, test))]
fn from_lcid(value: u32) -> Option<&'static str> {
    match value {
        1046 => Some("pt-BR"),
        2070 => Some("pt-PT"),
        1033 => Some("en"),
        1041 => Some("ja"),
        2052 => Some("zh-CN"),
        1028 => Some("zh-TW"),
        1031 => Some("de"),
        1034 => Some("es-ES"),
        // Nosso seletor usa os recursos SpanishInternational para a opção
        // Latinoamérica. O valor é a escolha do instalador, não o idioma do SO.
        3082 => Some("es-419"),
        _ => None,
    }
}

#[cfg(windows)]
fn installer_language() -> Option<&'static str> {
    use windows_sys::Win32::{
        Foundation::ERROR_SUCCESS,
        System::Registry::{RegGetValueW, HKEY_CURRENT_USER, RRF_RT_REG_DWORD},
    };
    let key: Vec<u16> = "Software\\Entrelinhas"
        .encode_utf16()
        .chain(Some(0))
        .collect();
    let name: Vec<u16> = "InstallerLanguage".encode_utf16().chain(Some(0)).collect();
    let mut value: u32 = 0;
    let mut size = std::mem::size_of::<u32>() as u32;
    // Apenas lê a escolha do instalador do usuário atual; não consulta a rede.
    let result = unsafe {
        RegGetValueW(
            HKEY_CURRENT_USER,
            key.as_ptr(),
            name.as_ptr(),
            RRF_RT_REG_DWORD,
            std::ptr::null_mut(),
            (&mut value as *mut u32).cast(),
            &mut size,
        )
    };
    if result == ERROR_SUCCESS {
        from_lcid(value)
    } else {
        None
    }
}

#[tauri::command]
pub fn language_bootstrap() -> LanguageBootstrap {
    LanguageBootstrap {
        platform: std::env::consts::OS,
        #[cfg(windows)]
        installer_language: installer_language(),
        #[cfg(not(windows))]
        installer_language: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn installer_languages_are_explicit_and_bounded() {
        for (lcid, language) in [
            (1046, "pt-BR"),
            (1033, "en"),
            (1041, "ja"),
            (2052, "zh-CN"),
            (1031, "de"),
            (2070, "pt-PT"),
            (1034, "es-ES"),
            (3082, "es-419"),
            (1028, "zh-TW"),
        ] {
            assert_eq!(from_lcid(lcid), Some(language));
        }
        assert_eq!(from_lcid(9999), None);
        assert_eq!(from_lcid(0), None);
    }
}
