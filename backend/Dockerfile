FROM golang:1.25-alpine

WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . .

# Ensure go.sum is generated for imported packages
RUN go mod tidy

RUN go build -o server ./

ENV PORT=8080
EXPOSE 8080

CMD ["./server"]

