#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

mod commands;
mod db;
mod api; // 导入user模块
mod websocket; // 新增 websocket 模块
mod consoleLog; // 新增 log 模块

use db::establish_connection;
use migration::{Migrator, MigratorTrait};
use service::sea_orm::DatabaseConnection;
use tauri_plugin_log::LogTarget;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AppState {
    db_conn: DatabaseConnection,
}

#[cfg(debug_assertions)]
const LOG_TARGETS: [LogTarget; 2] = [LogTarget::LogDir, LogTarget::Stdout];

#[cfg(not(debug_assertions))]
const LOG_TARGETS: [LogTarget; 1] = [LogTarget::LogDir];

#[tokio::main]
async fn main() {
    // establish conn
    let db_conn = establish_connection().await;
    // run migrations
    Migrator::up(&db_conn, None).await.unwrap();
    // Shared state for WebSocket connection
    let websocket_state = Arc::new(Mutex::new(websocket::WebSocketState::default()));
    //
    tauri::Builder::default()
        .manage(AppState { db_conn })
        .manage(websocket_state.clone())
        .plugin(
            tauri_plugin_log::Builder::default()
                .targets(LOG_TARGETS)
                .level_for("tauri", log::LevelFilter::Error)
                .level_for("hyper", log::LevelFilter::Off)
                .level_for("tracing", log::LevelFilter::Off)
                .level_for("sea_orm", log::LevelFilter::Off)
                .level_for("sqlx", log::LevelFilter::Off)
                .level_for("tao", log::LevelFilter::Off)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            //
            // products
            //
            commands::products::list_products,
            commands::products::search_products,
            commands::products::create_product,
            commands::products::update_product,
            commands::products::delete_product,
            //
            // inventory
            //
            commands::inventory::list_inventory,
            commands::inventory::create_inventory,
            commands::inventory::update_inventory,
            commands::inventory::delete_inventory,
            //
            // clients
            //
            commands::clients::list_clients,
            commands::clients::search_clients,
            commands::clients::create_client,
            commands::clients::update_client,
            commands::clients::delete_client,
            //
            // suppliers
            //
            commands::suppliers::list_suppliers,
            commands::suppliers::search_suppliers,
            commands::suppliers::create_supplier,
            commands::suppliers::update_supplier,
            commands::suppliers::delete_supplier,
            //
            // orders
            //
            commands::orders::list_orders,
            commands::orders::get_order,
            commands::orders::get_order_details,
            commands::orders::create_order,
            commands::orders::update_order,
            commands::orders::delete_order,
            commands::orders::list_order_products,
            //
            // order items
            //
            commands::order_items::create_order_item,
            commands::order_items::update_order_item,
            commands::order_items::delete_order_item,
            //
            // quotes
            //
            commands::quotes::list_quotes,
            commands::quotes::get_quote,
            commands::quotes::get_quote_details,
            commands::quotes::create_quote,
            commands::quotes::update_quote,
            commands::quotes::delete_quote,
            commands::quotes::list_quote_products,
            //
            // quote items
            //
            commands::quote_items::create_quote_item,
            commands::quote_items::update_quote_item,
            commands::quote_items::delete_quote_item,
            //
            // invoices
            //
            commands::invoices::list_invoices,
            commands::invoices::get_invoice,
            commands::invoices::get_invoice_details,
            commands::invoices::create_invoice,
            commands::invoices::update_invoice,
            commands::invoices::delete_invoice,
            commands::invoices::list_invoice_products,
            //
            // invoice items
            //
            commands::invoice_items::create_invoice_item,
            commands::invoice_items::update_invoice_item,
            commands::invoice_items::delete_invoice_item,
            //
            // dashboard
            //
            commands::dashboard::list_mvm_stats,
            commands::dashboard::list_top_clients,
            commands::dashboard::list_top_suppliers,
            commands::dashboard::list_top_products,
            commands::dashboard::list_status_count,
            commands::dashboard::list_revenue,
            commands::dashboard::list_expenses,

            // 登录
            api::api_request,
            websocket::start_websocket_connection,
            websocket::send_websocket_message,
            websocket::close_websocket_connection,
            consoleLog::log_message,

        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
