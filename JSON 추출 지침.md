# JSON 추출 지침

## 생성 데이터

- XML은 먼저 원본 바이트 그대로 엄격하게 파싱한다. 엄격 파싱이 실패한 경우에만, XML 시작 태그에서 속성 문자열 밖의 `/` 뒤에 공백·탭과 CRLF·LF 또는 EOF만 남고 닫는 `>`가 없는 형태를 메모리에서 `/>`로 보정해 한 번 다시 파싱할 수 있다. 주석, CDATA, 선언, 처리 지시문, 속성 문자열과 일반 텍스트는 보정 후보가 아니며, 재시도도 실패하면 추출을 중단한다. 원본 PAK는 변경하지 않고 성공한 보정의 원본 경로와 줄 번호만 진단으로 남긴다.

- 의도적인 게임 데이터 갱신에는 `tools/extract_mwo_data.py`를 사용한다. 생성되는 브라우저 데이터는 `public/data/index.json`, `mechs.json`, `equipment.json`, `localization.json`, `loadouts.json`, `omnipods.json`, `shake_damping_mechs.json`, `skills.json`이다.
- 멕 아이콘 전체 갱신에는 `python tools/extract_mwo_mech_icons.py --game-dir "F:\Game\Steam\steamapps\common\MechWarrior Online"`을 사용한다. 추출기는 `GameData.pak`의 `Libs/UI/Screens/Assets/MechIcons/` 바로 아래 PNG를 읽어 basename을 소문자로 정규화하고, `ReplaceIcon`의 대소문자를 무시한 동일 파일명 PNG를 우선 적용한 뒤 `local-mech-icons`와 `public/assets/mech-icons`에 게시한다. 정규화된 파일명이 충돌하면 게시 전에 중단한다. 교체 파일은 PAK에 같은 이름의 원본이 있어야 하며 모든 원본과 교체본은 256×256 8비트 RGBA PNG여야 한다. 기존 대상 폴더에만 있는 별도 아이콘은 삭제하지 않으며, PAK에 없는 현재 멕 아이콘은 기존 브라우저 폴더에 유효한 파일이 있어야 게시를 시작한다.
- `전체 JSON 갱신` 워크플로는 JSON 전체 추출과 위 멕 아이콘 전체 추출·`ReplaceIcon` 적용을 하나의 검증·게시 트랜잭션으로 반드시 함께 수행한다.
- 전체 추출은 `Libs/MechPilotTalents/MechSkillTreeNodes.xml`과 `MechSkillTreeNodesDisplay.xml`에서 `skills.json`을 갱신하고 다른 생성 데이터와 함께 배포해야 한다. `index.json`의 `skill_nodes` 개수가 추출된 모든 스킬 분류의 전체 노드 수와 일치하는지 검증한다.
- 로컬 MWO 설치 경로는 현재 `F:\Game\Steam\steamapps\common\MechWarrior Online`이다. 추출기는 `Game\GameData.pak`, `Game\Localized\English_xml.pak`, `Game\mechs\*.pak`의 섀시 아카이브를 읽는다.
- `localization.json`은 `English_xml.pak`의 `Localization/English/TheRealLoc.xml`에 있는 영문 키와 `TRANSLATED TEXT` 값을 원본 표기 그대로 보존하며 빈 번역 값도 버리지 않는다. 조회할 때만 키의 선택적 선행 `@`와 대소문자를 무시한다. 정규화한 중복 키의 값이 서로 다르면 오류로 중단하고, 같은 값이면 같은 키로 취급한다.
- 멕 `display_name`은 내부 멕 배리언트 이름을 영문 현지화 키로 사용하고, 무기 `display_name`은 원본 `Loc.nameTag`를 사용한다. 키가 현지화 데이터에 없으면 다른 이름을 추론하지 않고 키 자체를 표시명으로 저장하며, 전체 갱신 보고의 별도 누락 키 목록에 멕과 무기를 구분해 출력한다.
- 현지화 데이터에 키가 존재하고 번역된 멕 이름이 정확히 `(T)` 접미사로 끝나면 실제 조립할 수 없는 멕으로 판정하여 `mechs.json`과 `loadouts.json`에서 함께 제외한다. 원본 번역 표인 `localization.json`에서는 해당 키를 삭제하지 않는다.
- MDF의 `definition.stats.VariantType`이 없거나 빈 일반형 멕은 현지화 표시명 대신 MDF의 원본 `definition.stats.Variant` 코드를 최종 표시명으로 사용한다. 일반형에 원본 `Variant`가 없으면 다른 이름을 추론하지 않고 추출을 중단한다. 예: `jm6-de` → `JM6-DE`.
- 비일반형의 현지화된 멕 이름이 `Mechs.xml`에서 추출한 `mech.chassis` 키의 현지화된 카테고리명과 대소문자 구분 없이 일치하는 접두어로 시작하고 그 뒤에 하나 이상의 공백과 나머지 이름이 있으면, 최종 표시명에서 선행 카테고리명과 공백을 제거한다. 이름 전체가 카테고리명과 같거나 카테고리명 뒤가 공백 경계가 아니면 제거하지 않는다. 카테고리명이 정확히 두 단어 `A CLAN`이면 긴 접두어부터 `A CLAN`, `CLAN A`, `A`도 같은 공백 경계 규칙으로 제거한다. 예: `CLAN FLEA WHITEHEAD` → `WHITEHEAD`, `WOLFHOUND WLF-C(L)` → `WLF-C(L)`.
- 내부 멕 배리언트 키가 `lgd`로 끝나고 MDF의 `definition.stats.VariantType`이 `Special`이면 현지화된 최종 멕 이름 뒤에 ` (LGD)`를 한 번만 붙인다. 기본 로드아웃에도 `MechID`로 결합한 같은 최종 표시명을 사용한다.
- 이번 표시명 규칙의 대상이 아닌 설명·쿼크·비무기 장비명은 기존 `ORIGINAL TEXT` 기반 표시를 유지한다.
- 기본 로드아웃 `display_name`은 로드아웃 파일명으로 추정하지 않고 원본 `MechID`로 `Mechs.xml`의 정식 멕 배리언트 키를 찾아 같은 현지화 값을 사용한다. 로드아웃 XML의 원래 `Name`은 `source_name`에 별도로 보존한다.
- 전체 추출 명령은 `python tools/extract_mwo_data.py --game-dir "F:\Game\Steam\steamapps\common\MechWarrior Online" --out public\data`이다.
- 전체 추출은 현재 설치된 게임에서 모든 생성 데이터를 갱신하므로 무관한 밸런스 데이터나 숫자 형식 변경을 포함할 수 있다. 기존 장비와 로드아웃 데이터를 유지하면서 하드포인트만 갱신하려면 `python tools/extract_mwo_data.py --game-dir "F:\Game\Steam\steamapps\common\MechWarrior Online" --out public\data --hardpoints-only`를 사용한다.
- `mechs.json`의 멕 ID 또는 원본 `chassis` 매핑이 달라진 생성 데이터를 운영 웹에 배포할 때는 추출·로컬 검증과 분리된 Firebase 배포 단계에서 `admin/backfill-fitting-chassis.mjs`의 읽기 전용 검사를 먼저 수행한다. 새 복합 인덱스와 정적 클라이언트 배포를 조율한 뒤 관리자 적용 모드로 기존 핏팅의 `chassisKey`와 쓰기 금지 `mechCatalog/{mechId}` 권위 집합을 동기화한다. 카탈로그는 현재 `mechs.json`과 정확히 같은 ID 집합이어야 하며 제거된 멕의 오래된 문서를 유지하지 않는다. 전체 JSON 갱신 자체에는 운영 Firebase 쓰기나 배포를 포함하지 않는다.

## 누락 옴니포드 해결

- 기본 로드아웃 XML과 `MechID`로 연결된 동일 멕 MDF의 동일 컴포넌트를 함께 읽는다. 로드아웃 XML에 `OmniPod`가 없거나 `NULL`이고 MDF에 명시적 숫자 `OmniPod`가 있으면 MDF 값을 최종 기본 로드아웃에 사용한다.
- 빌드 가능한 기본 로드아웃은 `MechID`의 정식 멕 이름과 같은 MDF 정의를 반드시 가져야 하며, MDF의 비후면 몸체 컴포넌트가 로드아웃에서 빠져 있으면 추출을 중단한다. MDF 파싱 실패나 컴포넌트 행 누락을 빈 정의 또는 NULL 포드로 대체하지 않는다.
- 두 원본에 숫자 `OmniPod`가 모두 있으면 값이 같아야 한다. 값이 다르면 어느 한쪽을 우선하거나 이름으로 고르지 않고 원본 충돌 오류로 추출을 중단한다.
- 결정된 모든 옵니포드 ID는 현재 `OmniPods.xml`에 존재해야 하며, 해당 레코드의 `chassis`와 `component`가 멕 및 로드아웃 컴포넌트와 정확히 일치해야 한다. 불일치는 조용히 대체하지 않고 추출을 중단한다.
- MDF의 컴포넌트 `OmniPod`는 원본 필드로 멕 정의에도 보존한다. 로드아웃 XML의 CT 누락은 이름 기반으로 해석할 누락 데이터가 아니라 MDF와 결합해야 하는 원본 구조다.
- 하나 이상의 숫자 포드를 가진 옴니멕은 후방 장갑 의사 컴포넌트를 제외한 모든 몸체 컴포넌트의 포드가 해결되어야 한다. 하나라도 남으면 멕과 컴포넌트를 보고하고 게시 데이터를 쓰지 않는다.
- 로드아웃과 MDF 양쪽 모두에 숫자가 없는 경우에는 이름 동일성, 이름 접미사 제거, 다른 배리언트의 세트, 컴포넌트 정의 유사성만으로 자동 할당하지 않는다. 해당 멕과 컴포넌트를 미해결로 보고하고 추출을 중단하며, 권위 있는 새 원본 또는 사용자가 명시한 새 규칙 없이 생성값을 만들지 않는다.
- `normal_body`, `shared_body`, 이름 기반 숫자 override는 현재 생성 규칙이 아니다. 미래 원본에 실제 예외가 생기면 임시 JSON을 생성값보다 우선시키지 말고 명시적인 새 규칙·검증·테스트를 함께 추가한다.
- 현재 설치 데이터에는 별도 override가 필요한 빌드 가능 옴니멕 컴포넌트가 없다. 과거 `tools/omnipod_null_resolutions.json` 기록은 모두 MDF 직접값으로 대체했고 해당 파일은 생성 경로에서 제거했다.

## Artemis 데이터

- Artemis 데이터는 `GameData.pak`의 `Libs/Items/Weapons/Weapons.xml`과 `Libs/Items/Modules/Ammo.xml`에서 가져온다. `equipment.json`에 무기의 `stats.ammoType`, `stats.artemisAmmoType`, `stats.alwaysHasArtemis`와 탄약의 `stats.type`, `stats.numShots` 원본 속성을 보존한다. 파생 매핑이나 하드코딩된 탄약 수로 대체하지 않는다.
- Artemis 적용 가능 일반 무기와 Artemis 무기는 별도 장비 레코드 및 ID다. 내부 이름은 `<WeaponName>`과 `<WeaponName>_Artemis`로 짝을 이룬다. 1톤 탄약은 `<AmmoName>`과 `<AmmoName>Artemis`, 반톤 탄약은 `<AmmoName>Half`와 `<AmmoName>ArtemisHalf`로 짝을 이룬다. Artemis는 반드시 `Half` 앞에 넣고 뒤에 붙이지 않는다.
- Artemis 업그레이드를 적용하거나 제거할 때 설치된 무기와 탄약 ID를 양방향으로 교체한다. 표시 라벨만 변경해서는 안 된다. 일반 → Artemis → 일반 왕복 후 원본 ID가 복원되어야 한다.
- 앱의 탄약 필터, 피팅 요약 및 탄약 계산은 정규화된 탄약 `stats.type`을 무기의 활성 탄약 타입과 비교한다. Artemis 적용 가능 무기에 업그레이드가 장착됐으면 `stats.artemisAmmoType`, 아니면 `stats.ammoType`을 사용한다. `stats.alwaysHasArtemis` 무기는 선택적 업그레이드 변환 대상이 아니며 원본에 선언된 탄약 타입을 사용한다.
- 탄약 수량은 1톤과 반톤 각각을 포함하여 장착 탄약 레코드의 `stats.numShots`에서 가져온다. Artemis 탄약 수가 항상 일반 탄약과 다르다고 가정하지 않는다. 정규화된 활성 탄약 타입이 같은 무기는 탄약 풀을 공유한다. 동시에 발사 가능한 일제 사격 횟수는 일치하는 탄약 상자를 합산하고 결합된 `ammoPerShot`으로 나누어 계산한다.
- Artemis 회귀 검사는 이너 스피어 및 클랜 LRM·SRM, 1톤과 반톤 탄약, 양방향 업그레이드, 장비 목록 필터, 피팅 정보 패널 총계를 포함해야 한다. 추출 후 `ammoType` 또는 `artemisAmmoType`이 참조하는 모든 일반·Artemis 무기 및 탄약 상대 레코드가 존재하는지 검증한다. 누락된 짝은 표시명 대체로 조용히 처리하지 말고 추출 또는 원본 데이터 문제로 취급한다.

## 하드포인트 데이터

- 멕이 보유한 하드포인트와 장착 능력은 STOCK LOADOUT의 설치 장비로 추론하지 않고 MDF 또는 옴니포드 컴포넌트 원본에서 추출한다. STOCK LOADOUT은 초기 장착 상태만 나타낸다.
- ECM 장착 능력은 일반 멕 MDF의 `ComponentList/Component`와 상세 옴니포드 XML의 `Set/component`에 명시된 `CanEquipECM`을 해당 컴포넌트에 보존한다. 원본 속성명은 대소문자를 무시해 읽고 생성 JSON에서는 `CanEquipECM`으로 정규화한다. 멕 최상위 속성과 컴포넌트 속성을 서로 대신 사용하지 않으며, 원본에 없는 능력을 기본 로드아웃의 ECM 장비로 만들지 않는다.
- 일반 및 옴니포드 무기 용량은 각 섀시 아카이브의 `*-hardpoints.xml`에서 가져온다. MDF 또는 옴니포드의 하드포인트 `ID`를 `<Hardpoint id="...">`와 연결하고 직접 자식 `<WeaponSlot>`의 개수를 `weapon_slots`에 저장한다.
- 선행 0이 있는 숫자 ID도 같게 비교되도록 하드포인트 ID를 정규화한다. 예를 들어 XML ID `"02"`는 MDF 또는 옴니포드 ID `2`와 일치해야 하며 원시 문자열을 그대로 비교하지 않는다.
- MDF 하드포인트의 `Slots` 속성은 장착 가능한 무기 개수가 아니다. 하드포인트 용량으로 사용하지 않는다. 예를 들어 MDF `Slots="10"`이 `<WeaponSlot>` 세 개에 대응할 수 있다.
- 최대 하드포인트 용량을 기본 로드아웃에서 추론하지 않는다. 기본 장비는 현재 장착된 무기를 나타내며 섀시가 장착할 수 있는 전체 무기 수가 아니다.
- 앱의 하드포인트 개수, 피팅 제한, 컴포넌트 배지, 멕 목록 배지, 통계는 `hardpoint.weapon_slots`를 사용한다. 섀시 하드포인트 매핑에 실제로 대응 항목이 없을 때만 1을 대체값으로 사용한다.
- `Slots` 같은 원본 추출 속성을 보존하며 의미가 다른 값으로 덮어쓰지 않고 `weapon_slots`를 추가한다.
- 하드포인트 회귀 검사에서 `UM-SC`는 ballistic 2, energy 3, AMS 1이어야 한다. `UM-R60`은 ballistic 4, energy 2, `UM-R60L`은 ballistic 2, energy 4, `HBK-4G`는 ballistic 3이어야 하며 `FMT-AL` 왼팔 옴니포드는 energy 3이어야 한다.

## 변경 검증

- 추출 변경 후 일반 멕 정의와 옴니포드 정의를 모두 검증하고, Python 및 JavaScript 문법 검사와 `git diff --check`를 실행하며 생성 파일 범위를 확인한 뒤 결과를 유지한다.
- 생성 JSON을 게시할 때 기존 파일은 복구용 위치에 복사해 둔 뒤 최종 `public/data` 폴더 안의 교체용 임시 파일을 기존 대상 위에 원자적으로 교체한다. 새 파일을 설치하기 전에 기존 JSON 전체를 다른 위치로 이동해 로컬 서버가 읽을 파일이 사라지는 구간을 만들지 않는다. Windows에서는 교체 전후에 대상 폴더 ACL 상속을 활성화하고 샌드박스 전용 보호 ACL을 가진 다른 폴더의 파일을 그대로 이동하지 않으며, 사용자가 로컬 서버 검사를 요청한 경우 사용자 소유 서버가 모든 생성 JSON을 HTTP 200으로 읽는지 확인한다.
