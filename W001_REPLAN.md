# W001 semantic-slice revalidation replan (v3)

## 범위

`[2수04-02]`의 기존 FAMILY_TRACK 승인(`W001-FAMILY_TRACK-SOL-A3`)은
구현 자체가 아니라 revalidation fingerprint 범위가 97개 표준 루프와 맞지 않아
재계획한다. 이 문서는 W001의 target set이나 data-table family를 바꾸지 않는다.

## 변경 불변량

1. 해당 테스트와 `[2수04-02]` target source는 implementation file hash로 묶고,
   `data-table-organize.ts`는 `LEARNING_MAP_USAGE_SNAPSHOT_SHA256` 전역 상수만
   정규화한 source-module slice로 묶는다.
2. 공용 learning-map snapshot은 전체 파일 hash로 묶지 않는다. `[2수04-02]`가
   들어간 topic·dependency record만 `learning-map` semantic slice로 추출하고,
   다른 표준을 추가해도 W001 artifact가 stale되지 않아야 한다.
3. cognitive/native 전역 registry의 unrelated family 추가는 W001을 stale시키지
   않는다. 다만 `packages/validator/src/native/registry.ts`의
   `dataTableHandler` 함수 slice는 W001 dependency로 직접 결속하고, 그 함수가
   바뀌면 stale가 된다. registry의 나머지 공용 계약 변경은 별도 engine/core
   검토 범위에서 다룬다. resolved problem-family registry에서는
   `data.early-table.organize-v1` record만 familyId·target IDs·blueprint hash·scope와
   함께 semantic slice로 결속한다.
4. semantic slice 자체가 바뀌거나 W001 implementation file가 바뀌면 fingerprint는
   반드시 stale가 되어 새 FAMILY_REVALIDATION을 요구한다.
5. target set은 이미 승인된 두 target을 그대로 사용하므로 replan 승인 뒤 TARGET_SET을
   다시 요구하지 않는다(`replanTargetSetRequired=false`).
6. replan 승인 기록은 다음 FAMILY_REVALIDATION attempt와 독립적으로 유지된다.
   revalidation 승인 뒤에는 `familyValidated`와 registry/coverage 파생 보고서를 함께
   갱신하여 FAMILY_TRACK으로 되돌아가지 않는다.
7. FAMILY_REVALIDATION 승인 후 파생 커밋은 registry, curriculum coverage, execution,
   no-family plan을 모두 포함해야 하며, gate는 operation manifest 밖의 `reports/**`를
   묵인하지 않는다.

## 검증 순서

Luna는 이 문서와 semantic-slice helper·builder/status 변경을 candidate로 고정하고,
Sol은 다음을 독립 검증한다.

- 이전 전역-hash artifact가 새 contract에서 거부되는가
- 같은 `[2수04-02]` topic만 바꾸면 stale가 되는가
- 다른 표준 topic만 추가하면 current가 유지되는가
- FAMILY_REVALIDATION `changes-requested`가 같은 SOL_REVIEW에 머물지 않고
  `SOL_REPLAN`으로 이동하는가
- FAMILY_REVALIDATION 승인 뒤 `replanApproved/replanConsumed`와 family validation이
  유지되고, registry 보고서도 stale가 아닌가

이 조건을 통과한 뒤에만 W001 artifact를 새 fingerprint로 재생성한다.
