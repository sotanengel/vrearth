// vrearth-wasm — WASM bindings
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn hello() -> String {
    "vrearth-wasm".to_string()
}
