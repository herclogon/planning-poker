# Simple and free planning poker

Inspired by https://planningpokeronline.com/

**IMPORTANT!** Currently service uses two ports to work. They can be configured via
environment variables: HTTP_PORT (default: 8080) and WS_PORT (default: 8081).

## How to start service

### As docker container

```
docker run -e HTTP_PORT=9090 -e WS_PORT=9091 -p 9090:9090 -p 9091:9091 herclogon/poker:latest
```

### From source

```
npm ci
npm start
```

## TODO
- [ ] Cleanup client connection objects from `clientsMap` (possible memory leak)
- [ ] Websocket auto-reconnect
- [ ] JWT for messaging (server should accept only signed requests)
- [ ] Websocket & HTTP on the same port
- [ ] Possibility to change card variants (currently hard-coded)
