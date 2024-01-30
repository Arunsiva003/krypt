# Build stage
FROM rust:1.69-buster as builder

WORKDIR /app

COPY . .

RUN cargo build --release

#Preduction stage
FROM debian:buster-slim

WORKDIR /user/local/bin

COPY --from=builder /app/target/release/backend .

CMD [ "./backend" ]