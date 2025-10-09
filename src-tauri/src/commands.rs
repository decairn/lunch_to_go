use tauri::State;

#[cfg(windows)]
use windows::{
    core::PWSTR,
    Win32::Foundation::ERROR_NOT_FOUND,
    Win32::Security::Credentials::{
        CredDeleteW, CredFree, CredReadW, CredWriteW, CREDENTIALW, CRED_FLAGS, CRED_PERSIST_LOCAL_MACHINE, CRED_TYPE_GENERIC,
    },
};

#[derive(Default)]
pub struct SecureCache;

const CREDENTIAL_TARGET: &str = "LunchToGo_API_Key";

#[cfg(windows)]
fn string_to_pwstr(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

#[tauri::command]
pub async fn store_api_key(_cache: State<'_, SecureCache>, api_key: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        log::info!("Storing API key in Windows Credential Locker");
        
        let target = string_to_pwstr(CREDENTIAL_TARGET);
        let api_key_bytes = api_key.as_bytes();
        
        let credential = CREDENTIALW {
            Flags: CRED_FLAGS(0),
            Type: CRED_TYPE_GENERIC,
            TargetName: PWSTR(target.as_ptr() as *mut u16),
            Comment: PWSTR::null(),
            LastWritten: Default::default(),
            CredentialBlobSize: api_key_bytes.len() as u32,
            CredentialBlob: api_key_bytes.as_ptr() as *mut u8,
            Persist: CRED_PERSIST_LOCAL_MACHINE,
            AttributeCount: 0,
            Attributes: std::ptr::null_mut(),
            TargetAlias: PWSTR::null(),
            UserName: PWSTR::null(),
        };

        unsafe {
            match CredWriteW(&credential, 0) {
                Ok(_) => {
                    log::info!("Successfully stored API key in Windows Credential Locker");
                    Ok(())
                }
                Err(e) => {
                    let error_msg = format!("Failed to store API key in Windows Credential Locker: {}", e);
                    log::error!("{}", error_msg);
                    Err(error_msg)
                }
            }
        }
    }
    
    #[cfg(not(windows))]
    {
        log::warn!("Windows Credential Locker not available on this platform; skipping store_api_key call");
        Err("Windows Credential Locker not available on this platform".to_string())
    }
}

#[tauri::command]
pub async fn read_api_key(_cache: State<'_, SecureCache>) -> Result<Option<String>, String> {
    #[cfg(windows)]
    {
        log::info!("Reading API key from Windows Credential Locker");
        
        let target = string_to_pwstr(CREDENTIAL_TARGET);
        let mut credential: *mut CREDENTIALW = std::ptr::null_mut();

        unsafe {
            match CredReadW(
                PWSTR(target.as_ptr() as *mut u16),
                CRED_TYPE_GENERIC,
                0,
                &mut credential,
            ) {
                Ok(_) => {
                    if credential.is_null() {
                        log::info!("No API key found in Windows Credential Locker");
                        return Ok(None);
                    }
                    
                    let cred = &*credential;
                    let api_key_bytes = std::slice::from_raw_parts(
                        cred.CredentialBlob,
                        cred.CredentialBlobSize as usize,
                    );
                    
                    let api_key = String::from_utf8(api_key_bytes.to_vec())
                        .map_err(|e| format!("Failed to decode API key from UTF-8: {}", e))?;
                    
                    // Free the credential memory
                    CredFree(credential as *const _ as *const _);
                    
                    log::info!("Successfully retrieved API key from Windows Credential Locker");
                    Ok(Some(api_key))
                }
                Err(e) => {
                    let error_code = e.code().0;
                    if error_code == ERROR_NOT_FOUND.0 as i32 {
                        log::info!("No API key found in Windows Credential Locker");
                        Ok(None)
                    } else {
                        let error_msg = format!("Failed to read API key from Windows Credential Locker: {}", e);
                        log::error!("{}", error_msg);
                        Err(error_msg)
                    }
                }
            }
        }
    }
    
    #[cfg(not(windows))]
    {
        log::warn!("Windows Credential Locker not available on this platform; returning None");
        Ok(None)
    }
}

#[tauri::command]
pub async fn delete_api_key(_cache: State<'_, SecureCache>) -> Result<(), String> {
    #[cfg(windows)]
    {
        log::info!("Deleting API key from Windows Credential Locker");
        
        let target = string_to_pwstr(CREDENTIAL_TARGET);

        unsafe {
            match CredDeleteW(
                PWSTR(target.as_ptr() as *mut u16),
                CRED_TYPE_GENERIC,
                0,
            ) {
                Ok(_) => {
                    log::info!("Successfully deleted API key from Windows Credential Locker");
                    Ok(())
                }
                Err(e) => {
                    let error_code = e.code().0;
                    if error_code == ERROR_NOT_FOUND.0 as i32 {
                        log::info!("No API key found to delete in Windows Credential Locker");
                        Ok(()) // Consider it successful if there's nothing to delete
                    } else {
                        let error_msg = format!("Failed to delete API key from Windows Credential Locker: {}", e);
                        log::error!("{}", error_msg);
                        Err(error_msg)
                    }
                }
            }
        }
    }
    
    #[cfg(not(windows))]
    {
        log::warn!("Windows Credential Locker not available on this platform; skipping delete_api_key call");
        Err("Windows Credential Locker not available on this platform".to_string())
    }
}
