# P1 GO — 비고정형 blueprint 이관

## 판정

**P1 GO — Kiro Opus 5 freeze 승인**

기존 활동을 `TeacherIntent → ActivityBlueprint → ItemGenerator(seed) →
LayoutResolver → ResolvedActivity → ToolAdapter → CompiledProject` 경로로 이관했다.
기존 분수 전용 `ActivitySpec`은 승인 해시를 보존하는 boundary projection으로만
남고, 활성 draft와 compiler·validator는 `ResolvedActivity` 하나만 사용한다.
첫 Opus 검토에서 발견된 분수 역할명·판정·배치의 core 결합은 등록형
activity/predicate/native/layout handler 경계 밖으로 이동했다. 재검증 결과는
`P1_VERDICT: PASS`, `CORE_BRANCHES: 0`, `P2_GO: GO`다.

## 이관 전후 결합

| 이전 | 현재 |
|---|---|
| template 한 파일에 문제 은행·좌표·semantic object 결합 | versioned blueprint + seed item generator |
| compiler가 문제·ID suffix·배치를 직접 순회 | ordered resolved emission + 폐쇄형 adapter |
| validator가 활동 역할명·분수 판정을 직접 검사 | generic 4계층 + 등록형 predicate/native handler |
| draft v1·v2가 이전 승인 view 저장 | draft v3가 resolved + blueprint/generator binding + 범용 승인 view 저장 |
| 절대 좌표가 활동 코드에 존재 | blueprint에는 preset 이름만, 수치는 core 밖 layout preset에만 존재 |

v1·v2 저장 draft는 묵시 변환하지 않고 `draft-schema-expired`로 격리한다.

## P0 골든 동등성

fixture는 수정하지 않았다.

```text
activitySpecHash  44ef3788e83023bbac099a122693a3ca30d1eed5e0ece55333461808e3417783
payloadHash       fa0b8e750338ef3a083b22e64e1fc820fa680b8bfd8fb20781e31a661bace861
approvalHash      b4a4604ec75f9cfb5dbc979713e92f1ab85c40e82d2cbc5e37c8142a8f3ffbca
validation        canCreate=true, issue=[]
```

학습 목표, 문항 값, semantic role, lock/movable, 초기 학생 제약, native object 순서,
좌표, payload, 승인 해시가 모두 동일하다. 골든 재기준화와 live write는 없었다.

## deep contract와 support state

P1이 사용하는 `common.text`, `common.formula`, `common.rectangle`, `NO03FM`은 P0.5의
생성·저장·재열기 근거와 released adapter를 그대로 사용한다. 신규 tool ID, option,
raw native escape hatch는 추가하지 않았다.

## 하드코딩 방지 규칙

| 규칙 | 증거 |
|---|---|
| 1. versioned blueprint identity | id/version/contentHash strict schema |
| 2. blueprint 절대 좌표 금지 | `x/y/width/height` deep reject test |
| 3. raw payload 금지 | `contentsJson/canvasOption` deep reject test |
| 4. 문자열 결합 참조 금지 | binding path와 typed ID role schema |
| 5. 직접 정답 금지 | answer/correctRelation/generated item key reject |
| 6. 함수·script 금지 | JSON primitive parameters와 function reject |
| 7. 문항 직접 나열 금지 | generator ID/version/finite parameter만 허용 |
| 8. 미검증 도구 금지 | 기존 released adapter registry fail-closed |
| 9. 활동별 core 분기 금지 | core forbidden-literal scan 0건 |
| 10. core 확장 감지 | path+SHA-256 baseline verify |

초기 resolved constraint에는 `requiresStudentAction: true`이면서
`satisfiedInitially: false`인 항목이 존재하고, 전부 만족으로 변조하면 validator가
`activity-initial-state-already-solved`를 보고한다.

## 고정 core와 public surface

- fixed core: 17 files
- manifest:
  `afeefc8c756541f89e9e9bec99a6d20849777037b32003822ebff907e3e5e800`
- baseline: `fixtures/architecture/p1-core-baseline.json`
- public MCP: 기존 5개 유지
- workspace package/dependency: 추가 없음
- `pnpm-lock.yaml`: 변경 없음
- active internal draft schema: 1 (`ResolvedActivity`, draft v3)

## 검증

```text
pnpm typecheck             PASS
pnpm test                  PASS, 22 files / 131 tests
pnpm build                 PASS
pnpm golden:verify         PASS
pnpm contract:verify       PASS
pnpm architecture:verify   PASS
git diff --check           PASS
```

P2는 core diff 0을 유지하면서 blueprint·item-generator·검증된 adapter 데이터 축만
늘려 비분수 활동에서도 구조가 고정 양식으로 굳지 않았음을 증명해야 한다.
