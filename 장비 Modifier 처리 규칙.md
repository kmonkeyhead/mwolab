# 장비 Modifier 처리 규칙

이 문서는 장착 장비의 `weapon_stat_filters`를 무기 최종 수치에 적용하는 공통 규칙을 정의한다.
무기 계산의 상위 규칙은 `무기 관련 에이전트.md`, 현재 코드 경로는
`wiki/mwolab-implementation-wiki.html`을 따른다.

## 1. 데이터 추적

- 멕 이름이나 장비 표시명을 기준으로 효과를 하드코딩하지 않는다.
- 현재 멕의 유효 정의에서 고정 장비와 사용자가 장착한 모듈을 수집한다.
- 장비 ID로 `equipment.json`의 원본 장비를 찾고 `weapon_stat_filters`를 읽는다.
- 무기 원본 `name`과 필터의 `compatible_weapons`를 정규화한 뒤 정확히 일치시킨다.
- 표시명, alias 또는 무기 계열만으로 필터 대상을 확장하지 않는다.
- 하나의 무기가 여러 필터에 일치하면 일치한 필터를 모두 적용한다.

```text
effective mech definition
→ fixed / installed module
→ equipment item
→ weapon_stat_filters (원본 배열 순서)
→ compatible_weapons exact match
→ WeaponStats (원본 배열 순서)
```

## 2. 연산

- `operation: "+"`는 현재 값에 operand를 더한다.
- `operation: "*"`는 현재 값에 operand를 곱한다.
- 원본에 없는 숫자 필드에 `+`가 처음 적용되면 0을 기준으로 한다.
- 필터 배열 순서와 각 필터의 `weapon_stats` 배열 순서를 보존한다.
- 원본 장비 JSON과 무기 객체는 변경하지 않고 브라우저 메모리의 파생 스냅샷만 만든다.
- 필드 의미나 기본값을 장비명·접미사·유사 장비로 추정하지 않는다.
- 추출 데이터의 `ShotsDuringCooldown` 표기는 원본 무기와 필터 양쪽에서 하나의 `shotsDuringCooldown`으로 정규화한다. 더블탭 시도 수는 이 최종값을 소비한다.
- 지원 장비별로 근거가 확인된 필드 집합만 공용 연산기에 등록한다. 각 기체 전용 계산식을 만들지 않으며, 같은 장비 ID가 여러 번 들어오면 occurrence를 제거하지 않고 입력 순서대로 적용한다.
- 파생 결과에는 모듈 occurrence, 필터·스탯 인덱스, 필드, 연산자, operand와 연산 전후 값을 기여 내역으로 보존한다.

## 3. Modified Ballistic Loader

- BANE-L 이름이 아니라 유효 정의의 고정 장비 ID `9031`을 통해 찾는다.
- ID 9031의 모든 정확 일치 필터를 적용한다.
- 현재 수치 변환 스냅샷이 처리하는 필드는 다음과 같다.
  - `damage`
  - `numFiring`
  - `numPerShot`
  - `spread`
  - `volleydelay`
- 공통 Projectile 필터의 `speed`, `critChanceIncrease`와 Range 필터는 기존 Target Computer collector가 처리한다. 수치 변환 스냅샷에서 다시 적용하지 않는다.
- 크리티컬 단계의 원본 값 `-1`은 계산 가능한 수치가 아니라 단계 없음 센티널이다. Target Computer와 9031의 크리티컬 가산이 있어도 해당 단계는 증가·감소하지 않고 `X`로 유지한다.
- C-UAC의 Ultra, Jam 확률과 Jam 지속시간 필드는 Loader가 변경하지 않는다.

### 결과 예시

- HAG: `spread +0.5`, `numPerShot +3`, `damage ×0.34`, `volleydelay ×0.7`; HAG20/30/40의 SHOTS는 `3 X 4`, `3 X 6`, `3 X 8`
- Clan Gauss: `spread +0.25`, `numPerShot +4`, `damage ×0.25`; 전탄 동시 `SHOTS 4`
- C-AC/C-UAC: 필터별 `numFiring` 감소 후 `damage` 배율 적용; 최종 `SHOTS 1`

## 4. Modified Missile Loader

- NAGA-AM 이름이 아니라 유효 정의의 고정 장비 ID `9032`를 통해 찾는다.
- ID 9032의 정확히 일치하는 모든 필터를 원본 순서로 적용한다.
- 지원 필드는 `numFiring`, `ammoPerShot`, `volleydelay`, `cooldown`, `MinReactivationTime`이다.
- C-LRM 5/10/15/20 일반·Artemis와 C-ATM 3/6/9/12의 exact `compatible_weapons`만 대상이며 IS LRM, C-SRM 등으로 계열 확장하지 않는다.
- `MinReactivationTime`과 추출 데이터의 `MinReactivationTIme` 표기는 하나의 `minReactivationTime`으로 정규화한다. 최종값은 스냅샷에 보존하지만 소비 공식이 확정되기 전에는 쿨다운 하한이나 사이클에 사용하지 않는다.
- `volleysize`는 필터가 변경하지 않으므로 원본을 유지한다. 발사 수 감소에 따른 피해 변화와 탄약 소비는 별도 보정 없이 공용 무기 공식의 최종 `numFiring`과 `ammoPerShot`을 사용한다.
- 공용 SHOTS 규칙에 따라 C-LRM20/15/10/5는 `2 X 4`, `2 X 3`, `2 X 2`, `2`, C-ATM12/9/6/3은 `1 X 8`, `1 X 6`, `1 X 4`, `1 X 2`로 표시한다.
- 장비 자체 툴팁은 `LRM / ATM VOLLEY — STREAM FIRE`, 대상 무기의 적용 효과는 `FIRING MODE — STREAM FIRE`만 표시하고 내부 modifier 행은 노출하지 않는다.

## 5. UAC Speed Loader

- SCR-CORLGD 이름이 아니라 유효 정의의 고정 장비 ID `9035`를 통해 찾는다.
- 지원 필드는 `shotsDuringCooldown` 하나다. 필터의 `ShotsDuringCooldown +1`을 원본 값에 더해 더블탭 시도 수를 `1`에서 `2`로 만든다.
- IS·Clan 울트라 AC 2/5/10/20의 exact `compatible_weapons` 8종만 대상이며, 잼 수치가 있는 RAC나 다른 탄도 무기로 확장하지 않는다.
- 최종값은 예상 쿨다운과 시뮬레이션이 함께 소비한다. 잼 확률·잼 지속시간·발사 수·피해·쿨다운은 이 장비가 바꾸지 않는다.
- 이 장비의 원본 설명은 Targeting Computer MK I 성능을 함께 낸다고 하지만 추출 데이터가 이를 뒷받침하지 않는다. Target Computer의 성능은 `ctype`이 아니라 필터가 선언하며, 실제 MK I~VIII은 모두 BeamWeapons `critChanceIncrease` + Range 배율과 ProjectileWeapons `critChanceIncrease` + `speed`를 갖는다. 9035의 필터는 ProjectileWeapons 하나뿐이고 이 값이 전혀 없다. `CTargetingComputerStats`는 Railgun Capacitor·Advanced Sensor Package·9032도 공유하는 컴포넌트 클래스일 뿐 Target Computer 성능을 뜻하지 않으며, SCR-CORLGD에 별도 Target Computer가 고정되어 있지도 않다.
- 같은 문구를 가진 9031은 실제로 MK I과 같은 필터를 갖고 있지만(`speed`만 ×1.05로 약함) 9032는 9035처럼 문구만 있고 필터가 없다. 설명대로라면 PGI가 두 장비의 필터를 빠뜨린 것으로 보이나, 빠진 수치를 앱이 만들어 넣지 않는다. 나중에 원본에 필터가 추가되면 기존 Target Computer collector가 `critChanceIncrease`·`speed`·Range를 그대로 읽어 처리하고 센서 보너스 판정도 함께 켜지므로 코드 변경은 필요하지 않다.
- 필터의 연산값은 장비 자체 툴팁과 대상 무기의 `적용 효과`에 `UAC DOUBLE TAP +1`로 표시하고 두 곳 모두 발리스틱 색을 사용한다. 무기 스탯 행에는 시도 횟수를 넣지 않는다.

## 6. 계산 소비 경로

같은 유효 스냅샷을 다음 경로가 함께 사용해야 한다.

- 발사당 직격·스플래시·총 피해
- projectile 및 pellet 수
- 탄약 1회 소비량
- 발사 이벤트 수, 발사 간격, 예상 쿨다운
- 더블탭 추가 발사 시도 수
- spread와 Artemis·spread 쿼크의 후속 계산
- 무기 툴팁의 DAMAGE, SHOTS, SHOT INTERVAL, SPREAD, DPS, DPH
- 빌드 Alpha Damage와 탄약 요약
- DPS 시뮬레이션의 피해, shot count, shot delay, firing time

전역 장비 정보 표처럼 현재 멕과 무관한 화면은 빈 모듈 목록을 전달해 원본 무기 수치를 유지한다.

## 7. 쿼크 및 다른 장비와의 순서

- 장비 Modifier와 배리언트·옴니포드·세트·스킬 쿼크는 별도 계층이다.
- 먼저 장비 Modifier로 무기 기본 발사 구조를 만든 뒤, 해당 최종 스탯에 기존 쿼크 공식을 적용한다.
- BANE-L의 Gauss/HAG cooldown, 탄약 감소 등 기체 쿼크를 9031 필터에 섞지 않는다.
- Target Computer 공통 speed·critical·range 값은 한 번만 적용한다.
- Artemis와 Railgun Capacitor 같은 별도 장비 공식도 자신의 기존 계산 경로에서 한 번만 적용한다.

## 8. 표시

- 무기 툴팁의 `적용 효과`에는 장비 표시명을 출처 제목으로 사용한다.
- 무기 스탯의 `SHOTS`는 `한 이벤트의 발사체 수 X 완전한 이벤트 횟수 + 나머지 발사체 수` 공식을 사용한다. 실효 이벤트가 하나이거나 실효 `volleydelay`가 0이면 전체 발사체 수만 표시한다. Modifier로 표현이 달라지면 최종 표현 전체를 초록색으로 표시한다.
- 기능 모드 다음에 표시가 허용된 실제 필터의 연산값을 원본 순서대로 표시한다.
- Modified Ballistic Loader의 `PELLETS / SHOT`, `DAMAGE / PROJECTILE`, `PROJECTILES`와 HAG·Clan Gauss의 `SPREAD` 연산값은 계산에는 적용하지만 장비 자체 툴팁과 무기 `적용 효과`에는 표시하지 않는다.
- HAG의 `volleydelay ×0.7`은 두 툴팁에서 대상 무기 목록 없이 `C.HAG INTERVAL ×0.7`로 표시한다. UAC Speed Loader의 `ShotsDuringCooldown +1`도 같은 방식으로 `UAC DOUBLE TAP +1`로 표시한다.
- 표시 대상 필드의 라벨·자릿수·색·표시 조건은 장비 ID별로 한 곳에 정의하고, 장비 자체 툴팁과 무기 `적용 효과`가 같은 정의를 읽어 같은 표기를 만든다.
- 무기 `적용 효과`의 색은 대상 무기의 하드포인트 계열을 따른다. 장비 자체 툴팁 행에 색을 줄 때는 필드 정의의 색을 쓰고, 행 전체가 같은 색이 되도록 라벨과 값이 색을 상속하게 한다.
- 고정 전용 장비는 `amountAllowed`가 0이므로 장비 툴팁에 `MAX EQUIPPED`를 표시하지 않는다.
- 이 효과를 받은 HAG 무기 스탯의 최종 `SHOT INTERVAL` 값은 장비 Modifier 적용값임을 나타내도록 초록색으로 표시한다.
- 그 외 표시 대상 연산값은 장비 자체 툴팁에도 호환 무기와 필터 데이터를 읽어 표시한다.
- 표시값을 무기명에서 추론하거나 최종값의 차이로 역산하지 않는다.

## 9. 다른 특수 장비 확장

- NAGA-AMAROK도 BANE-L과 같은 공용 연산기를 사용하며 효과 내용만 장비별 지원 필드로 구분한다.
- 다른 장비를 계산에 연결할 때는 해당 장비의 명시 필드와 공식이 확정된 뒤 지원 ID와 필드를 추가한다.
- 지원 집합에 등록하지 않은 필드는 필터에 값이 있어도 무시하고 원본 수치를 유지한다. 새 장비가 `shotsDuringCooldown`처럼 이미 정규화된 필드를 쓰면 해당 장비 ID에 필드를 추가하는 것만으로 연결된다.
- 새 장비를 추가할 때는 정확 매칭, 여러 필터 중첩, 원본 순서, 비대상 장비 불변, 빌드·툴팁·시뮬레이션 일치를 함께 테스트한다.
