# Simple and free planning poker

![image](https://user-images.githubusercontent.com/884844/153072383-05f552d5-4d98-4fca-aa6c-eb316af26a9b.png)

Inspired by: https://planningpokeronline.com/

Hosted as: https://poker.hsdesign.ru/

Source: https://git.dev.hsdesign.ru/public/planning-poker

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

## Helpful resources

* [Planning poker solutions comparison](https://pmclub.pro/articles/kak-my-iskali-nash-idealnyj-instrument-dlya-poker-planirovaniya)