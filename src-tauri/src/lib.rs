mod commands;

use commands::SecureCache;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(SecureCache::default())
    .setup(|app| {
      
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::store_api_key,
      commands::read_api_key,
      commands::delete_api_key
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
