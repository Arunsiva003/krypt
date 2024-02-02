use postgres::{Client, NoTls};
use std::net::{TcpListener, TcpStream};
use std::io::{Read, Write};

#[macro_use]
extern crate serde_derive;

#[derive(Serialize, Deserialize)]
#[derive(Debug)]
struct User {
    id: Option<i32>,
    firstname: String,
    lastname: String,
    username: String,
    email: String,
    password: String,
}

const DB_URL: &str = "postgresql://uu09n2xc646nt4vczmt7:bTb9GyWabKOZ5h499cnEeIZXMSzt8x@b3ix8fekyxlm55qvgxtk-postgresql.services.clever-cloud.com:50013/b3ix8fekyxlm55qvgxtk";
const OK_RESPONSE: &str = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods:POST, GET, PUT, DELETE\r\nAccess-Control-Allow-Headers: Content-Type\r\n\r\n";
const NOT_FOUND: &str = "HTTP/1.1 404 NOT FOUND\r\n\r\n";
const INTERNAL_ERROR: &str = "HTTP/1.1 500 INTERNAL ERROR\r\n\r\n";

fn main() {
    if let Err(x) = set_database() {
        println!("{}", x);
        println!("Error setting database");
        return;
    }

    let listener = TcpListener::bind(format!("0.0.0.0:8080")).unwrap();
    println!("Server listening on port 8080");

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                println!("stream  listening");
                handle_client(stream);
            }
            Err(e) => {
                println!("Unable to connect: {}", e);
            }
        }
    }
}

fn set_database() -> Result<(), postgres::Error> {
    let mut client = Client::connect(DB_URL, NoTls)?;
    client.batch_execute(
        "
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            firstname VARCHAR NOT NULL,
            lastname VARCHAR NOT NULL,
            username VARCHAR NOT NULL,
            email VARCHAR NOT NULL,
            password VARCHAR NOT NULL
        )
    ",
    )?;
    Ok(())
}

fn handle_client(mut stream: TcpStream) {
    let mut buffer = [0; 1024];
    let mut request = String::new();
    println!("request: {}",request);
    match stream.read(&mut buffer) {
        Ok(size) => {
            request.push_str(String::from_utf8_lossy(&buffer[..size]).as_ref());
            println!("upd request: {}",request);
            
            let (status_line, content) = match &*request {
                r if r.starts_with("OPTIONS ") => (OK_RESPONSE.to_string(), "".to_string()),
                r if r.starts_with("POST /api/rust/users/login") => handle_login_request(r),
                r if r.starts_with("GET /api/rust/users") => handle_get_all_request(r),
                r if r.starts_with("POST /api/rust/users") => handle_post_request(r),
                _ => (NOT_FOUND.to_string(), "404 not found".to_string()),
            };

            let response = format!("{}{}", status_line, content);
            println!("\nresponse in handleClient:{}\n",response);
            stream.write_all(response.as_bytes()).unwrap();
        }
        Err(e) => eprintln!("Unable to read stream: {}", e),
    }
}

fn handle_post_request(request: &str) -> (String, String) {
    match get_user_request_body(request) {
        Ok(user) => {
            // Establish a connection to the database
            let mut client = match Client::connect(DB_URL, NoTls) {
                Ok(client) => client,
                Err(_) => return (INTERNAL_ERROR.to_string(), "Internal error".to_string()),
            };

            // Check if email and username are not already present
            if is_email_username_available(&user.email, &user.username, &mut client) {
                // Insert the user into the database
                match client.query_one(
                    "INSERT INTO users (firstname, lastname, username, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING id",
                    &[&user.firstname, &user.lastname, &user.username, &user.email, &user.password]
                ) {
                    Ok(row) => {
                        let user_id: i32 = row.get(0);

                        match client.query_one(
                            "SELECT id, firstname, lastname, username, email, password FROM users WHERE id = $1",
                            &[&user_id],
                        ) {
                            Ok(row) => {
                                let user = User {
                                    id: row.get(0),
                                    firstname: row.get(1),
                                    lastname: row.get(2),
                                    username: row.get(3),
                                    email: row.get(4),
                                    password: row.get(5),
                                };

                                return (OK_RESPONSE.to_string(), serde_json::to_string(&user).unwrap());
                            }
                            Err(_) => return (INTERNAL_ERROR.to_string(), "Failed to retrieve created user".to_string()),
                        }
                    }
                    Err(_) => return (INTERNAL_ERROR.to_string(), "Failed to insert user".to_string()),
                }
            } else {
                // User with the given email or username already exists
                return (NOT_FOUND.to_string(),"User with the given email or username already exists".to_string());
            }
        }
        _ => return (INTERNAL_ERROR.to_string(), "Internal error".to_string()),
    }
}

fn is_email_username_available(email: &str, username: &str, client: &mut Client) -> bool {
    // Check if email or username already exists
    match client.query_opt("SELECT 1 FROM users WHERE email = $1 OR username = $2 LIMIT 1", &[&email, &username]) {
        Ok(Some(_)) => false, // Email or username already exists
        _ => true, // Email and username are available
    }
}


fn handle_get_all_request(_request: &str) -> (String, String) {
    match Client::connect(DB_URL, NoTls) {
        Ok(mut client) => {
            let mut users = Vec::new();

            for row in client.query("SELECT id, firstname, lastname, username, email, password FROM users", &[]).unwrap() {
                users.push(User {
                    id: row.get(0),
                    firstname: row.get(1),
                    lastname: row.get(2),
                    username: row.get(3),
                    email: row.get(4),
                    password: row.get(5),
                });
            }

            (OK_RESPONSE.to_string(), serde_json::to_string(&users).unwrap())
        }
        _ => (INTERNAL_ERROR.to_string(), "Internal error".to_string()),
    }
}


fn handle_login_request(request: &str) -> (String, String) {
    
    let request = request.split("\r\n\r\n").last().unwrap_or_default();
    println!("inside hnadlelogin {}",request);
    match serde_json::from_str::<serde_json::Value>(&request) {
        Ok(request_json) => {
            // Extract email and password from the JSON request
            let email = request_json.get("email").and_then(|v| v.as_str());
            let password = request_json.get("password").and_then(|v| v.as_str());
            
            println!("{:?}--{:?}",email, password);
            match (email, password) {
                
                (Some(email), Some(password)) => {
                    println!("validation----{:?}--{:?}",email, password);
                    match Client::connect(DB_URL, NoTls) {
                        Ok(mut client) => {
                            // Check if the provided email and password match any user in the database
                            println!("before validation: {},{}",email,password);
                            match client.query_opt(
                                "SELECT id, firstname, lastname, username, email, password FROM users WHERE email = $1 AND password = $2",
                                &[&email, &password],
                            ) {
                                Ok(Some(row)) => {
                                    println!("############validated#############");
                                    let authenticated_user = User {
                                        id: row.get(0),
                                        firstname: row.get(1),
                                        lastname: row.get(2),
                                        username: row.get(3),
                                        email: row.get(4),
                                        password: row.get(5),
                                    };

                                    (OK_RESPONSE.to_string(), serde_json::to_string(&authenticated_user).unwrap())
                                }
                                _ => (NOT_FOUND.to_string(), "Invalid email or password".to_string()),
                            }
                        }
                        Err(_) => (INTERNAL_ERROR.to_string(), "Internal error".to_string()),
                    }
                }
                _ => (NOT_FOUND.to_string(), "Invalid request format".to_string()),
            }
        }
        Err(err) => {
            eprintln!("Error parsing JSON -- : {:?}", err);
            (INTERNAL_ERROR.to_string(), "Error parsing JSON".to_string())
        }
    }
}






fn get_user_request_body(request: &str) -> Result<User, serde_json::Error> {

    let json_str = request.split("\r\n\r\n").last().unwrap_or_default();
    // Deserialize the JSON string into a User struct
    serde_json::from_str(json_str).map_err(|err| {
        // Print debug information
        eprintln!("Error parsing JSON(in reqBody):  {:?}", err);
        // Return the original error
        err
    })
}

