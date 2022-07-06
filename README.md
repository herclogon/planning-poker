# Simple and free planning poker

![image](https://user-images.githubusercontent.com/884844/153072383-05f552d5-4d98-4fca-aa6c-eb316af26a9b.png)

Inspired by https://planningpokeronline.com/

Github mirror: https://github.com/herclogon/planning-poker


## How to start the service

### As docker container

```
docker run -e HTTP_PORT=8080 -p 8080:8080 herclogon/poker:latest
```

### From source

```
npm ci
npm start
```

## TODO
- [ ] Websocket auto-reconnect
- [ ] JWT for messaging (server should accept only signed requests)
