# HITMEN project website

HITMEN 연구 소개용 정적 웹사이트입니다. HTML, CSS, JavaScript와 로컬 영상·폰트만 사용하며 별도의 서버, API 키, 유료 서비스 또는 빌드 과정이 필요하지 않습니다.

- 공개 웹사이트: https://cwseon27.github.io/HITMEN/
- 저장소: https://github.com/cwseon27/HITMEN
- 호스팅: GitHub Pages, `main` 브랜치의 루트(`/`)

## 로컬에서 확인

이 디렉토리에서 다음 명령을 실행하고 http://localhost:8000 을 엽니다.

```bash
python3 -m http.server 8000
```

## 수정할 파일

| 파일 | 내용 |
| --- | --- |
| `index.html` | 제목, 저자, 소속, 연구 설명, 메인 및 기능 영상 |
| `styles.css` | 색상, 글꼴, 배치, 모바일 디자인 |
| `script.js` | 벤치마크 작업·방법 목록, 영상 로딩·재생, 섹션 탐색 |
| `assets/videos/` | 웹용 H.264 MP4 19개 |
| `assets/posters/` | 영상별 미리보기 이미지 |
| `assets/media-manifest.json` | 원본과 웹용 영상의 대응, 해상도·길이·용량 |
| `assets/fonts/` | 자체 호스팅 폰트와 해당 OFL 라이선스 |
| `scripts/prepare_media.py` | 원본에서 웹용 영상과 포스터를 다시 생성하는 도구 |

수정 후 `git add` → `git commit` → `git push`하면 GitHub Pages가 갱신됩니다. 일반적인 문구·스타일 수정에는 패키지 설치나 영상 변환이 필요하지 않습니다.

## 페이지 구성

1. 정확한 연구 제목, 저자·소속과 메인 배너 영상
2. 머리·가슴·팔·손에 배정된 센싱 및 제어 방식
3. 추적 신뢰도 예측과 가림 상황에서의 손 제어
4. 목·허리의 독립적인 움직임과 신뢰도에 따른 허리 움직임 제한
5. Peg-in-hole 시뮬레이션과 VR 인식 범위 밖 손 제어
6. 네 작업의 VR only / HMD + leader arm / HITMEN 비교

본문은 영문 TeX 원고와 제공된 설명에 근거합니다. 수식 대신 영상과 간단한 설명을 중심으로 구성했습니다. 논문에서 평가한 전체 7개 작업 중 영상이 제공된 4개를 `selected manipulation tasks`로 소개하며, 제공되지 않은 논문 PDF·공개 코드 링크나 결과 수치는 추가하지 않았습니다.

## 영상 동작

- 메인·기능 영상은 음소거 상태로 화면에 보일 때 재생하고, 화면을 벗어나면 일시 정지합니다. 운영체제의 동작 줄이기 설정 또는 브라우저의 데이터 절약 설정이 켜져 있으면 자동 재생을 하지 않습니다.
- 각 영상에 개별 재생·탐색·전체 화면 컨트롤이 있습니다.
- 비교 실험은 사용자가 재생합니다. `Play all`은 세 영상을 함께 시작하거나 이어 재생하고, `Restart`는 처음부터 함께 재생합니다. 실제 실험 단계별로 영상을 시간 정렬한 것은 아닙니다.
- 재생 속도는 각 작업별로 0.5×, 1×, 1.5×, 2×를 선택할 수 있습니다.
- 작은 화면에서는 비교 영상 한 행을 가로로 스크롤합니다. VR → HMD + leader → HITMEN 순서를 유지합니다.
- 웹용 영상은 H.264 / yuv420p, 무음, fast-start 형식입니다. 원본은 변경하지 않았습니다.

## 원본 자료와 배포 범위

로컬의 `videos/`, `Experiments_short/`, 루트의 `.tex`, `.pdf`, `.zip` 파일은 `.gitignore`로 제외됩니다. 공개 저장소에는 웹사이트 코드와 웹용 파생 영상·포스터를 올립니다. 원본 디렉토리는 영상 재생성을 할 때만 필요합니다.

영상 재생성은 Python, OpenCV, FFmpeg가 필요합니다. 상세 옵션:

```bash
python3 scripts/prepare_media.py --help
```

## 글꼴

Inter와 Space Grotesk를 자체 호스팅합니다. 해당 글꼴의 SIL Open Font License 전문은 `assets/fonts/`에 있습니다. 이 폰트 라이선스가 연구 자료나 영상의 재사용 허가를 의미하지는 않습니다.
