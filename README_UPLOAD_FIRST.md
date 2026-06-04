# 먼저 읽어주세요

이 폴더는 GitHub + Cloudflare Pages 테스트용으로 새로 정리한 업로드 전용 폴더입니다.

## GitHub에 올릴 폴더

이 폴더 안의 파일과 폴더를 GitHub에 올리면 됩니다.

```text
UPLOAD_TO_GITHUB_poomsae_coach
```

## 꼭 올라가야 하는 것

```text
www
scripts
docs
package.json
package-lock.json
README.md
TESTING.md
README_UPLOAD_FIRST.md
```

## 올리지 않아도 되는 것

이 업로드용 폴더에는 아래 항목을 일부러 넣지 않았습니다.

```text
android
node_modules
*.apk
*.aab
```

Cloudflare Pages 웹 테스트에는 필요하지 않습니다.

## Cloudflare Pages 설정

```text
Framework preset: None
Build command: 비움
Build output directory: www
```

가장 중요한 설정은 이것입니다.

```text
Build output directory = www
```

## 배포 후 먼저 확인할 주소

Cloudflare 배포가 끝나면 먼저 아래 주소를 확인합니다.

```text
https://poomsae-coach.pages.dev/health.html
```

`배포 확인 성공` 화면이 보이면 Cloudflare가 `www` 폴더를 정상으로 읽은 것입니다.

그 다음 앱 주소로 들어갑니다.

```text
https://poomsae-coach.pages.dev
```

## 로컬 검증 명령

GitHub에 올리기 전에 이 폴더에서 아래 명령을 실행할 수 있습니다.

```bash
npm run assets:check
npm run verify:cross
```

업로드용 폴더에서는 Android assets 검사를 건너뛰는 경고가 1개 나올 수 있습니다. 이것은 정상입니다.
