FROM golang:1.23-alpine

WORKDIR /app

COPY . .
RUN go mod tidy
RUN go build -o monitor .

# Expose port
EXPOSE 8080

# Run
CMD ["./monitor"]