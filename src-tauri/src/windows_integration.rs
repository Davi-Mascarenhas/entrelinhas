use super::*;
use std::ptr::{null, null_mut};
use windows_sys::Win32::{
    Foundation::ERROR_SUCCESS,
    System::Registry::{
        RegCloseKey, RegGetValueW, RegOpenKeyExW, HKEY_CURRENT_USER, KEY_READ, RRF_RT_REG_SZ,
    },
    UI::{
        Shell::{AssocQueryStringW, ShellExecuteW, ASSOCF_NONE, ASSOCSTR_PROGID},
        WindowsAndMessaging::SW_SHOWNORMAL,
    },
};

fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(Some(0)).collect()
}

fn registered() -> bool {
    let key_name = wide("Software\\RegisteredApplications");
    let value_name = wide("Entrelinhas");
    let mut key = null_mut();
    // Apenas consulta a inscrição criada pelo instalador no perfil atual.
    unsafe {
        if RegOpenKeyExW(HKEY_CURRENT_USER, key_name.as_ptr(), 0, KEY_READ, &mut key)
            != ERROR_SUCCESS
        {
            return false;
        }
        let mut value = [0u16; 256];
        let mut size = std::mem::size_of_val(&value) as u32;
        let result = RegGetValueW(
            key,
            null(),
            value_name.as_ptr(),
            RRF_RT_REG_SZ,
            null_mut(),
            value.as_mut_ptr().cast(),
            &mut size,
        );
        RegCloseKey(key);
        result == ERROR_SUCCESS
            && String::from_utf16_lossy(
                &value[..value.iter().position(|&c| c == 0).unwrap_or(value.len())],
            ) == "Software\\Entrelinhas\\Capabilities"
    }
}

fn is_default(extension: &str, expected: &str) -> bool {
    let extension = wide(extension);
    let mut value = vec![0u16; 32768];
    let mut length = value.len() as u32;
    let result = unsafe {
        AssocQueryStringW(
            ASSOCF_NONE,
            ASSOCSTR_PROGID,
            extension.as_ptr(),
            null(),
            value.as_mut_ptr(),
            &mut length,
        )
    };
    result == 0
        && String::from_utf16_lossy(
            &value[..value.iter().position(|&c| c == 0).unwrap_or(value.len())],
        )
        .eq_ignore_ascii_case(expected)
}

pub fn status() -> AppResult<DefaultAppStatus> {
    Ok(DefaultAppStatus {
        supported: true,
        registered: registered(),
        markdown: is_default(".md", "Entrelinhas.Markdown")
            && is_default(".markdown", "Entrelinhas.Markdown"),
        text: is_default(".txt", "Entrelinhas.Text"),
        requires_settings: true,
    })
}

pub fn set_default() -> AppResult<DefaultAppStatus> {
    if !registered() {
        return Err(AppError::new(
            "not_installed",
            "Instale o Entrelinhas antes de escolhê-lo como padrão.",
        ));
    }
    let verb = wide("open");
    let uri = wide("ms-settings:defaultapps?registeredAppUser=Entrelinhas");
    let result = unsafe {
        ShellExecuteW(
            null_mut(),
            verb.as_ptr(),
            uri.as_ptr(),
            null(),
            null(),
            SW_SHOWNORMAL,
        )
    };
    if result as isize <= 32 {
        return Err(AppError::new("association", "Não foi possível abrir as configurações do Windows. Abra Configurações → Aplicativos → Aplicativos padrão."));
    }
    // Abrir a tela não significa que o usuário confirmou uma associação.
    status()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn querying_windows_defaults_is_read_only_and_requests_system_selection() {
        let result = status().unwrap();
        assert!(result.supported && result.requires_settings);
        assert_eq!(wide("ação 日本語").last(), Some(&0));
    }
}
