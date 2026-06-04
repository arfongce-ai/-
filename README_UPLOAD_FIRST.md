# 먼저 읽어주세요

이 폴더는 GitHub + Cloudflare Pages 테스트용 업로드 폴더입니다.

## GitHub에 올릴 것

이 폴더 안의 모든 파일과 폴더를 GitHub 저장소 맨 위에 올리면 됩니다.

```text
UPLOAD_TO_GITHUB_poomsae_coach
```

중요한 폴더:

```text
www
scripts
docs
```

중요한 파일:

```text
index.html
health.html
_headers
_redirects
package.json
package-lock.json
README.md
TESTING.md
README_UPLOAD_FIRST.md
```

## Cloudflare Pages 설정 1순위

먼저 아래 설정으로 배포하세요.

```text
Framework preset: None
Build command: 비움
Build output directory: www
```

배포 후 먼저 확인:

```text
https://poomsae-coach.pages.dev/health.html
```

`배포 확인 성공` 화면이 보이면 정상입니다.

## 404가 계속 나오면 설정 2순위

Cloudflare가 `www` 폴더를 못 찾으면 아래처럼 바꿔서 다시 배포하세요.

```text
Framework preset: None
Build command: 비움
Build output directory: 비움
```

이 폴더에는 루트 `index.html`이 있어서 저장소 루트로 배포해도 자동으로 `www/index.html`로 이동합니다.

이때 확인 주소:

```text
https://poomsae-coach.pages.dev/health.html
```

`루트 배포 확인 성공` 화면이 보이면 루트 배포가 된 것입니다. 그래도 앱은 열릴 수 있습니다.

## 앱 테스트 주소

아래 주소 중 하나로 테스트합니다.

```text
https://poomsae-coach.pages.dev
https://poomsae-coach.pages.dev/index.html
https://poomsae-coach.pages.dev/www/index.html
```

## 로컬 검증 명령

GitHub에 올리기 전에 이 폴더에서 확인할 수 있습니다.

```bash
npm run assets:check
npm run verify:cross
```

`verify:cross`에서 Android assets 검사를 건너뛴다는 경고가 1개 나올 수 있습니다. 이 업로드 폴더에는 `android` 폴더를 일부러 넣지 않았기 때문에 정상입니다.
