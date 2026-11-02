**5** 추천 5순위 · Learn AR with SPECS

## Eyes Up (아이즈 업) — 노트를 숨기고 사람을 보게 만드는 발표 리허설 시선 코치

- **마감(KST)**: 11/10(화) 07:00 D-16 · 11/9 17:00 EST

- **상금**: $2,500 1st $1,250 · 2nd $750 · 3rd $500

- **타겟 상**: 1위 도전 현실 목표 Top 3

- **등록자**: 646명 개인/팀, 한국 제한 없음

- **필수 요건**: 새 Lens for SPECS skill pack → CLAD + Lens Studio MCP, 프리뷰 동작이면 OK, 기기 불필요

- **제출물**: 공개 레포 + 3분 미만 YouTube + 텍스트(무엇·누구·배운 것)

- **심사**: 4기준 동일 가중 Design · Technical · Innovation · Presentation

제출 기간 10/15~11/9, 기간 중 새로 시작한 코드만(아이디어 재사용 OK, 템플릿·SIK 등 표준 도구 OK·공개 의무). 영어가 아니면 번역 첨부, 제3자 상표·저작권 음악 금지. 심사자는 클론·실행하지 않으므로 **영상이 전부**다. 모든 유효 제출에 Devpost Learn 배지, 수상작은 뉴스레터·SNS 피처.

출처: [대회 페이지](https://learn-specs.devpost.com/) [challengepost/learn-specs (skill pack)](https://github.com/challengepost/learn-specs) [CLAD 문서](https://developers.specs.com/docs/clad) [ls-extensions](https://github.com/lens-studio-devs/ls-extensions) [Lens Studio 다운로드](https://ar.snap.com/download)

01

### 전제 정리 · 대회가 실제로 요구하는 것
skill pack 원문 기준

skill pack `challengepost/learn-specs`의 스킬은 `plan-lens` 하나다(`skills/plan-lens/SKILL.md`, `references/ar-design-rules.md`, `references/preview-limits.md`, `templates/design-brief-template.md`). 에이전트는 인터뷰만 하고 결정은 학습자가 한다. 빌드는 Snap의 CLAD가 Lens Studio MCP 위에서 한다.

   ```` ```````` ````  ``````  

| 단계 | 내용 | 출처 |
|---|---|---|
| 0 | Lens Studio에서 SPECS → Base Template → File > Save As로 프로젝트 생성. .esproj와 .mcp.json이 있는 폴더가 작업 루트이자 제출 레포 | SKILL.md "Setup Check" |
| 1 | 그 폴더에서 코딩 에이전트 시작(Lens Studio 열어둔 상태). /mcp에 lens-studio 연결, /plugin에 CLAD(ls-clad) 확인 | SKILL.md "Setup Check" 2·3 |
| 2 | npx skills add challengepost/learn-specs --all -y 후 plan-lens 실행. 20~30분, 개방형 질문 6~8개. 에이전트는 코드·씬 수정·빌드를 하지 않음, "just do it for me" 거부 | "Devpost Learn Rules", "The Interview" |
| 3 | 인터뷰 주제: ①아이디어 ②the spatial moment ③product/overlay(실물 인식이 필요하면 프리뷰용 stand-in) ④배치(팔 길이~2 m, 눈높이 약간 아래, 좁은 시야 안) ⑤손(큰 타겟 소수, 핀치/그랩/드래그/버튼/슬라이더, 음성은 반드시 버튼 짝) ⑥표시 타이밍(필요할 때만, 안 보이는 곳은 소리·화살표) ⑦Done criteria 3~5개, 모두 프리뷰에서 클릭·이동으로 확인 가능 | "The Interview" |
| 4 | devpost/design-brief.md 작성(status: draft → "looks good"이면 approved). 섹션: The one spatial moment / Why it belongs on glasses / Product or overlay / Where things live / Hands and input / When things show / Done criteria / Out of scope / Risks / Build notes for CLAD / After the build | design-brief-template.md |
| 5 | 새 채팅(/clear)에서 CLAD 핸드오프 프롬프트(원문): "Read devpost/design-brief.md and build it for SPECS. Follow the brief closely. Get the basic flow working first, then add detail. Write and run LEAF tests for each done criterion, and tell me which pass." 빌드 30분+ | "Hand Off" |
| 6 | After the build: LEAF 통과 확인 → Interactive Preview에서 WASD 이동, Q/E 상하, 우클릭 드래그(또는 Shift) 시선, 클릭 = 핀치로 걸어 다니며 판단 → 3질문(시야 활용? 공간 배치? 손/눈 자유?) → 편안함 체크 → "logic proven" / "feel unproven" 라벨 → 코드가 아니라 디자인 노트로 수정("Move the step card 15 cm lower… Make the Next button twice as big. Re-run the tests.") → 영상·레포 제출 | templates "After the build" |

#### 심사자가 보고 싶은 것 ar-design-rules.md

- **글래스만 할 수 있는 3가지**: shares your view / draws in the world / leaves your body free. "Good AR uses one. Great AR combines them."
- **4가지 습관**: ①얼굴 앞 웹사이트 금지, 정보는 대상 위에 ②항상 표시 금지, 필요할 때 보이고 물러남 ③작은 버튼 메뉴 금지, 큰 타겟 소수 "Pinch is the new tap" ④어깨 뒤 패널 금지, 이미 보고 있는 곳에
- **수치**: 시야 약 37° 세로 × 32° 가로, 초점면 ~1 m, 주 콘텐츠 0.6~1.6 m·눈높이 약간 아래. 가용 영역(높이×너비) 35 cm: 13×24 / 55 cm: 23×38 / 110 cm: 53×77 / 160 cm: 75×112. 팔은 낮게, 가산 디스플레이라 검정 = 투명
- 컨셉 영상의 worked example이 **"리소토 요리 코치"** → 요리류는 사실상 교과서 예제라 차별화가 어렵다

#### 심사 구조와 규칙

- 4기준 동일 가중: Design(기술 PoC가 아닌 완결된 제품 경험), Technical Implementation(**CLAD·Lens Studio·Lens Studio MCP 활용도**), Innovation/Idea, Presentation(영상이 end-to-end 동작을 보이고 문제·대상·의미가 명확)
- 심사자: Joe Holmes(AI Learning Hackathon Architect, Devpost), Darlyze Calixte(Developer Marketing Manager, Devpost). Snap 엔지니어가 아니라 **학습 설계·마케팅 관점** → "과정과 배운 것"의 서사가 점수에 직결
- 레포에 Lens Studio 프로젝트 파일 + `devpost/` 폴더(권장). 심사자는 클론·실행하지 않는다

#### CLAD

Closed Loop Agentic Development. Snap의 에이전트·스킬 묶음(`ls-clad`). 설치: `/plugin marketplace add lens-studio-devs/ls-extensions` → `/plugin install ls-clad@ls-extensions`. Lens Studio가 띄우는 MCP 서버의 툴 위에서 설계→빌드→테스트 루프를 돈다.

#### Lens Studio MCP 툴

`ExecuteEditorCode`, `RecompileTypeScriptTool`, `PreviewPanelTool`(stereo/Interactive), `QueryRuntimeSceneTool`, `CaptureRuntimeViewTool`(스크린샷), `PreviewInteractTool`(가상 손 Pinch/Hover/Poke/Drag/Gesture/Release/Rotate/Batch), `InjectPreviewGesture`, `RunAndCollectLogsTool`, `ListInstalledPackagesTool`, `InstallLensStudioPackage`, `SearchLensStudioAssetLibrary`, `ListAllPanels`, `VirtualScene`

#### CLAD 에이전트·스킬

에이전트: `specs-experience-builder`(end-to-end), `script-author`, `editor-api-specialist`, `live-lens-tester`(LEAF). 관련 스킬: `lens-studio-router`, `specs-project-init`, `scene-construction`, `lens-api`, `specs-build-ui`(UIKit, cm 단위 flex, 기본 z=-110 cm), `specs-interaction-recipes`, `build-mesh`, `build-sfx`·`build-music`(오프라인 생성 → 저작권 해결), `icon-selector`, `font-selector`, `specs-asr`, `specs-ai-remote-service`, `verify-preview`, `preview-inspection`, `specs-leaf-*` 3종, `specs-audio`

#### LEAF

Lens Evaluation & Automation Framework. `Scenario.run()`에서 `DefaultLeafInteractor().trigger(button)`, `drag`, `hover`, `LeafHandInteractor.makeGesture(pinch|fist|palm…)`, `expect(...).toBe(...)`, `sleep(ms)`/`nextFrame()`. SIK Interactable만 구동, Logger에 PASSED/FAILED.

#### 다른 참가작 패턴

`devpost/design-brief.md` + `build-notes.md` + `walkthrough/` 스크린샷 + 제출 텍스트, LEAF 5~6개(done criteria 1:1), "logic proven / feel unproven" 라벨, 디자인 노트 1줄 수정 사례("55 cm에서 읽히게"). [messy-hands-inbox](https://github.com/DmitriyTopka/messy-hands-inbox) · [keep-pace](https://github.com/Chinorab/keep-pace) · [Footlight](https://github.com/Marc-Dvci/Footlight)

#### 환경

Lens Studio 5.24.1(2026-10-07, SPECS 27 대상)이 CLAD 요구 버전. Mac은 Apple Silicon 권장(5.26부터 Apple Silicon 전용 예고). Snap 계정 로그인 필요. [v5.24.0 노트](https://ar.snap.com/download/v5-24-0)

#### Interactive Preview 가능/불가 기능표

   [](https://developers.snap.com/lens-studio/lens-studio-workflow/previewing-your-lens) [](https://developers.snap.com/spectacles/spectacles-frameworks/spectacles-interaction-kit/component-list) [](https://github.com/Marc-Dvci/Footlight)    ``[](https://developers.snap.com/spectacles/about-spectacles-features/apis/asr-module) [](https://developers.snap.com/spectacles/about-spectacles-features/apis/remoteservice-gateway) ``[](https://developers.snap.com/lens-studio/features/audio/text-to-speech) [](https://developers.snap.com/spectacles/about-spectacles-features/apis/camera-module)``

| 기능 | 프리뷰 | 근거 |
|---|---|---|
| 걸어 다니기(WASD/Q/E/우클릭 드래그), 실물 크기 배치, 바닥/가상 테이블 | 가능 | preview-limits.md "Works well"; LS Previewing(World Device Tracking/World Mesh 지원) |
| SIK/UIKit 버튼·슬라이더·토글·패널, 핀치·그랩·드래그·던지기(마우스 클릭 = 한 손 핀치) | 가능 | preview-limits.md; SIK MouseInteractor |
| 머리 방향/위치(카메라 Transform) 읽기 → 시선·거리 로직 | 가능 | 마우스 룩이 카메라를 회전. Footlight가 머리 위치 트리거 구현 |
| 공간 음향, 단순 물리, 애니메이션, 텍스트, 3D 모델 | 가능 | preview-limits.md |
| 가산 디스플레이 시뮬레이션(검정 = 투명) | 가능 | preview-limits.md |
| LEAF의 SIK Interactable 트리거/드래그/제스처 | 가능 카메라 이동 불가 | LEAF 문서; Footlight README → 포즈 주입 훅 필요 |
| 음성 인식(ASR) | 상충 | CLAD specs-asr: "Works in both Lens Studio Preview and on-device" / preview-limits: "May not work… Pair every voice action with a button" / 참가작: "needs a signed-in Snap account" / 공식 문서: "only available on Spectacles" → 로그인 후 가능성 높으나 버튼 대체 필수·Stretch로만 |
| LLM 호출(Remote Service Gateway: OpenAI/Gemini/DeepSeek/Snap3D) | 조건부 | 공식 "only available on Spectacles"; preview-limits "plan a hard-coded answer"; CLAD는 Snapchat 로그인으로 토큰 자동 생성 → 하드코딩 폴백 필수 |
| TTS(TextToSpeechModule, 영어 2보이스) | 불명 | 문서에 프리뷰 명시 없음 → 생성 WAV로 대체 |
| 카메라 프레임(Camera Module) | 불가 | 문서: 프리뷰에서 getCameras() 빈 배열 |
| 실물 인식(SnapML), 실제 장소·경로, 외부 데이터 | 불가 | preview-limits.md → "Found it" 버튼/하드코딩 스탠드인 |
| 두 손·커스텀 제스처, 손 속도·포즈, 손가락 관절 | 불가 | preview-limits.md(마우스로 못 보임) |
| 세션 간 기억, 영속 공간 앵커 | 불가 | preview-limits.md |
| Connected Lenses(두 사람) | 불가 | 5.24.1부터 프리뷰 창 여러 개로 매치메이킹은 가능하나 데모 설득력 낮음 |
| 몸 추적(자세) | 불가 | 프리뷰에 몸 없음 |

디자인 수치 출처: [Positioning & Sizing](https://developers.snap.com/spectacles/best-practices/design-for-spectacles/positioning-sizing-content)(근거리 35~60 cm, 원거리 60~160 cm, 타겟 최소 2°·간격 1°, 버튼 55 cm에서 최소 2.0/권장 3.0/대형 4.0 cm, 110 cm에서 4.0/6.0/8.0 cm) · [UI Design](https://developers.snap.com/spectacles/best-practices/design-for-spectacles/ui-design)(inverted color space, 검정 불가, 어두운 배경+밝은 글자, 넓은 단색 면 피함, 핀치 버튼 squish) · [Spatial Design](https://developers.snap.com/spectacles/best-practices/design-for-spectacles/introduction-to-spatial-design)(초점면 1 m, 완전 겹침 1.1 m, 3:4 세로 비율)

02

### 선정안

Selected

Eyes Up · 아이즈 업

발표 리허설 시선 코치. 거실에 가상 청중을 앉혀 놓고, 사람을 보며 연습하게 만든다.

"Eyes Up puts a small audience in your room so you rehearse a talk looking at people, not at your notes. It lights up the people you connect with, nudges you toward the ones you forget, and shows your next point only when you need it."

혼자 연습하면 (1) 노트·화면을 내려보는 습관이 굳고 (2) 한쪽(보통 정면)만 보는 시선 편중을 스스로 알 수 없고 (3) 시간 감각이 없다. Eyes Up은 **눈을 든 채로** 연습하게 하고, 시선 분배를 **공간에 즉시 피드백**하고, 노트는 **막혔을 때만** 보여 준다. 끝나면 숫자(구역별 시선 %, 최장 외면, 카드 열람 수, 시간)를 준다.

- **타겟 유저**: 영어가 모국어가 아닌 발표자(한국 학생·직장인·창업자), 면접·피칭·학회 발표를 혼자 연습하는 사람. 1차 페르소나: 데모데이 3분 피치를 거실에서 혼자 연습하는 1인 창업자
- **핵심 가치**: 랩톱 텔레프롬프터는 시선을 화면으로 끌어내린다. 글래스는 눈을 든 채로 청중을 방 안에 둔다
- **노리는 상**: 1st $1,250 도전 현실 Top 3
- **SPECS API**: 카메라 Transform(시선), SIK PinchButton, UIKit 패널, 공간 음향, (옵션) ASR
- **이름 확인**: 일반 구문. 제출 전 Snap Lens 검색·Devpost 검색으로 중복 확인
- **백업안**: Memory Palace(2위). 단 D2까지 루프가 안 돌면 전환 대신 Eyes Up 범위 축소

03

### 승리 근거 · 심사 기준 대응
4기준 동일 가중

Design25%

설정 → 리허설 → 요약의 완결 루프. 모든 요소가 "청중"이라는 대상 위/주변에 놓임(습관①), 카드·타이머는 조건부 표시(②), 입력은 Next/Finish 큰 버튼 2개 + 시선 체류(③), 시야 밖은 소리+화살표(④). 수치 전부 Snap 가이드에서 가져옴(목업 명세).

Technical Implementation25% · CLAD·LS·MCP 활용

CLAD 스킬 9종 이상 실사용(build-ui·build-mesh·build-sfx·icon·font·lens-api·specs-audio·verify-preview·LEAF 3종), MCP 툴로 씬 생성·스크린샷·가상 손 테스트, LEAF 6 시나리오(시선은 `ScriptedGazeProvider`로 주입), `build-notes.md`에 MCP 호출 로그·디자인 노트 수정 이력.

Innovation / Idea25%

Snap 공식 Teleprompter 렌즈·PromptAR은 "노트를 보여주는" 앱. Eyes Up은 정반대로 노트를 숨기고 시선을 코칭한다. 글래스가 아니면 성립하지 않는 가치(랩톱은 시선을 화면으로 끌어내림). [Teleprompter](https://support.spectacles.com/hc/en-us/articles/43465149824020) · [PromptAR](https://devpost.com/software/promptar)

Presentation25%

시선을 돌리면 후광이 켜지는 장면은 설명 없이 10초 안에 이해된다. 영상 속 발표 내용을 이 피치 자체로 삼은 메타 구조("나는 이 영상을 Eyes Up으로 연습했다"). 심사자 2명이 학습 설계·마케팅 배경이므로 4습관 전부를 시연하는 서사가 유리.

04

### 아이디어 회의 기록
20개 발산 → 3개 심층 → 1개 선정

#### 1 · Eyes Up 선정 · 32점

거실에 선 채로 3분 발표. 2.5 m 앞 반원형 청중 6명. 왼쪽을 8초 외면하면 왼쪽에서 차임과 작은 화살표. 다음 포인트는 청중 머리 위 카드로 4초만 뜨고 3단어 꼬리표로 줄어듦.

**장점** eyes up/body free + draws in the world 결합, 4습관 전부 사용, 핵심 가치가 프리뷰 입력(마우스 룩·클릭)만으로 100% 증명, CLAD 활용 폭 최대

**치명적 리스크** 청중 모델 품질(→ 추상 실루엣), 시선 판정 튜닝(각도 상수 몇 개)

#### 2 · Memory Palace 30점

방을 돌며 5~10개 항목을 놓고, 돌아와 걸으며 회상 퀴즈.

**장점** WASD 이동이 핵심 → 프리뷰 강점, 15일 리스크 최저

**치명적 리스크** 폰 AR 앱(MemoryVaultAR)이 이미 있어 "왜 글래스" 설명이 한 단계 더 필요, 떠 있는 카드뿐이라 영상이 심심, 습관③ 보통

#### 3 · 윷놀이 28점

식탁 위 실물 크기 윷판에 윷 4개를 던지고 결과대로 말 이동.

**장점** 서구 심사자에게 신선, 윷이 튀는 장면은 영상 임팩트 최고

**치명적 리스크** 앞/뒤 판정이 물리 안정성에 좌우 → 리테이크, 규칙 복잡(빽도·잡기·업기), "폰으로도 되지 않나"에 답이 약함

**판정**: Eyes Up. Memory Palace는 백업안으로 두되, 첫 2일 안에 CLAD 빌드가 정상 동작하면 그대로 진행.

상위 3 심층 비교 전체 (8개 항목)

     

| 항목 | 1 Eyes Up | 2 Memory Palace | 3 윷놀이 |
|---|---|---|---|
| The one spatial moment | 거실에서 3분 발표, 2.5 m 앞 반원 청중 6명. 왼쪽 8초 외면 → 왼쪽 차임+화살표. 다음 포인트는 머리 위 10 cm 카드로 4초 → 3단어 꼬리표 | 방을 돌며 5~10개 항목 배치, 돌아와 걸으며 회상 | 식탁 위 윷판에 윷 4개 던지고 말 이동 |
| 글래스 3강점 | eyes up/body free + draws in the world 2개 결합. 랩톱 텔레프롬프터는 정반대 → "왜 랩톱이 아닌가"가 1문장 | draws in the world + body free(걷기). 폰 AR 앱 존재 | draws in the world. 던지는 손맛은 실기기에서만 증명 |
| 4습관 매핑 | ①청중 위 정보 ②필요할 때만 카드 ③Next 큰 버튼 하나 ④외면한 쪽 소리+화살표 — 4개 전부 | ①②④ 가능, ③ 보통 | ①③ 중심, ②④ 약함 |
| 프리뷰 증명력 | 시선 = 카메라 회전, 클릭 = 핀치. 핵심 가치 100% 증명, ASR은 옵션 | WASD 이동이 핵심, 증명력 높음 | 던지기는 지원되나 판정이 물리 안정성에 좌우 |
| CLAD/MCP 활용 폭 | build-ui(패널 3종), build-mesh(실루엣), build-sfx(차임·박수), icon/font, lens-api, specs-audio, LEAF 6, verify-preview, 옵션 specs-asr | build-ui, lens-api, LEAF | physics, build-mesh, build-sfx, LEAF(랜덤 물리 테스트 어려움) |
| 차별화 | 텔레프롬프터(노트 노출)와 정반대인 노트 은닉 코치 → 비교 대상이 있어 Innovation 설명이 쉬움 | VR 메모리 팰리스 연구·앱 다수, 글래스판은 드묾 | 서구 심사자에게 신선, 보드게임 자체는 흔함 |
| 15일 리스크 | 청중 모델 품질, 시선 판정 튜닝 | 가장 낮음 | 가장 높음 |
| 영상 임팩트 | 후광이 켜지고 외면한 쪽 화살표가 뜨는 장면이 10초 안에 이해 | 화면이 심심 | 윷이 튀는 장면 최고 |

전체 발산 목록 (20개)

   

| # | Lens | 한 줄 | 쓰는 기능 | 프리뷰 시연 |
|---|---|---|---|---|
| 1 | Eyes Up 발표 시선 코치 | 가상 청중 앞 리허설, 시선 받은 청중 후광 켜짐, 외면 쪽 차임+화살표, 큐카드는 필요할 때만 | 카메라 Transform, SIK PinchButton, UIKit, 공간 음향, ASR(옵션) | 마우스 룩 = 머리 회전 |
| 2 | Memory Palace 기억의 궁전 | 암기 항목을 방 곳곳에 놓고 걸으며 회상 퀴즈 | SIK 드래그 배치, UIKit, WASD | 가능 |
| 3 | 윷놀이 Yut-nori | 식탁 위 윷판, 윷 4개 물리 던지기 | Physics, SIK throw, build-mesh | 가능(판정 안정성 리스크) |
| 4 | 한글 획순 Air-Stroke | 테이블 위 큰 획을 순서대로 따라 그리기 | SIK 드래그, MeshBuilder 선 | 가능 |
| 5 | 가구 조립 코치 | 부품 실물 크기 배치, 단계별 하이라이트 | build-mesh, UIKit, "Found it" 스탠드인 | 가능(인식 스탠드인) |
| 6 | 핸드드립 커피 코치 | 드리퍼 위 나선 가이드+타이머 | UIKit, 애니메이션 | 가능(요리류 = 교과서 예제) |
| 7 | 청각 보조 자막 버블 | 화자 근처에 자막 | ASR, UIKit | ASR 의존·화자 위치 불가 |
| 8 | 도미노 연쇄 빌더 | 바닥에 실물 크기 도미노·램프 | Physics, SIK grab | 가능(Big Marble 유사) |
| 9 | 소리 숨바꼭질 | 공간 음향 소스 찾기 게임 | spatial audio, WASD | 가능(시각 임팩트 낮음) |
| 10 | 태권도 품새 발자국 | 바닥 발자국 순서대로 밟기 | 바닥 마커, 머리 위치 | 하체만 판정, Footlight 유사 |
| 11 | 실물 크기 심장 해부 | 레이어 슬라이더 | build-mesh, Slider | 가능(교육 모델 흔함) |
| 12 | 기타 코드 오버레이 | 가상 넥 위 손가락 위치 | 3D, UIKit | 손 포즈 검증 불가 |
| 13 | 브레드보드 버디 | 전자부품 삽입 가이드 | 3D, UIKit | 가능(니치) |
| 14 | 정리 스프린트 | 구역별 타이머·바구니 | UIKit | 가능("왜 글래스" 약함) |
| 15 | 식물 관리 태그 | 식물 옆 물주기 태그 | UIKit, 스탠드인 | 가능(임팩트 낮음) |
| 16 | 메뉴 번역 | 메뉴 인식 → 번역 | Camera(불가) → 스탠드인 | 영상 예시 그대로 |
| 17 | 자세·스트레칭 코치 | 자세 교정 | Body tracking | 불가 |
| 18 | 실내 길찾기 | 바닥 경로 | 바닥 경로, WASD | 가능(흔함) |
| 19 | K-pop 안무 발자국 | 안무 발자국 | 바닥 마커 | 상체 불가 |
| 20 | 벽 칸반 보드 | 벽에 할 일 | UIKit | 가능("얼굴 앞 웹사이트") |

쇼케이스에서 흔한 것(피할 것): AI 사물 인식(CurioCity, Matterly, Nutri-Glance), 요리/레시피(biscotti, messy-hands), 교육 3D 모델(Apollo 11, Math Bee, Periodic Table = CLAD 자체 예제), 미스터리/방탈출(Hexenfurt, Case in Your Room), 공간 드로잉(Spatial Drawer), 교통·지도(TransitView, Trail ExplorAR), 마블런(Big Marble), 명상(Sanctum), 의료 코치(Keep Pace CPR, Footlight). 출처: [Challenge #15](https://blog.lenslist.co/2026/09/03/spectacles-community-challenge-15-winners-announcement/) · [#14](https://blog.lenslist.co/2026/08/04/spectacles-community-challenge-14-winners-announcement/) · [#6](https://blog.lenslist.co/2025/10/28/spectacles-community-challenge-6-winners-announcement/) · GitHub "Learn AR with SPECS" 검색

수렴 매트릭스 (1~5점, 프리뷰 ×2 가중, 20개)

     

| # | Lens | (a) 프리뷰 | (b) 심사4기준 | (c) 15일 현실성 | (d) 차별화 | (e) 영상 임팩트 | (f) 학습 서사 | 합계 |
|---|---|---|---|---|---|---|---|---|
| 1 | Eyes Up | 5 | 5 | 4 | 4 | 4 | 5 | 32 |
| 2 | Memory Palace | 5 | 4 | 5 | 4 | 3 | 4 | 30 |
| 3 | 윷놀이 | 4 | 4 | 3 | 5 | 5 | 3 | 28 |
| 4 | 한글 획순 | 5 | 3 | 4 | 3 | 3 | 3 | 26 |
| 5 | 가구 조립 | 4 | 4 | 3 | 2 | 4 | 4 | 25 |
| 6 | 핸드드립 | 5 | 3 | 4 | 1 | 3 | 4 | 25 |
| 9 | 소리 숨바꼭질 | 5 | 2 | 5 | 3 | 2 | 3 | 25 |
| 14 | 정리 스프린트 | 5 | 2 | 5 | 3 | 2 | 3 | 25 |
| 11 | 심장 해부 | 5 | 3 | 3 | 2 | 4 | 2 | 24 |
| 13 | 브레드보드 | 4 | 3 | 3 | 4 | 3 | 3 | 24 |
| 8 | 도미노 | 4 | 3 | 3 | 2 | 5 | 2 | 23 |
| 10 | 태권도 | 3 | 3 | 3 | 4 | 3 | 3 | 22 |
| 15 | 식물 태그 | 4 | 2 | 5 | 2 | 2 | 2 | 21 |
| 18 | 길찾기 | 4 | 2 | 4 | 1 | 3 | 3 | 21 |
| 7 | 자막 버블 | 3 | 3 | 3 | 2 | 3 | 3 | 20 |
| 19 | K-pop 발자국 | 2 | 3 | 2 | 4 | 4 | 2 | 19 |
| 20 | 벽 칸반 | 5 | 1 | 5 | 1 | 1 | 1 | 19 |
| 12 | 기타 코드 | 3 | 2 | 3 | 2 | 3 | 2 | 18 |
| 16 | 메뉴 번역 | 2 | 2 | 4 | 1 | 2 | 2 | 15 |
| 17 | 자세 코치 | 1 | 2 | 2 | 2 | 2 | 2 | 12 |

05

### 기능 리스트
태그: API·SIK/UIKit·CLAD 스킬 / 프리뷰 / 난도

#### MVP 필수 · 9개

- **앱 상태 머신**Setup → Rehearsal → Summary
BaseScriptComponentUpdateEventlens-api프리뷰 ✅난도 하

- **스테이지 배치**시작 시 머리 방향 기준 2.5 m 앞·바닥(머리 -160 cm)에 청중 6명 반원, "Re-place" 재배치
Camera getTransform()scene-constructionbuild-mesh프리뷰 ✅난도 중

- **시선 추적**매 프레임 카메라 forward와 각 청중 방향의 각도, 7° 이내면 "보고 있음"
Component.Cameravec3.angleTo프리뷰 ✅ 마우스 룩난도 중

- **관심 후광(halo)**보면 1 s에 가득, 안 보면 12 s에 소진. 밝기·크기, 실루엣 1.0→1.05
RenderMeshVisual 알파materials프리뷰 ✅난도 중

- **넛지**한 구역(좌/중/우) 전체가 0.2 미만으로 8 s → 그쪽 차임(공간 음향) + 시야 가장자리 셰브론 3 s
AudioComponentspecs-audiobuild-sfxBillboard프리뷰 ✅난도 중

- **큐카드**섹션 시작 시 4 s 표시 후 3단어 꼬리표로 축소, 꼬리표 1 s 응시(dwell)하면 재확장
UIKit Frame+Textspecs-build-uiBillboard프리뷰 ✅난도 중

- **포디움 컨트롤(55 cm)**Prev / Next / Finish 핀치 버튼 + 섹션 카운터 + 경과 시간
SIK PinchButtonInteractableSquishFeedbackInteractableAudioFeedbackUIKit Button프리뷰 ✅ 클릭난도 하

- **요약 패널**시간, 구역별 시선 %, 최장 외면, 카드 확장 수, 균형 점수, Again/Done
UIKit FlexLayouticon-selector프리뷰 ✅난도 하

- **LEAF 6 시나리오**done criteria 1:1 + 1
Leaf.lspkgDefaultLeafInteractorScriptedGazeProvider프리뷰 ✅난도 중

#### Should 4개

- **설정 패널**발표 길이 슬라이더(3/5/10분), 청중 수(3/6/9), 덱 선택(샘플 2종), Start
UIKit SliderSwitchButton프리뷰 ✅난도 하

- **스테이지 라인 타이머**청중 발밑 바닥 선이 진행률, 남은 60 s·30 s 펄스, 0 s 호박색
MeshBuildermaterials프리뷰 ✅난도 하

- **종료 연출**실루엣 박수 펄스(scale 0.95↔1.05 ×3) + 박수 SFX
build-sfx트윈 lens-api프리뷰 ✅난도 하

- **아이콘·폰트·사운드**Material 아이콘(skip_next, flag, replay), 시스템 폰트 롤, 차임/박수/틱 WAV
icon-selectorfont-selectorbuild-sfx프리뷰 ✅난도 하

#### Stretch 3개

- **ASR 필러 워드 카운터**"um/uh/like/그니까/음" + 6 s 침묵 시 카드 자동 확장. 설정 OFF 기본, OFF면 UI에서 완전히 숨김, 버튼 대체 유지
LensStudio:AsrModulespecs-asr프리뷰 ⚠️ 로그인 시난도 중

- **덱 가져오기**텍스트 입력 키보드로 섹션 추가
specs-keyboardUIKit TextInputField프리뷰 ✅난도 중

- **LLM 피드백 문장(제외 권고)**Remote Service Gateway, 하드코딩 폴백 필수
specs-ai-remote-service프리뷰 ⚠️난도 상

06

### 유저 플로우
입력 = 시선(머리 회전) + 핀치 · 음성은 Stretch

플로우 A · 착용 → 시작

1. **착용/실행**프리뷰: Preview 패널 Interactive, 가상 방. 1.1 m 앞·눈높이 +10 cm(R6에서 위로 이동)에 Setup 패널(40×30 cm)만 등장(습관②)→ S1 Setup
1. **핀치로 설정**길이 슬라이더 3분, 청중 6, 덱 "Eyes Up pitch". 음성 대안 없음(단순 유지)→ S1
1. **Start rehearsal 핀치**패널 0.3 s 축소 후 사라짐, 틱 SFX→ Placing
1. **스테이지 배치**머리 yaw 기준 정면 2.5 m 바닥에 청중 6명이 0.6 m 간격 반원으로 0.5 s 페이드인. 55 cm 앞·30 cm 아래 포디움. 0:00에 큐카드 1이 4 s 후 꼬리표로→ S2

플로우 B · 핵심 인터랙션 루프

1. **말하며 청중을 둘러봄**보는 청중 후광이 1 s 안에 환해지고 실루엣이 1.05로 다가옴. 소리 없음→ S2 히어로
1. **한 구역 8 s 이상 외면**그쪽에서 차임(공간 음향) + 시야 가장자리 호박색 셰브론 3 s. 고개를 돌리면 즉시 소멸→ S3 넛지
1. **Next 핀치 또는 꼬리표 1 s 응시**섹션 전환 + 카드 4 s, 또는 현재 카드 재확장 4 s. (Stretch, OFF 기본) "Next" 발화 = Next 버튼→ S4 포디움+카드
1. **잠깐 내려봄**포디움은 고개를 약 12° 내릴 때만 보임(손목시계 은유). 타이머 숫자는 포디움에만, 청중 쪽에는 발밑 라인만→ S4
1. **남은 60 s / 30 s / 0 s**바닥 라인 펄스 1회/2회, 0 s에 호박색 고정 + 짧은 톤(계속 진행 가능)→ TimeUp

플로우 C · 종료

1. **Finish 핀치**또는 설정 길이 +30 s에 "Finish?" 카드 자동 안내. 청중 박수 펄스 + SFX 1.5 s→ Finishing
1. **요약 확인**포디움·카드 사라지고 1.5 m 앞·눈높이에 Summary 패널(50×40 cm), 막대 0.6 s 채움→ S5 Summary
1. **Again 핀치**같은 설정으로 스테이지 배치부터→ Placing
1. **Done 핀치**Setup으로 복귀→ S1

상태 머신 노드·엣지 (EyesUpApp.ts 기준)

노드: `Launch` → `Setup` → `Placing` → `Rehearsal` → (`Nudge`, `CardExpanded`, `TimeUp` 서브상태) → `Finishing` → `Summary` → {`Setup`, `Placing`}

    ``    ````   ``  ```` ``

| 엣지 | 트리거 |
|---|---|
| Launch → Setup | 렌즈 시작 |
| Setup → Placing | pinch Start |
| Placing → Rehearsal | 페이드인 완료(0.5 s) |
| Rehearsal → Nudge | zoneAttention(z) < 0.2 for 8 s |
| Nudge → Rehearsal | gazeZone == z 또는 3 s 경과 |
| Rehearsal → CardExpanded | pinch Next/Prev 또는 dwell(pill) ≥ 1 s 또는 (Stretch) 침묵 6 s |
| CardExpanded → Rehearsal | 4 s 경과 |
| Rehearsal → TimeUp | elapsed ≥ target |
| Rehearsal/TimeUp → Finishing | pinch Finish |
| Finishing → Summary | 박수 연출 1.5 s |
| Summary → Placing / Setup | pinch Again / pinch Done |
| 어디서나 → Placing | pinch Re-place(포디움 좌측 소형, Rehearsal 중 숨김) |

[07 화면 목업: 아티팩트 참조]

08

### 실행 계획

#### 기술 구조 · 씬
 Scene (SPECS Base Template) ├── Camera (Perspective + DeviceTracking: World) ← 템플릿 ├── SpectaclesInteractionKit (prefab) ← 템플릿 ├── EyesUp (Root) [EyesUpApp.ts: 상태 머신, 서비스 주입] │ ├── SetupPanel [UIKit Frame/Flex; SetupPanel.ts] │ ├── Stage [StagePlacer.ts: 시작 yaw 기준, Re-place] │ │ ├── Audience_1..9 (prefab) [AudienceMember.ts] │ │ ├── StageLine [StageLine.ts: 진행률·펄스] │ │ ├── CueCard [UIKit; CueCardController.ts; Billboard] │ │ ├── NudgeAudio_L / NudgeAudio_R [공간 AudioComponent] │ │ └── EdgeHint [EdgeHint.ts] │ ├── Podium [UIKit BackPlate/Flex + SIK PinchButton ×4] │ ├── SummaryPanel [UIKit; SummaryPanel.ts] │ └── Services [GazeTracker, SessionStats, DeckData, │ AudioCues, (Stretch) AsrFillerCounter] └── Tests ├── LeafScenariosIndex (ScriptComponent) └── ScriptedGazeProvider (테스트에서만 활성)

#### 스크립트 모듈 · `Assets/Scripts/`

   ```````` ```````` `````` ```` ```` `` ```` `` `` `` ````

| 모듈 | 책임 · 핵심 API |
|---|---|
| EyesUpApp.ts | 상태 머신, 서비스 주입, @input 튜너블(각도 7°, 채움 1 s, 소진 12 s, 넛지 8 s, 카드 4 s, dwell 1 s) · BaseScriptComponent, UpdateEvent |
| GazeProvider.ts | interface GazeProvider { origin; forward } + CameraGazeProvider / ScriptedGazeProvider(LEAF가 forward 설정) |
| GazeTracker.ts | 청중별 각도, lookingAt(i), 구역 집계, pill dwell · vec3.angleTo |
| AttentionMeter.ts | attention[0..1] 적분, 후광 알파/색, 스케일 · mainPass.baseColor |
| NudgeController.ts | 구역 방치 8 s → 공간 차임 + EdgeHint · AudioComponent.play(1) |
| CueCardController.ts | pill↔card 트윈, Next/Prev/dwell/(ASR 침묵) |
| Podium / SetupPanel / SummaryPanel.ts | UIKit 생성·onTriggerEnd 바인딩 |
| StageLine.ts | 진행률·펄스 · MeshBuilder 또는 얇은 Frame |
| SessionStats.ts | 구역 응시 시간, 최장 외면, 카드·넛지 수, 균형 점수 |
| DeckData.ts | 샘플 덱 2종(JSON 상수) |
| AsrFillerCounter.ts | (Stretch) AsrModule.startTranscribing, 필러 사전, 침묵 6 s |

#### 일정 (15일, 하루 3~5시간)

D1 · 10/26(일)**환경 + 루프 1회 완주**Snap 계정, LS 5.24.1, Node, Git. SPECS → Base Template → Save As `eyes-up/`. Claude Code 시작, `/mcp`, `/plugin install ls-clad@ls-extensions`, skill pack 설치. 컨셉 영상, 프리뷰 조작. "큐브 + 핀치 버튼 색 바꾸기" 빌드 → verify-preview

D2 · 10/27**LS 기초 + plan-lens 인터뷰**Scene/Inspector/Preview/Logger/TS `@component @input` 2 h, SIK·UIKit 문서. 인터뷰 → `design-brief.md` approved

D3 · 10/28**CLAD 빌드 M1**`/clear` → 핸드오프 프롬프트: 상태 머신, 청중 배치, 포디움 Next/Finish, 카드 pill↔card

D4 · 10/29**시선 → 후광**GazeTracker + AttentionMeter + SessionStats. Live Build Session 10/30 01:00 KST(녹화 시청)

D5 · 10/30**넛지**NudgeController + EdgeHint + 공간 차임(build-sfx), StageLine 타이머

D6 · 10/31**완결 루프**SetupPanel, SummaryPanel, 박수 연출, 버퍼

D7 · 11/1**디자인 패스**서서 걷기, 2.5 m 가독성, 포디움 각도, 알파 → 디자인 노트로 수정, 전/후 스크린샷 → build-notes.md, walkthrough/

D8 · 11/2**LEAF 6 시나리오**설치, ScriptedGazeProvider, 작성·실행·수정 → leaf-results.md

D9 · 11/3**Stretch 타임박스 1일**ASR 필러 카운터(OFF 기본). 실패 시 제거하고 Risks에 기록

D10 · 11/4**버그·성능**프리뷰 60 fps, 아이콘/폰트, build-notes 정리

D11 · 11/5**리뷰 신청**Discord에 진행 영상, Live Project Review 11/6 02:00 KST(녹화 시청)

D12 · 11/6**피드백 반영, 기능 동결**RC

D13 · 11/7**영상**프리뷰 1080p 녹화(QuickTime/OBS), 영문 VO, 타이틀 카드, ≤ 2:50

D14 · 11/8**제출 초안**README(영문), devpost/ 완성, 사용 템플릿·패키지 공개, 라이선스, 레포·YouTube public, Devpost 초안 저장

D15 · 11/9**제출**11/9 22:00 KST까지 제출(마감 11/10 07:00 KST, 9시간 버퍼)

#### 3분 영상 시나리오 (영문 VO)

0:00–0:08검은 배경 텍스트 · "Most people rehearse a talk looking at a screen. Then on stage, they keep looking for one."

0:08–0:20타이틀 "Eyes Up — rehearse with your eyes on the room" · "Eyes Up puts a small audience in your room, so you practice looking at people, not notes."

0:20–0:35who/why 카드 · "For non-native speakers, students, founders… A laptop does the opposite."

0:35–0:50Setup → Start → 청중 페이드인, WASD 한 발 뒤로 · "Three pinches. Six people appear 2.5 meters ahead, at real scale…"

0:50–1:10마우스 룩 스윕, 후광 점등 · "Look at someone, and their halo fills in a second. Look away, and it cools over twelve."

1:10–1:30오른쪽 응시 → 왼쪽 차임+셰브론 → 해소 · "…a chime and a small arrow at the edge, not a popup in your face."

1:30–1:50포디움 Next → 카드 4 s → pill, pill 응시 → 재확장 · "Controls live where your hands rest…"

1:50–2:0530 s 라인 펄스 → Finish → 박수 → Summary · "22, 58, 20. Longest look-away: 11 seconds, left."

2:05–2:35터미널: plan-lens 발췌 → design-brief.md → CLAD 로그·MCP 스크린샷 → LEAF 6/6 PASSED → 디자인 노트 전/후(카드 글자 3 cm→4 cm)

2:35–2:504습관 매핑 카드 · "What I learned: put information on the thing, show it only when needed, a few big targets, and point to what's out of view."

2:50–2:58레포·한계 · "Logic proven in the preview; feel unproven on glasses. Repo and brief in the description."

#### Claude Code + skill pack + MCP 활용

- **역할 분리**: `plan-lens`(Devpost) = 설계 결정은 내가, 에이전트는 인터뷰·검증. `ls-clad`(Snap) = 빌드·검증·테스트. 수정은 "디자인 노트"로만 → `build-notes.md`에 날짜·노트·결과 스크린샷(영상 2:05~2:35 소재)
- **MCP 증거**: `CaptureRuntimeViewTool` 스크린샷, `PreviewInteractTool` 배치 로그, LEAF Logger를 `devpost/walkthrough/`에. `RunAndCollectLogsTool` 오류 → 수정 사례 1개
- **프롬프트 전략**: skill pack 원문 프롬프트 1회 → "Milestone 2: …"처럼 브리프 섹션을 인용해 범위 고정. 큰 변경마다 `/clear`. `verify-preview`는 매 변경 후, LEAF는 동작이 굳은 뒤
- **프로젝트 CLAUDE.md**: cm 단위·팔레트·타입 롤·"코드 대신 디자인 노트" 원칙, 금지(검정, 헤드락 패널, 커스텀 제스처, 음성 단독 입력)
 devpost/ ├── design-brief.md # plan-lens 산출(approved) ├── build-notes.md # 마일스톤별 CLAD 프롬프트, MCP 툴 사용, │ # 디자인 노트 수정 이력(전/후 이미지), 버그 ├── leaf-results.md # 6 시나리오 PASSED 로그, 테스트 없는 항목 ├── walkthrough/ # 01-setup.png … 06-summary.png, │ # nudge-before/after.png ├── learnings.md # 4습관·3강점 매핑, logic/feel 표 └── submission.md # what/who/learned + 영상 스크립트

#### LEAF 시나리오 (Done criteria 1:1 + 1)

1. `start_places_audience`: Start → 0.6 s 후 Audience ×6 활성, 거리 250±5 cm
1. `gaze_fills_halo`: ScriptedGaze #3 1.2 s → attention[3] ≥ 0.95, #1 ≤ 0.1
1. `neglect_triggers_nudge`: R 구역 8.5 s → EdgeHint 활성·"left", 넛지 1; L로 0.5 s → 비활성
1. `next_shows_card_then_pill`: Next → "Why glasses" 표시, 4.3 s 후 pill
1. `dwell_expands_pill`: pill 1.1 s 응시 → 카드 확장
1. `finish_shows_summary`: Finish → Summary 활성, 구역 % 합 100±1, 시간 `m:ss`

LEAF는 프리뷰 카메라를 못 움직이므로 시선은 `GazeProvider` 인터페이스로 분리해 주입한다. 공간 음향 방향·가독성은 테스트 없음으로 명시.

#### 리스크와 완화

**Lens Studio 학습 곡선(경험 0, Mac)**
완화: D1~D2에 Base Template·Interactive Preview·Inspector·Logger만. 씬 조립은 CLAD, 나는 디자인 노트·검증·테스트 설계(skill pack 요구 역할과 일치). 3D는 MeshBuilder나 구+캡슐 프리미티브로 Blender 없이. 셰이더·VFX 금지

**MCP/CLAD 세팅**
완화: D1 Snap 계정 → LS 5.24.1 → 폴더에서 Claude Code → `/mcp`(토큰 바뀌면 서버 제거·재추가, [가이드](https://developers.snap.com/lens-studio/features/lens-studio-ai/developer-mode/with-claude-code)) → `/plugin` ls-clad → 큐브+버튼 hello 빌드. 막히면 [트러블슈팅](https://developers.specs.com/docs/clad/troubleshooting/troubleshoot-lens-studio-mcp), Devpost Discord SPECS 채널. D2 저녁까지 안 돌면 전환 대신 MVP 축소(설정 패널 제거, 청중 3명)

**프리뷰 제약**
완화: 핵심 입력 2개만(카메라 회전, 클릭). ASR·LLM은 Stretch·토글 OFF 기본, 끄면 완전히 숨김. LEAF용 `CameraGazeProvider`/`ScriptedGazeProvider` 분리. 바닥은 프리뷰 가상 방(머리 -160 cm) + Re-place

**청중 비주얼 품질**
완화: 얼굴 없는 반투명 실루엣을 의도된 디자인으로 설명(가산 디스플레이에 밝은 색 유리, 언캐니 밸리 회피, 드로우콜 절약)

#### 제출 체크리스트

- 제출 기간 중 새 코드만. Base Template·SIK·UIKit·LEAF·CLAD 생성 에셋을 README에 명시
- 음악·효과음 전부 `build-sfx`/`build-music` 생성(저작권 음악 금지), 상표·로고 없음
- 영상 3:00 미만, YouTube public, 프리뷰 화면 녹화, 영어
- 레포 public, `.esproj`·`Assets/`·`devpost/` 포함, README 영문
- Devpost 텍스트: what / who / learned 3단락 + 사용 도구(CLAD, Lens Studio MCP, LEAF, plan-lens)
- `design-brief.md` `status: approved`
- LEAF 6 시나리오 결과 로그 + 테스트 없는 항목(공간 음향 방향, 가독성) 명시
- "logic proven / feel unproven" 표
- Lens 이름 중복 확인(Snap Lens 검색·Devpost 검색)
- 11/9 22:00 KST 제출 완료, 제출 후 레포 변경 금지(설명·링크만)

출처: [대회](https://learn-specs.devpost.com/) [skill pack](https://github.com/challengepost/learn-specs) [CLAD agents & skills](https://developers.specs.com/docs/clad/overview-section/agents-and-skills) [LEAF](https://developers.specs.com/docs/clad/tools/test-your-lens-with-leaf) [Positioning & Sizing](https://developers.snap.com/spectacles/best-practices/design-for-spectacles/positioning-sizing-content) [UI Design](https://developers.snap.com/spectacles/best-practices/design-for-spectacles/ui-design) [AI glasses 타이포(0.6°)](https://developer.android.com/design/ui/ai-glasses/guides/styles/type) [LS 5.24](https://ar.snap.com/download/v5-24-0)
