use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};

const RESPONSE: &str = "HTTP/1.1 410 GONE\r\nContent-Type: application/json; charset=utf-8\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\n\r\n{\"error\":\"The legacy Rust backend is retired. Use the serverless /api/rust API.\"}";

fn main() {
    let listener = TcpListener::bind("0.0.0.0:8080").expect("failed to bind legacy backend port");
    for stream in listener.incoming().flatten() {
        handle_client(stream);
    }
}

fn handle_client(mut stream: TcpStream) {
    let mut buffer = [0; 1024];
    let _ = stream.read(&mut buffer);
    let _ = stream.write_all(RESPONSE.as_bytes());
}
